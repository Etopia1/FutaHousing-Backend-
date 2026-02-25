import mongoose from 'mongoose';
import Wallet from '../models/Wallet';
import Transaction from '../models/Transaction';
import Booking from '../models/Booking';
import User from '../models/User';
import { generateReference } from '../utils/generateReference';
import { NotificationService } from './notification.service';
import { sendTransactionEmail } from '../utils/email';

export class EscrowService {
    static async hold(studentId: string, bookingId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const booking = await Booking.findById(bookingId).session(session);
            if (!booking) throw new Error('Booking not found');

            const studentWallet = await Wallet.findOne({ userId: studentId }).session(session);
            if (!studentWallet || studentWallet.balance < booking.amount) {
                throw new Error('Insufficient funds');
            }

            // Move to escrow
            studentWallet.balance -= booking.amount;
            studentWallet.escrowBalance += booking.amount;
            await studentWallet.save({ session });

            // Create hold transaction
            await Transaction.create([{
                userId: studentId,
                reference: generateReference('HOLD'),
                amount: booking.amount,
                type: 'escrow_hold',
                status: 'success',
                paymentMethod: 'wallet',
                metadata: { bookingId }
            }], { session, ordered: true });

            // Update booking
            booking.escrowStatus = 'held';
            booking.status = 'paid';
            await booking.save({ session });

            // Notify Agent that funds are held (Internal)
            await NotificationService.create({
                recipient: booking.agentId,
                sender: studentId,
                type: 'payment',
                title: 'Payment Received (Escrow)',
                message: `Payment for a booking has been received and is now held in escrow.`,
                link: `/dashboard?tab=bookings`
            });

            // 📧 Notify Student (Email) - Expenditure
            const student = await User.findById(studentId).session(session);
            if (student) {
                await sendTransactionEmail(student.email, student.name, {
                    type: 'escrow_hold',
                    amount: booking.amount,
                    purpose: `Rental Payment Held in Escrow for Booking #${booking._id.toString().slice(-6)}`,
                    reference: generateReference('HLD'),
                    status: 'COMPLETED',
                    timestamp: new Date()
                });
            }

            await session.commitTransaction();
            return { success: true };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async release(bookingId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const booking = await Booking.findById(bookingId).session(session);
            if (!booking) throw new Error('Booking not found');
            if (booking.escrowStatus !== 'held') throw new Error('Funds not in escrow');

            const studentWallet = await Wallet.findOne({ userId: booking.studentId }).session(session);
            if (!studentWallet) throw new Error('Student wallet not found');

            // 1. Calculate Split (10% Commission)
            const COMMISSION_RATE = 0.10;
            const commissionAmount = booking.amount * COMMISSION_RATE;
            const agentAmount = booking.amount - commissionAmount;

            // 2. Locate Super Admin for Commission Collection
            let admin = await User.findOne({ role: 'ADMIN', email: 'futahousing1@gmail.com' }).session(session);
            if (!admin) {
                // Fallback to any admin if the primary one is not found
                admin = await User.findOne({ role: 'ADMIN' }).session(session);
            }
            if (!admin) throw new Error('System Configuration Error: Commission recipient (ADMIN) not found in registry records');

            const adminWalletRaw = await Wallet.findOne({ userId: admin._id }).session(session) ||
                (await Wallet.create([{ userId: admin._id }], { session }))[0];

            // 3. Ensure Agent Wallet is Active
            let agentWallet = await Wallet.findOne({ userId: booking.agentId }).session(session);
            if (!agentWallet) {
                const created = await Wallet.create([{ userId: booking.agentId }], { session });
                agentWallet = created[0];
            }

            // 4. Atomic Balance Transfer
            studentWallet.escrowBalance -= booking.amount;
            await studentWallet.save({ session });

            agentWallet.balance += agentAmount;
            await agentWallet.save({ session });

            (adminWalletRaw as any).balance += commissionAmount;
            await (adminWalletRaw as any).save({ session });

            const reference = generateReference('REL');

            // 5. Immutable Ledger Records
            await Transaction.create([
                {
                    userId: booking.studentId,
                    reference,
                    amount: booking.amount,
                    type: 'escrow_release',
                    status: 'success',
                    paymentMethod: 'wallet',
                    metadata: { bookingId }
                },
                {
                    userId: booking.agentId,
                    reference: generateReference('PAY'),
                    amount: agentAmount,
                    type: 'agent_payout',
                    status: 'success',
                    paymentMethod: 'wallet',
                    metadata: { bookingId, originalAmount: booking.amount, commissionDeducted: commissionAmount }
                },
                {
                    userId: admin._id,
                    reference: generateReference('COM'),
                    amount: commissionAmount,
                    type: 'commission',
                    status: 'success',
                    paymentMethod: 'wallet',
                    metadata: { bookingId, agentId: booking.agentId }
                }
            ], { session, ordered: true });

            // 6. Update Registry Status
            booking.escrowStatus = 'released';
            booking.status = 'completed';
            await booking.save({ session });

            // 📧 Notify Student (Email) - Release Record
            const student = await User.findById(booking.studentId).session(session);
            if (student) {
                await sendTransactionEmail(student.email, student.name, {
                    type: 'escrow_release',
                    amount: booking.amount,
                    purpose: `Escrow Funds Released for Booking #${booking._id.toString().slice(-6)}`,
                    reference,
                    status: 'COMPLETED',
                    timestamp: new Date()
                });
            }

            // 📧 Notify Agent (Email) - Payout Record
            const agent = await User.findById(booking.agentId).session(session);
            if (agent) {
                await sendTransactionEmail(agent.email, agent.name, {
                    type: 'agent_payout',
                    amount: agentAmount,
                    purpose: `Payout for Completed Booking #${booking._id.toString().slice(-6)} (Commission Deducted)`,
                    reference: generateReference('PAY'),
                    status: 'COMPLETED',
                    timestamp: new Date()
                });
            }

            await session.commitTransaction();
            return { success: true };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    static async refund(bookingId: string) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const booking = await Booking.findById(bookingId).session(session);
            if (!booking) throw new Error('Booking not found');
            if (booking.escrowStatus !== 'held') throw new Error('No funds to refund');

            const studentWallet = await Wallet.findOne({ userId: booking.studentId }).session(session);
            if (!studentWallet) throw new Error('Student wallet not found');

            // Move back to balance
            studentWallet.escrowBalance -= booking.amount;
            studentWallet.balance += booking.amount;
            await studentWallet.save({ session });

            // Create refund transaction
            await Transaction.create([{
                userId: booking.studentId,
                reference: generateReference('REF'),
                amount: booking.amount,
                type: 'refund',
                status: 'success',
                paymentMethod: 'wallet',
                metadata: { bookingId }
            }], { session, ordered: true });

            // Update booking
            booking.escrowStatus = 'refunded';
            booking.status = 'cancelled';
            await booking.save({ session });

            // 📧 Notify Student (Email) - Refund Record
            const student = await User.findById(booking.studentId).session(session);
            if (student) {
                await sendTransactionEmail(student.email, student.name, {
                    type: 'refund',
                    amount: booking.amount,
                    purpose: `Refund for Cancelled Booking #${booking._id.toString().slice(-6)}`,
                    reference: generateReference('RFD'),
                    status: 'COMPLETED',
                    timestamp: new Date()
                });
            }

            await session.commitTransaction();
            return { success: true };
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }
}

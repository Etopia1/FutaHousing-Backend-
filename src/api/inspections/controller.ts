import { Response } from 'express';
import Inspection from '../../models/Inspection';
import Hostel from '../../models/Hostel';
import Wallet from '../../models/Wallet';
import Transaction from '../../models/Transaction';
import mongoose from 'mongoose';
import { generateReference } from '../../utils/generateReference';
import { NotificationService } from '../../services/notification.service';

export const createInspection = async (req: any, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { hostelId } = req.body;
        const studentId = req.user.userId;

        const hostel = await Hostel.findById(hostelId).session(session);
        if (!hostel) {
            await session.abortTransaction();
            return res.status(404).json({ error: 'Hostel not found' });
        }

        if (hostel.inspectionFee <= 0) {
            // If No fee, just record it
            const inspection = await Inspection.create([{
                studentId,
                hostelId,
                amount: 0,
                status: 'PAID'
            }], { session });

            await NotificationService.create({
                recipient: hostel.agentId,
                sender: studentId as any,
                type: 'inspection',
                title: 'New Inspection Request',
                message: `A student requested an inspection for "${hostel.title}".`,
                link: `/dashboard?tab=inspections`
            });

            await session.commitTransaction();
            return res.status(201).json(inspection[0]);
        }

        // Pay the fee directly to agent (following previous logic, or hold in escrow?)
        // The prompt says "Escrow holds money. Agent sees pending escrow."
        // I will implement it such that inspection fee is held in student's escrow until confirm?
        // Actually, let's stick to the previous direct payment logic for inspections to keep it simple, 
        // unless the user specifically wants inspections in escrow too. 
        // The prompt merged booking and inspection in the flow summary: "Student pays inspection fee. Escrow holds money."

        const studentWallet = await Wallet.findOne({ userId: studentId }).session(session);
        if (!studentWallet || studentWallet.balance < hostel.inspectionFee) {
            await session.abortTransaction();
            return res.status(400).json({ error: 'Insufficient funds for inspection fee' });
        }

        // Deduct from student
        studentWallet.balance -= hostel.inspectionFee;
        studentWallet.escrowBalance += hostel.inspectionFee; // Hold it
        await studentWallet.save({ session });

        // Log transaction
        await Transaction.create([{
            userId: studentId,
            reference: generateReference('INSP'),
            amount: hostel.inspectionFee,
            type: 'escrow_hold',
            status: 'success',
            paymentMethod: 'wallet',
            metadata: { hostelId, type: 'inspection' }
        }], { session, ordered: true });

        const inspection = await Inspection.create([{
            studentId,
            hostelId,
            amount: hostel.inspectionFee,
            status: 'PAID'
        }], { session });

        await NotificationService.create({
            recipient: hostel.agentId,
            sender: studentId as any,
            type: 'inspection',
            title: 'New Paid Inspection Request',
            message: `A student paid for an inspection for "${hostel.title}". Fee is held in escrow.`,
            link: `/dashboard?tab=inspections`
        });

        await session.commitTransaction();
        res.status(201).json(inspection[0]);
    } catch (err: any) {
        await session.abortTransaction();
        res.status(500).json({ error: err.message });
    } finally {
        session.endSession();
    }
};

export const getMyInspections = async (req: any, res: Response) => {
    try {
        const inspections = await Inspection.find({ studentId: req.user.userId })
            .populate('hostelId')
            .sort({ createdAt: -1 });
        res.json(inspections);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const completeInspection = async (req: any, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const inspection = await Inspection.findById(req.params.id).session(session);
        if (!inspection) throw new Error('Inspection not found');
        if (inspection.status !== 'PAID') throw new Error('Inspection already finalized');

        const hostel = await Hostel.findById(inspection.hostelId).session(session);
        if (!hostel) throw new Error('Hostel not found');

        // Only agent or admin
        if (String(hostel.agentId) !== req.user.userId && req.user.role !== 'ADMIN') {
            throw new Error('Unauthorized');
        }

        if (inspection.amount > 0) {
            const studentWallet = await Wallet.findOne({ userId: inspection.studentId }).session(session);
            let agentWallet = await Wallet.findOne({ userId: hostel.agentId }).session(session);
            if (!agentWallet) agentWallet = (await Wallet.create([{ userId: hostel.agentId }], { session }))[0];

            studentWallet!.escrowBalance -= inspection.amount;
            agentWallet!.balance += inspection.amount;
            await studentWallet!.save({ session });
            await agentWallet!.save({ session });

            await Transaction.create([
                {
                    userId: inspection.studentId,
                    reference: generateReference('INSP_REL'),
                    amount: inspection.amount,
                    type: 'escrow_release',
                    status: 'success',
                    paymentMethod: 'wallet',
                    metadata: { inspectionId: inspection._id }
                },
                {
                    userId: hostel.agentId,
                    reference: generateReference('INSP_PAY'),
                    amount: inspection.amount,
                    type: 'agent_payout',
                    status: 'success',
                    paymentMethod: 'wallet',
                    metadata: { inspectionId: inspection._id }
                }
            ], { session });
        }

        inspection.status = 'COMPLETED';
        await inspection.save({ session });

        await NotificationService.create({
            recipient: inspection.studentId,
            type: 'inspection',
            title: 'Inspection Completed',
            message: `The agent marked your inspection for "${hostel.title}" as completed.`,
            link: `/dashboard?tab=inspections`
        });

        await session.commitTransaction();
        res.json({ message: 'Inspection completed and funds released' });
    } catch (err: any) {
        await session.abortTransaction();
        res.status(400).json({ error: err.message });
    } finally {
        session.endSession();
    }
};

export const cancelInspection = async (req: any, res: Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const inspection = await Inspection.findById(req.params.id).session(session);
        if (!inspection) throw new Error('Inspection not found');
        if (inspection.status !== 'PAID') throw new Error('Inspection cannot be cancelled');

        const hostel = await Hostel.findById(inspection.hostelId);

        // Only student or admin
        if (String(inspection.studentId) !== req.user.userId && req.user.role !== 'ADMIN') {
            throw new Error('Unauthorized');
        }

        if (inspection.amount > 0) {
            const studentWallet = await Wallet.findOne({ userId: inspection.studentId }).session(session);
            studentWallet!.escrowBalance -= inspection.amount;
            studentWallet!.balance += inspection.amount;
            await studentWallet!.save({ session });

            await Transaction.create([{
                userId: inspection.studentId,
                reference: generateReference('INSP_REF'),
                amount: inspection.amount,
                type: 'refund',
                status: 'success',
                paymentMethod: 'wallet',
                metadata: { inspectionId: inspection._id }
            }], { session });
        }

        inspection.status = 'CANCELLED';
        await inspection.save({ session });

        // Notify Agent
        if (hostel) {
            await NotificationService.create({
                recipient: hostel.agentId,
                sender: inspection.studentId as any,
                type: 'inspection',
                title: 'Inspection Cancelled',
                message: `The student cancelled their inspection for "${hostel.title}".`,
                link: `/dashboard?tab=inspections`
            });
        }

        await session.commitTransaction();
        res.json({ message: 'Inspection cancelled and funds refunded' });
    } catch (err: any) {
        await session.abortTransaction();
        res.status(400).json({ error: err.message });
    } finally {
        session.endSession();
    }
};

export const getAgentInspections = async (req: any, res: Response) => {
    try {
        const hostels = await Hostel.find({ agentId: req.user.userId }).select('_id');
        const hostelIds = hostels.map(h => h._id);

        const inspections = await Inspection.find({ hostelId: { $in: hostelIds } })
            .populate('hostelId')
            .populate('studentId', 'name email phone')
            .sort({ createdAt: -1 });

        res.json(inspections);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

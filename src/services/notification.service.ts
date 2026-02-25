import Notification from '../models/Notification';
import { sendNotification } from '../lib/socket';
import mongoose from 'mongoose';

export class NotificationService {
    static async create(data: {
        recipient: string | mongoose.Types.ObjectId;
        sender?: string | mongoose.Types.ObjectId;
        type: 'booking' | 'payment' | 'system' | 'message' | 'inspection';
        title: string;
        message: string;
        link?: string;
    }) {
        try {
            const notification = await Notification.create({
                ...data,
                read: false
            });

            // Send real-time socket notification
            sendNotification(data.recipient.toString(), notification);

            return notification;
        } catch (error) {
            console.error('Error creating notification:', error);
            // Don't throw, let the main process continue even if notification fails
        }
    }
}

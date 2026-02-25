import { Request, Response } from 'express';
import Notification from '../../models/Notification';

export const getMyNotifications = async (req: any, res: Response) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const markAsRead = async (req: any, res: Response) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, read: false },
            { $set: { read: true } }
        );
        res.json({ message: 'Notifications marked as read' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteNotification = async (req: any, res: Response) => {
    try {
        await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user.id });
        res.json({ message: 'Notification deleted' });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
};

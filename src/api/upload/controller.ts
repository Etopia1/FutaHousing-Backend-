
import { Request, Response } from 'express';

// Upload Single File
export const uploadFile = (req: any, res: Response) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const fileUrl = req.file.path;
    res.json({ message: 'File uploaded to Cloudinary successfully', url: fileUrl });
};

import { Response } from 'express';
import Hostel from '../../models/Hostel';

// List all Hostels
export const listHostels = async (req: any, res: Response) => {
    try {
        const hostels = await Hostel.find().populate('agentId', 'name email phone').lean();
        res.json(hostels);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch hostels' });
    }
};

// Get single Hostel
export const getHostel = async (req: any, res: Response) => {
    try {
        const hostel = await Hostel.findById(req.params.id).populate('agentId', 'name email phone').lean();
        if (!hostel) return res.status(404).json({ error: 'Hostel not found' });
        res.json(hostel);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch hostel' });
    }
};

// Create Hostel (Agent only)
export const createHostel = async (req: any, res: Response) => {
    try {
        const {
            title, location, description, price, rent, cautionFee, agentFee, totalPackage,
            category, propertyType, inspectionFee, images, videos, amenities, rules,
            longitude, latitude, damages
        } = req.body;

        // Use totalPackage for price if provided, else use price
        const finalTotal = totalPackage || price || 0;

        const hostel = await Hostel.create({
            title, location, description,
            price: finalTotal,
            rent: rent || 0,
            cautionFee: cautionFee || 0,
            agentFee: agentFee || 0,
            totalPackage: finalTotal,
            category, propertyType, inspectionFee,
            images: images || [],
            videos: videos || [],
            amenities: amenities || [],
            rules: rules || [],
            longitude,
            latitude,
            damages: damages || [],
            agentId: req.user.userId,
            status: 'Available'
        });
        res.status(201).json(hostel);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to create hostel' });
    }
};

// Update Hostel
export const updateHostel = async (req: any, res: Response) => {
    try {
        const hostel = await Hostel.findOneAndUpdate(
            { _id: req.params.id, agentId: req.user.userId },
            req.body,
            { new: true }
        );
        if (!hostel) return res.status(404).json({ error: 'Hostel not found or unauthorized' });
        res.json(hostel);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to update hostel' });
    }
};

// Delete Hostel
export const deleteHostel = async (req: any, res: Response) => {
    try {
        const hostel = await Hostel.findOneAndDelete({ _id: req.params.id, agentId: req.user.userId });
        if (!hostel) return res.status(404).json({ error: 'Hostel not found or unauthorized' });
        res.json({ message: 'Hostel deleted' });
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to delete hostel' });
    }
};

// ─── Get Agent's Own Hostels ──────────────────────────────────────────────────
export const getMyHostels = async (req: any, res: Response) => {
    try {
        const hostels = await Hostel.find({ agentId: req.user.userId }).lean();
        res.json(hostels);
    } catch (err: any) {
        console.error(err.message);
        res.status(500).json({ error: 'Failed to fetch your hostels' });
    }
};

import mongoose, { Schema, Document } from 'mongoose';

export interface IHostel extends Document {
    title: string;
    location: string;
    description: string;
    price: number; // For backward compatibility, will store totalPackage
    rent: number;
    cautionFee: number;
    agentFee: number;
    totalPackage: number;
    category: 'Hostel' | 'House' | 'Apartment';
    propertyType: string;
    preferredTenants: string[];
    inspectionFee: number;
    images: { url: string; description?: string }[];
    videos: { url: string; description?: string }[];
    amenities: string[];
    rules: string[];
    longitude?: number;
    latitude?: number;
    damages: {
        description: string;
        media: { url: string; type: 'image' | 'video' }[];
        reportedAt: Date;
        repairedAt?: Date;
        status: 'Broken' | 'Pending' | 'Repaired';
        fineAmount: number;
    }[];
    agentId: mongoose.Types.ObjectId;
    status: 'Available' | 'Rented' | 'Sold';
    createdAt: Date;
    updatedAt: Date;
}

const HostelSchema = new Schema<IHostel>(
    {
        title: { type: String, required: true, trim: true },
        location: { type: String, required: true },
        description: { type: String, required: true },
        price: { type: Number, required: true },
        rent: { type: Number, required: true, default: 0 },
        cautionFee: { type: Number, default: 0 },
        agentFee: { type: Number, default: 0 },
        totalPackage: { type: Number, required: true, default: 0 },
        category: { type: String, enum: ['Hostel', 'House', 'Apartment'], default: 'Hostel' },
        propertyType: {
            type: String,
            default: 'Self-Contained'
        },
        preferredTenants: [{
            type: String,
            default: 'Anyone'
        }],
        inspectionFee: { type: Number, default: 0 },
        images: [{
            url: { type: String, required: true },
            description: { type: String }
        }],
        videos: [{
            url: { type: String, required: true },
            description: { type: String }
        }],
        amenities: [{ type: String }],
        rules: [{ type: String }],
        longitude: { type: Number },
        latitude: { type: Number },
        damages: [{
            description: { type: String, required: true },
            media: [{
                url: { type: String, required: true },
                type: { type: String, enum: ['image', 'video'], default: 'image' }
            }],
            reportedAt: { type: Date, default: Date.now },
            repairedAt: { type: Date },
            status: { type: String, enum: ['Broken', 'Pending', 'Repaired'], default: 'Broken' },
            fineAmount: { type: Number, default: 0 }
        }],
        status: { type: String, enum: ['Available', 'Rented', 'Sold'], default: 'Available' },
        agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

export default mongoose.model<IHostel>('Hostel', HostelSchema);

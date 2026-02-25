import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import Hostel from '../models/Hostel';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const dummyHostels = [
    {
        title: "Summit Court Apartments",
        location: "South Gate Area, FUTA",
        description: "Premium self-contained apartments with 24/7 water supply, paved compound, and high security. Perfect for students who value privacy and comfort.",
        price: 280000,
        category: 'Apartment',
        propertyType: 'Self-Contained',
        inspectionFee: 2000,
        images: [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?q=80&w=2070&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?q=80&w=1980&auto=format&fit=crop"
        ],
        amenities: ["WiFi", "Stable Power", "Water", "Security Guard", "Parking"],
        rules: ["No loud music after 10PM", "No pets", "No smoking"],
        status: 'Available'
    },
    {
        title: "The Heritage Hostel",
        location: "North Gate, Akindeko",
        description: "Spacious ensuite rooms with modern fittings. Located just 5 minutes walk from the university gate. Includes a shared lounge and study area.",
        price: 150000,
        category: 'Hostel',
        propertyType: 'Ensuite Room',
        inspectionFee: 1000,
        images: [
            "https://images.unsplash.com/photo-1555854817-5b2247a8175f?q=80&w=2070&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?q=80&w=2070&auto=format&fit=crop"
        ],
        amenities: ["Water", "Security Gate", "Study Desk", "Closet"],
        rules: ["Only registered students allowed", "Keep surroundings clean"],
        status: 'Available'
    },
    {
        title: "Vantage Point Villa",
        location: "Ilesha Road Hub",
        description: "Luxury 2-bedroom flat suitable for final year students or staff. Very quiet environment with scenic views and massive balcony space.",
        price: 450000,
        category: 'House',
        propertyType: '2 Bedroom Flat',
        inspectionFee: 3000,
        images: [
            "https://images.unsplash.com/photo-1484154218962-a197022b5858?q=80&w=2074&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1493809842364-78817add7ffb?q=80&w=2070&auto=format&fit=crop"
        ],
        amenities: ["Dedicated Transformer", "Gated Estate", "Balcony", "Water Heater", "In-built Wardrobes"],
        rules: ["Sub-letting is strictly prohibited", "Corporate tenants preferred"],
        status: 'Available'
    },
    {
        title: "Sapphire Suites",
        location: "Obakekere Layout",
        description: "Modern studios with premium finishing. Each unit comes with a kitchen cabinet and tiled floors. Very close to the main road.",
        price: 220000,
        category: 'Apartment',
        propertyType: 'Studio Apartment',
        inspectionFee: 1500,
        images: [
            "https://images.unsplash.com/photo-1536376074432-ef26466b7188?q=80&w=2070&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1460317442991-0ec209397118?q=80&w=2070&auto=format&fit=crop"
        ],
        amenities: ["Tiled Floor", "Kitchen Cabinets", "Security", "Borehole"],
        rules: ["Max 2 persons per unit", "No religious gatherings"],
        status: 'Available'
    },
    {
        title: "Majestic Heights",
        location: "Apatite, FUTA",
        description: "Brand new development featuring state-of-the-art facilities. High-speed internet included in the rent for the first session.",
        price: 320000,
        category: 'Apartment',
        propertyType: 'Self-Contained Executive',
        inspectionFee: 2000,
        images: [
            "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2070&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1515263487990-61b07816b324?q=80&w=2070&auto=format&fit=crop"
        ],
        amenities: ["Fiber Optic Internet", "Solar Power System", "AC Hookups", "Laundry Area"],
        rules: ["Pets allowed (conditions apply)", "Parking for one car only"],
        status: 'Available'
    }
];

async function seed() {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log("Connected!");

        const agentEmail = "adedotunodunade1@gmail.com";
        const agent = await User.findOne({ email: agentEmail });

        if (!agent) {
            console.error(`AGENT NOT FOUND: ${agentEmail}. Please ensure the user exists and is an AGENT.`);
            process.exit(1);
        }

        if (agent.role !== 'AGENT') {
            console.warn(`USER FOUND BUT ROLE IS ${agent.role}. Changing to AGENT for compatibility...`);
            agent.role = 'AGENT';
            await agent.save();
        }

        console.log(`Clearing old hostels for agent: ${agent.name}...`);
        await Hostel.deleteMany({ agentId: agent._id });

        console.log(`Inserting ${dummyHostels.length} new dummy hostels...`);
        const hostelsToInsert = dummyHostels.map(h => ({
            ...h,
            agentId: agent._id
        }));

        await Hostel.insertMany(hostelsToInsert);

        console.log("✅ SEEDING COMPLETE!");
        console.log(`Assigned 5 high-quality properties to ${agent.name} (${agentEmail})`);

        process.exit(0);
    } catch (error) {
        console.error("SEEDING FAILED:", error);
        process.exit(1);
    }
}

seed();

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Assuming standard path relative to where this script runs or absolute
dotenv.config();

const UserSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String,
    verificationStatus: String,
    profilePicture: String,
    ninImage: String,
    nin: String,
    address: String
}, { strict: false });

const User = mongoose.model('User', UserSchema);

async function dumpAgents() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/futa-housing');
        console.log('--- AGENT DATA DUMP ---');
        const agents = await User.find({ role: 'AGENT' });

        if (agents.length === 0) {
            console.log('No agents found in database.');
        } else {
            agents.forEach(a => {
                console.log(`\nAgent: ${a.name} (${a.email})`);
                console.log(`- Status: ${a.verificationStatus}`);
                console.log(`- Profile Picture: ${a.profilePicture ? 'EXISTS: ' + a.profilePicture : 'MISSING'}`);
                console.log(`- NIN Image: ${a.ninImage ? 'EXISTS: ' + a.ninImage : 'MISSING'}`);
                console.log(`- Registered NIN: ${a.nin || 'NONE'}`);
                console.log(`- Address: ${a.address || 'NONE'}`);
            });
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.connection.close();
    }
}

dumpAgents();

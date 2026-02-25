const mongoose = require('mongoose');
require('dotenv').config();

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

const User = mongoose.model('User', UserSchema, 'users');

async function dumpAgents() {
    try {
        const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/futa-housing';
        await mongoose.connect(uri);
        console.log('--- AGENT DATA DUMP WITH IDS ---');
        const agents = await User.find({ role: 'AGENT' });

        for (const a of agents) {
            console.log(`\nAgent: ${a.name} (${a.email}) [ID: ${a._id}]`);
            console.log(`- Status: ${a.verificationStatus}`);
            console.log(`- Profile Picture: ${a.profilePicture ? 'EXISTS: ' + a.profilePicture : 'MISSING'}`);
            console.log(`- NIN Image: ${a.ninImage ? 'EXISTS: ' + a.ninImage : 'MISSING'}`);

            // Also check if any VerificationDocuments exist for this ID
            const docs = await mongoose.connection.db.collection('verificationdocuments').find({ userId: a._id }).toArray();
            console.log(`- Formal Documents in DB: ${docs.length}`);
            docs.forEach(d => console.log(`  * Type: ${d.type}, Status: ${d.status}, URL: ${d.fileUrl}`));
        }
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await mongoose.connection.close();
    }
}

dumpAgents();

const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const logoPath = path.join(__dirname, '..', 'frontend', '7778b5de2dff424669d4dfab2e7085c8-removebg-preview.png');

async function run() {
    try {
        if (!fs.existsSync(logoPath)) {
            throw new Error('File not found at ' + logoPath);
        }
        const result = await cloudinary.uploader.upload(logoPath, {
            public_id: 'official-logo-transparent',
            folder: 'futa-housing-static',
            overwrite: true
        });
        console.log('URL:', result.secure_url);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

run();

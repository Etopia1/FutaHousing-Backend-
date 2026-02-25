const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const logoPath = path.join(__dirname, '..', 'frontend', 'public', 'logo.png');
console.log('Path:', logoPath);
console.log('Exists:', fs.existsSync(logoPath));

async function run() {
    try {
        const result = await cloudinary.uploader.upload(logoPath, {
            public_id: 'logo',
            folder: 'futa-housing-static',
            overwrite: true
        });
        console.log('URL:', result.secure_url);
    } catch (err) {
        console.error('Error:', err);
    }
}

run();

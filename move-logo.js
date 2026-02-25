const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'frontend', '7778b5de2dff424669d4dfab2e7085c8-removebg-preview.png');
const dest = path.join(__dirname, '..', 'frontend', 'public', 'logo.png');

try {
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('✅ Logo moved to public/logo.png successfully');
    } else {
        console.error('❌ Source logo not found at:', src);
    }
} catch (err) {
    console.error('❌ Error moving logo:', err);
}

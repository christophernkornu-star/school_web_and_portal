const fs = require('fs');
const path = require('path');

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            scanDir(fullPath);
        } else {
            if (file.toLowerCase().includes('skeleton')) {
                console.log('Found Skeleton-like file:', fullPath);
            }
            if (file.toLowerCase().includes('backbutton')) {
                console.log('Found BackButton-like file:', fullPath);
            }
        }
    });
}

console.log('Scanning for casing issues...');
scanDir(path.resolve(__dirname, '../components'));

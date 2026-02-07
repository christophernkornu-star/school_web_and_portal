const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walk(filepath, callback);
        } else if (stats.isFile() && (file.endsWith('.tsx') || file.endsWith('.ts'))) {
            callback(filepath);
        }
    });
}

function fixImports() {
    const rootDir = path.resolve(__dirname, '../app');
    console.log(`Scanning ${rootDir}...`);
    walk(rootDir, (filepath) => {
        let content = fs.readFileSync(filepath, 'utf8');
        let original = content;
        
        // Fix BackButton import
        content = content.replace(/from ['"]@\/components\/ui\/BackButton['"]/g, "from '@/components/ui/back-button'");
        
        if (content !== original) {
            fs.writeFileSync(filepath, content);
            console.log(`Updated: ${filepath}`);
        }
    });
}

fixImports();

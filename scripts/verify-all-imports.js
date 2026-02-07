const fs = require('fs');
const path = require('path');

const rootDir = __dirname; // scripts folder
const projectRoot = path.join(rootDir, '..');

function getActualFilename(dir, filename) {
    try {
        const files = fs.readdirSync(dir);
        return files.find(f => f.toLowerCase() === filename.toLowerCase());
    } catch (e) {
        return null;
    }
}

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const importRegex = /from ['"]@\/([^'"]+)['"]/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1]; // e.g., components/ui/back-button
        
        // Construct full path to the imported file's DIRECTORY
        const parts = importPath.split('/');
        let currentDir = projectRoot;
        
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const actualName = getActualFilename(currentDir, part); // Find actual name in FS
            
            if (!actualName) {
                // If it's the last part, might be .tsx or .ts or index.ts
                if (i === parts.length - 1) {
                    const actualWithExt = getActualFilename(currentDir, part + '.tsx') || 
                                          getActualFilename(currentDir, part + '.ts') ||
                                          getActualFilename(currentDir, part + '.js');
                    if (actualWithExt) {
                         // Check strictly if the base name matches case
                         // import: "back-button", actual: "back-button.tsx" -> OK
                         // import: "Back-Button", actual: "back-button.tsx" -> FAIL
                         if (part !== actualWithExt.split('.')[0] && part !== actualWithExt) {
                             console.error(`[CASE MISMATCH] File: ${path.relative(projectRoot, filePath)}`);
                             console.error(`  Imported: ${part}`);
                             console.error(`  Actual:   ${actualWithExt}`);
                         }
                         continue;
                    }
                }
                // Check for index file in directory
                 const actualDir = getActualFilename(currentDir, part);
                 if (actualDir && fs.statSync(path.join(currentDir, actualDir)).isDirectory()) {
                     // The part is a directory. If casing doesn't match, that's an issue too.
                     if (part !== actualDir) {
                         console.error(`[CASE MISMATCH] File: ${path.relative(projectRoot, filePath)}`);
                         console.error(`  Imported Directory: ${part}`);
                         console.error(`  Actual Directory:   ${actualDir}`);
                     }
                     currentDir = path.join(currentDir, actualDir);
                     continue;
                 }

                // Could be valid node_module or relative path not handled by this simple logic (but looking for @/)
                // console.log(`Warning: Could not resolve ${importPath} in ${filePath}`);
                break;
            } else {
                // It is a directory or file in the middle of path
                if (part !== actualName) {
                    console.error(`[CASE MISMATCH] File: ${path.relative(projectRoot, filePath)}`);
                    console.error(`  Imported Path Part: ${part}`);
                    console.error(`  Actual FS Name:     ${actualName}`);
                }
                currentDir = path.join(currentDir, actualName);
            }
        }
    }
}

function scanDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                scanDir(fullPath);
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            checkFile(fullPath);
        }
    });
}

console.log('Scanning for all import case mismatches...');
scanDir(path.join(projectRoot, 'app'));
scanDir(path.join(projectRoot, 'components'));
scanDir(path.join(projectRoot, 'lib'));

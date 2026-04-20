const fs = require('fs');

const fixYellowToGold = (filePath) => {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = content.replace(/methodist-yellow/g, 'methodist-gold');
        if (content !== updated) {
            fs.writeFileSync(filePath, updated);
            console.log(`Replaced in ${filePath}`);
        }
    } catch(e) {}
}

fixYellowToGold('app/teacher/dashboard/page.tsx');
// Might as well fix other places where I introduced it recently
fixYellowToGold('app/student/dashboard/page.tsx');
fixYellowToGold('app/teacher/announcements/page.tsx');
fixYellowToGold('app/student/results/page.tsx');
fixYellowToGold('app/login/page.tsx');

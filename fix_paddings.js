const fs = require('fs');
const filepath = 'app/admin/dashboard/page.tsx';
let t = fs.readFileSync(filepath, 'utf8');

// 1. Fix "Quick Actions" and "Upcoming Events" padding
t = t.replace(/text-white pb-4/g, 'text-white px-5 py-4'); // Make them p-4 equivalent instead of deep pb-4

// 2. Fix "Recent Activity" padding
// Old was `pb-4 pt-5` wrapper
t = t.replace('justify-between pb-4 pt-5 bg-gradient', 'justify-between px-5 py-4 bg-gradient');

// 3. Fix missing CardContent spacing
t = t.replace(/<\/CardHeader>\s*<CardContent>/g, '</CardHeader>\n                <CardContent className="p-5">');

// 4. Fix specific space-y-4 pt-5 
t = t.replace(/<CardContent className="space-y-4 pt-5">/g, '<CardContent className="p-5 space-y-4">');

fs.writeFileSync(filepath, t);
console.log("Successfully fixed spacing for all Methodist blue admin headers!");
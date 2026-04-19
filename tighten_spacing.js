const fs = require('fs');
let code = fs.readFileSync('app/teacher/mock/page.tsx', 'utf8');

// 1. Tweak spacing around table cells to fit more per page. The new typography fits better when the py is scaled back.
code = code.replace(/py-1\.5/g, 'py-1');
code = code.replace(/mb-4 border-b-\[3px\] border-slate-800 pb-3/g, 'mb-2 border-b-[2px] border-slate-800 pb-1.5');
code = code.replace(/mt-4 pt-3/g, 'mt-2 pt-2');

// 2. Increase maximum students per page
code = code.replace(/const STUDENTS_PER_PAGE = 14;/g, 'const STUDENTS_PER_PAGE = 22;');

// 3. Optimize container height bounds from 185 to 195mm (since landscape is 210mm tall, 195mm leaves ~15mm total margin clearance).
code = code.replace(/print:h-\[185mm\]/g, 'print:h-[195mm]');

fs.writeFileSync('app/teacher/mock/page.tsx', code);
console.log('Done optimizing layout sizes')
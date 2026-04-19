const fs = require('fs');
let code = fs.readFileSync('app/teacher/mock/page.tsx', 'utf8');

// 1. Tweak padding down more to squeeze higher count into absolute bounds.
code = code.replace(/px-1\.5 py-1/g, 'px-1.5 py-0.5'); // Snug tables up and down
code = code.replace(/px-2 py-1/g, 'px-2 py-0.5');
code = code.replace(/px-1 py-1 text-center/g, 'px-1 py-0.5 text-center');

// 2. Adjust dynamic heights for higher row count
code = code.replace(/const FIRST_PAGE_COUNT = 20;/g, 'const FIRST_PAGE_COUNT = 22;');
code = code.replace(/const OTHER_PAGE_COUNT = 24;/g, 'const OTHER_PAGE_COUNT = 26;');

// Optimize header further
code = code.replace(/mb-2 border-b-\[2px\] border-slate-800 pb-1\.5/g, 'mb-1.5 border-b-[2px] border-slate-800 pb-1');

// Write out
fs.writeFileSync('app/teacher/mock/page.tsx', code);
console.log('Done optimizing layout sizes and expanding rows');

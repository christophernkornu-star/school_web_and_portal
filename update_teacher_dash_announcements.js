const fs = require('fs');

let fileStr = 'app/teacher/dashboard/page.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

// Title 
content = content.replace(
  /className="text-sm font-medium mb-1 leading-snug break-words"/g,
  'className="text-[15px] font-bold text-methodist-blue mb-1.5 leading-snug break-words tracking-tight"'
);

// Content
content = content.replace(
  /className="text-xs text-gray-500 line-clamp-2"/g,
  'className="text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium line-clamp-3 whitespace-pre-line"'
);

// Date
content = content.replace(
  /className="text-\[10px\] text-gray-400"/g,
  'className="text-[11px] font-semibold text-methodist-yellow bg-methodist-blue/5 px-2 py-0.5 rounded-md"'
);

fs.writeFileSync(fileStr, content);
console.log('Updated app/teacher/dashboard/page.tsx announcements');

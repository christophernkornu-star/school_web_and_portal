const fs = require('fs');

let fileStr = 'app/teacher/announcements/page.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

// Title 
content = content.replace(
  /className="text-xl mt-2 leading-tight"/g,
  'className="text-2xl font-black text-methodist-blue mt-3 tracking-tight"'
);

// Content
content = content.replace(
  /className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 whitespace-pre-wrap"/g,
  'className="prose dark:prose-invert max-w-none text-[16px] md:text-[17px] text-slate-700 dark:text-slate-300 leading-loose font-medium whitespace-pre-wrap tracking-wide"'
);

// Cards
content = content.replace(
  /className="overflow-hidden hover:shadow-md transition-shadow">/g,
  'className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl shadow-xl shadow-gray-200/40 p-2 md:p-4 border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 mb-6">'
);

// Date styling
content = content.replace(
  /className="text-sm text-gray-500"/g,
  'className="text-sm font-bold text-methodist-yellow bg-methodist-blue/5 px-3 py-1 rounded-full"'
);

fs.writeFileSync(fileStr, content);
console.log('Updated app/teacher/announcements/page.tsx announcements text formatting');

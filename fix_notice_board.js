const fs = require('fs');
let fileStr = 'app/teacher/dashboard/page.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

content = content.replace(
  /<Card className="h-full border border-white\/40 shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\] bg-white\/60 backdrop-blur-xl rounded-3xl max-h-\[500px\] flex flex-col">/g,
  '<Card className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden flex flex-col">'
);

content = content.replace(
  /<CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-700 shrink-0">/g,
  '<CardHeader className="pb-3 shrink-0 bg-gradient-to-r from-methodist-blue to-blue-800 text-white">'
);

content = content.replace(
  /<Bell className="w-4 h-4 text-orange-500" \/>/g,
  '<Bell className="w-4 h-4 text-methodist-yellow" />'
);

content = content.replace(
  /<Link href="\/teacher\/announcements" className="text-xs text-methodist-blue hover:underline">/g,
  '<Link href="/teacher/announcements" className="text-sm font-semibold text-methodist-yellow hover:text-yellow-300 transition-colors">'
);

content = content.replace(
  /<CardContent className="pt-4 overflow-y-auto flex-1">/g,
  '<CardContent className="pt-4 flex-1">'
);

fs.writeFileSync(fileStr, content);
console.log('Fixed Notice Board');

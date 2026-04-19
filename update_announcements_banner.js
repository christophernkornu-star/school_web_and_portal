const fs = require('fs');

let fileStr = 'components/AnnouncementsBanner.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

// Title 
content = content.replace(
  /className="font-semibold"/g,
  'className="font-bold text-[15px] tracking-wide"'
);

// Content
content = content.replace(
  /className="text-sm opacity-90 truncate max-w-xl md:max-w-2xl"/g,
  'className="text-[14px] leading-relaxed opacity-95 truncate max-w-xl md:max-w-3xl font-medium tracking-wide whitespace-pre-wrap"'
);

fs.writeFileSync(fileStr, content);
console.log('Updated components/AnnouncementsBanner.tsx text formatting');

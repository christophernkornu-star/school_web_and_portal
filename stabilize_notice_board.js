const fs = require('fs');
let fileStr = 'app/teacher/dashboard/page.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

// 1. Remove the fixed height on the Card
content = content.replace(
    /className="border border-white\/40 shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\] bg-white\/60 backdrop-blur-xl rounded-3xl overflow-hidden flex flex-col h-\[500px\] lg:h-\[600px\]"/g,
    'className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden"'
);

// 2. Remove the style tags
content = content.replace(
    /\s*<style dangerouslySetInnerHTML=\{\{__html: `[^`]*`\}\}\s*\/>/g,
    ''
);

// 3. Clean up the CardContent
content = content.replace(
    /<CardContent className="pt-4 flex-1 overflow-hidden relative">/g,
    '<CardContent className="pt-4">'
);

// 4. Remove the wrapper divs for the marquee
content = content.replace(
    /<div className="h-full w-full relative overflow-hidden mask-image-vertical px-2 py-2">\s*<div className="animate-notice-marquee space-y-4 pt-\[350px\] pb-4">/g,
    '<div className="space-y-4 px-2">'
);

// 5. Remove the closing wrapper divs at the end of the map
content = content.replace(
    /<\/div>\s*\}\)\)\}\s*<\/div><\/div>/g,
    '</div>\n                          ))}\n                      </div>'
);

fs.writeFileSync(fileStr, content);
console.log('Notice Board stabilized and made dynamic.');
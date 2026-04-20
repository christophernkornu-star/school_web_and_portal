const fs = require('fs');

let fileStr = 'app/teacher/dashboard/page.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

// 1. Notice Board tweak
const noticeRegex = /<CardContent className="pt-4 flex-1">\s*\{announcementsLoading/g;
if (noticeRegex.test(content)) {
  content = content.replace(
      noticeRegex,
      `<style dangerouslySetInnerHTML={{__html: \`
                   @keyframes notice-marquee {
                     0% { transform: translateY(100%); }
                     100% { transform: translateY(-100%); }
                   }
                   .animate-notice-marquee {
                     animation: notice-marquee 20s linear infinite;
                   }
                   .animate-notice-marquee:hover {
                     animation-play-state: paused;
                   }
                 \`}} />
                 <CardContent className="pt-4 flex-1 overflow-hidden relative">
                   {announcementsLoading`
  );
  
  // Now wrap the actual announcements mapper in the marquee div
  const mapRegex = /<div className="space-y-4">\s*\{announcements\.map/g;
  content = content.replace(
      mapRegex,
      `<div className="absolute inset-x-6 top-0 bottom-0 overflow-hidden mask-image-vertical px-2"><div className="animate-notice-marquee space-y-4 pt-[350px] pb-4">
                            {announcements.map`
  );
  
  // Close the extra two divs after the map block
  // The map block ends with `</div>` (the item), and then there's a `)` closing the map.
  const mapEndRegex = /\s*<\/div>\s*\)\)\}\s*<\/div>\s*\)\}\s*<\/CardContent>/g;
  if(mapEndRegex.test(content)) {
      content = content.replace(
          mapEndRegex,
          `\n                          </div>
                        ))}
                        </div></div>
                     )}
                 </CardContent>`
      );
  }
  
  // Also fix mask-image-vertical globally if not placed yet
  content = content.replace(
      /<style dangerouslySetInnerHTML/g,
      `<style dangerouslySetInnerHTML={{__html: \`
                   .mask-image-vertical {
                     -webkit-mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
                     mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
                   }
      \`}} />
                 <style dangerouslySetInnerHTML`
  );
  
} else {
    console.log("Could not find Notice Board starting tag");
}


// 2. Performance Overview colored header
// Wait, let's wrap Performance Overview header too
const perfHeaderRegex = /<CardHeader className="pb-2">\s*<CardTitle className="text-lg font-bold text-gray-800 dark:text-gray-100">\s*Performance Overview/g;
if (perfHeaderRegex.test(content)) {
    content = content.replace(
        perfHeaderRegex,
        `<CardHeader className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white pb-3 rounded-t-3xl">\s*<CardTitle className="text-lg font-bold flex items-center gap-2"><span className="w-1.5 h-5 bg-methodist-gold rounded-full"></span>Performance Overview`
    );
}

// 3. Quick Actions wrapping
// Find the start of Quick Actions Grid
// `<div>\n            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 \nmb-5 flex items-center gap-2">\n              <LayoutDashboard className="w-5 h-5 text-methodist-blue" />\n              Quick Actions\n            </h2>\n            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">`
let qaStartRegex = /<div>\s*<h2 className="text-[^>]+>\s*<LayoutDashboard className="w-5 h-5 text-methodist-blue" \/>\s*Quick Actions\s*<\/h2>\s*<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">/g;
if (qaStartRegex.test(content)) {
    content = content.replace(
        qaStartRegex,
        `<Card className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white pb-4">
              <CardTitle className="text-xl font-bold flex items-center xl:gap-2"><span className="w-1.5 h-6 bg-methodist-gold rounded-full"></span>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">`
    );
    
    // and close it right before `{/* Main Content Grid */}`
    let qaEndRegex = /<\/div>\s*<\/div>\s*\{\/\* Main Content Grid \*\/\}/g;
    if (qaEndRegex.test(content)) {
        content = content.replace(
            qaEndRegex,
            `  </div>
            </CardContent>
          </Card>
          
          {/* Main Content Grid */}`
        );
    } else {
        console.log("Could not find end of Quick Actions");
    }
} else {
    console.log("Could not find start of Quick Actions");
}


// Fix Teacher classes modal button styling if applicable, but shouldn't break anything.
fs.writeFileSync(fileStr, content);
console.log("Re-applied notice board tweak and colored headers on Teacher portal.");
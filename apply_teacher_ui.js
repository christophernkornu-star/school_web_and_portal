const fs = require('fs');

// 1. Update Notice Board + Profile Summary lengths in Teacher Dashboard
let dashboardFile = 'app/teacher/dashboard/page.tsx';
let dContent = fs.readFileSync(dashboardFile, 'utf8');

// Notice Board min-height
dContent = dContent.replace(
    /\{\/\* Notices \/ Announcements \*\/\}\s*<Card className="border border-white\/40 shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\] bg-white\/60 backdrop-blur-xl rounded-3xl overflow-hidden flex flex-col">/,
    `{/* Notices / Announcements */}
              <Card className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden flex flex-col min-h-[450px]">`
);

// Profile Summary CardHeader
dContent = dContent.replace(
    /\{\/\* Profile Summary \*\/\}\s*<Card className="border border-white\/40 shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\] bg-white\/60 backdrop-blur-xl rounded-3xl">\s*<CardContent className="p-6">/,
    `{/* Profile Summary */}
               <Card className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden">
                 <CardHeader className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white pb-4">
                    <CardTitle className="text-lg font-bold flex items-center xl:gap-2"><span className="w-1.5 h-5 bg-methodist-gold rounded-full"></span>Teacher Profile</CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 pt-5">`
);

fs.writeFileSync(dashboardFile, dContent);
console.log('Teacher Dashboard updated!');

// 2. Update PerformanceChart to have coloured header
let chartFile = 'components/PerformanceChart.tsx';
let cContent = fs.readFileSync(chartFile, 'utf8');

cContent = cContent.replace(
    /if \(\!data \|\| data\.length < 2\) \{\s*return \(\s*<div className=\{`bg-white rounded-lg border border-gray-200 p-6 \$\{className\}`\}>\s*<h3 className="text-lg font-semibold text-gray-800 mb-4">\{title\}<\/h3>/,
    `if (!data || data.length < 2) {
    return (
      <div className={\`bg-white rounded-lg border border-gray-200 \${className}\`}>
        <div className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white px-5 py-4">
          <h3 className="text-xl font-bold flex items-center gap-2"><span className="w-1.5 h-6 bg-methodist-gold rounded-full"></span>{title}</h3>
        </div>`
);

// Second block
cContent = cContent.replace(
    /return \(\s*<div className=\{`bg-white rounded-lg border border-gray-200 p-6 \$\{className\}`\}>\s*<h3 className="text-lg font-semibold text-gray-800 mb-4">\{title\}<\/h3>\s*<ResponsiveContainer width="100%" height=\{300\}>/,
    `return (
    <div className={\`bg-white rounded-lg border border-gray-200 \${className}\`}>
      <div className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white px-5 py-4 mb-4">
         <h3 className="text-xl font-bold flex items-center gap-2"><span className="w-1.5 h-6 bg-methodist-gold rounded-full"></span>{title}</h3>
      </div>
      <div className="px-6 pb-6">
      <ResponsiveContainer width="100%" height={300}>`
);

// End block for the second container to close the wrapper div
cContent = cContent.replace(
    /<\/ResponsiveContainer>\s*<\/div>\s*\)\s*\}/,
    `</ResponsiveContainer>
      </div>
    </div>
  )
}`
);

fs.writeFileSync(chartFile, cContent);
console.log('Performance Chart updated!');
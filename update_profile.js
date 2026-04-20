const fs = require('fs');

let fileStr = 'app/teacher/dashboard/page.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

const oldProfileBlock = `{/* Profile Summary */}
              <Card className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl">
                 <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                       <div className="h-12 w-12 rounded-full bg-gradient-to-br from-methodist-blue to-blue-900 text-yellow-400 flex items-center justify-center text-methodist-blue dark:text-blue-300 font-bold text-lg">
                          {teacher.first_name[0]}{teacher.last_name[0]}
                       </div>
                       <div className="overflow-hidden flex flex-col gap-1">
                          <Tooltip content={\`\${teacher.first_name} \${teacher.last_name}\`}>
                             <div className="font-semibold truncate">{teacher.first_name} {teacher.last_name}</div>
                          </Tooltip>
                          <Tooltip content={\`Teacher ID: \${teacher.teacher_id}\`}>
                             <div className="text-xs text-muted-foreground truncate">{teacher.teacher_id}</div>
                          </Tooltip>
                       </div>
                    </div>`;

const newProfileBlock = `{/* Profile Summary */}
              <Card className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden">
                 <CardHeader className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white p-5 shrink-0">
                    <div className="flex items-center gap-4">
                       <div className="h-12 w-12 rounded-full bg-methodist-yellow text-methodist-blue flex items-center justify-center font-bold text-lg shadow-inner">
                          {teacher.first_name[0]}{teacher.last_name[0]}
                       </div>
                       <div className="overflow-hidden flex flex-col gap-0.5">
                          <Tooltip content={\`\${teacher.first_name} \${teacher.last_name}\`}>
                             <div className="font-bold text-lg truncate tracking-tight">{teacher.first_name} {teacher.last_name}</div>
                          </Tooltip>
                          <Tooltip content={\`Teacher ID: \${teacher.teacher_id}\`}>
                             <div className="text-[13px] font-medium text-blue-200 truncate">{teacher.teacher_id}</div>
                          </Tooltip>
                       </div>
                    </div>
                 </CardHeader>
                 <CardContent className="p-6 pt-5">`;

/* Replace ignoring whitespace nicely if needed, or exact match. We'll use exact match since we know there aren't weird formatting changes. */

if (!content.includes('CardHeader className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white')) {
   // to be safe against spacing changes:
   let updated = content.replace(
      /\{\/\* Profile Summary \*\/\}\s*<Card className="border border-white\/40 shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\] bg-white\/60 backdrop-blur-xl rounded-3xl">\s*<CardContent className="p-6">\s*<div className="flex items-center gap-4 mb-4">\s*<div className="h-12 w-12 rounded-full bg-gradient-to-br from-methodist-blue to-blue-900 text-yellow-400 flex items-center justify-center text-methodist-blue dark:text-blue-300 font-bold text-lg">\s*\{teacher\.first_name\[0\]\}\{teacher\.last_name\[0\]\}\s*<\/div>\s*<div className="overflow-hidden flex flex-col gap-1">\s*<Tooltip content=\{\`\$\{teacher\.first_name\} \$\{teacher\.last_name\}\`\}>\s*<div className="font-semibold truncate">\{teacher\.first_name\} \{teacher\.last_name\}<\/div>\s*<\/Tooltip>\s*<Tooltip content=\{\`Teacher ID: \$\{teacher\.teacher_id\}\`\}>\s*<div className="text-xs text-muted-foreground truncate">\{teacher\.teacher_id\}<\/div>\s*<\/Tooltip>\s*<\/div>\s*<\/div>/,
      newProfileBlock.trim()
   );
   
   if (updated === content) {
      console.log('Failed to match exact profile block regex.');
   } else {
      fs.writeFileSync(fileStr, updated);
      console.log('Profile Summary updated with Methodist colors!');
   }
}

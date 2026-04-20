const fs = require('fs');

let dbFile = 'app/teacher/dashboard/page.tsx';
let content = fs.readFileSync(dbFile, 'utf8');

const profileSummaryRegex = /\{\/\* Profile Summary \*\/\}\s*<Card className="border border-white\/40 shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\] bg-white\/60 backdrop-blur-xl rounded-3xl overflow-hidden">\s*<CardHeader className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white pb-4">\s*<CardTitle className="text-lg font-bold flex items-center xl:gap-2"><span className="w-1\.5 h-5 bg-methodist-gold rounded-full"><\/span>Teacher Profile<\/CardTitle>\s*<\/CardHeader>\s*<CardContent className="p-6">\s*<div className="flex items-center gap-4 mb-4">\s*<div className="h-12 w-12 rounded-full bg-gradient-to-br from-methodist-blue to-blue-900 text-yellow-400 flex items-center justify-center text-methodist-blue dark:text-blue-300 font-bold text-lg">\s*\{teacher\.first_name\[0\]\}\{teacher\.last_name\[0\]\}\s*<\/div>\s*<div className="overflow-hidden flex flex-col gap-1">\s*<Tooltip content=\{\`\$\{teacher\.first_name\} \$\{teacher\.last_name\}\`\}>\s*<div className="font-semibold truncate">\{teacher\.first_name\} \{teacher\.last_name\}<\/div>\s*<\/Tooltip>\s*<Tooltip content=\{\`Teacher ID: \$\{teacher\.teacher_id\}\`\}>\s*<div className="text-xs text-muted-foreground truncate">\{teacher\.teacher_id\}<\/div>\s*<\/Tooltip>\s*<\/div>\s*<\/div>/g;

content = content.replace(profileSummaryRegex, `{/* Profile Summary */}
                 <Card className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden">
                   <div className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white px-5 py-4 flex items-center gap-4">
                       <div className="h-12 w-12 rounded-full bg-white/20 border-2 border-white/30 text-methodist-gold shadow-sm flex items-center justify-center font-bold text-lg">
                          {teacher.first_name[0]}{teacher.last_name[0]}
                       </div>
                       <div className="overflow-hidden flex flex-col">
                          <Tooltip content={\`\${teacher.first_name} \${teacher.last_name}\`}>
                             <div className="font-bold text-lg leading-tight truncate tracking-tight">{teacher.first_name} {teacher.last_name}</div>
                          </Tooltip>
                          <Tooltip content={\`Teacher ID: \${teacher.teacher_id}\`}>
                             <div className="text-xs text-blue-200 mt-0.5 font-medium truncate flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-methodist-gold rounded-full"></span>
                                {teacher.teacher_id}
                             </div>
                          </Tooltip>
                       </div>
                   </div>
                   <CardContent className="p-6 pt-5">`);

fs.writeFileSync(dbFile, content);
console.log('Fixed Teacher Profile Header replacing it with Teacher Name and ID');
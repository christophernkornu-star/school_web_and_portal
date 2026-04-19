const fs = require('fs');
const path = 'app/teacher/mock/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Update rows per page to prevent clipping with larger text
code = code.replace(
  /const STUDENTS_PER_PAGE = 24;/g,
  'const STUDENTS_PER_PAGE = 18;'
);

// Increase table's print font size from [10px] to [12px]
code = code.replace(
  /print:text-\[10px\]/g,
  'print:text-[12px]'
);

// Increase superscript text to [10px]
code = code.replace(
  /text-\[8px\] font-bold text-slate-500/g,
  'text-[10px] font-bold text-slate-500'
);

// Add clear bolding or size to names and headers if needed
// The current headers are `text-xs md:text-sm print:text-[12px]`
code = code.replace(
  /<td className="border border-slate-400 px-2 py-1 font-bold whitespace-nowrap truncate max-w-\[150px\] tracking-tight">\{student.fullname\}<\/td>/g,
  '<td className="border border-slate-400 px-2 py-1.5 font-bold whitespace-nowrap truncate max-w-[150px] tracking-tight">{student.fullname}</td>'
);

// Padding adjustments for table rows so it breathes
code = code.replace(
  /<td className="border border-slate-400 px-1.5 py-1 text-center">\{pageIndex \* STUDENTS_PER_PAGE/g,
  '<td className="border border-slate-400 px-1.5 py-1.5 text-center">{pageIndex * STUDENTS_PER_PAGE'
);

code = code.replace(
  /<td key=\{s.id\} className="border border-slate-400 px-1 py-1 text-center">/g,
  '<td key={s.id} className="border border-slate-400 px-1 py-1.5 text-center">'
);

code = code.replace(
  /<td className="border border-slate-400 px-1.5 py-1 text-center font-bold bg-slate-50">\{student.totalScore\}<\/td>/g,
  '<td className="border border-slate-400 px-1.5 py-1.5 text-center font-bold bg-slate-50 text-slate-900">{student.totalScore}</td>'
);

code = code.replace(
  /<td className="border border-slate-400 px-1.5 py-1 text-center font-bold">\{student.average.toFixed\(1\)\}<\/td>/g,
  '<td className="border border-slate-400 px-1.5 py-1.5 text-center font-bold text-slate-900">{student.average.toFixed(1)}</td>'
);

code = code.replace(
  /<td className="border border-slate-400 px-1.5 py-1 text-center font-black bg-slate-100">\{student.aggregate\}<\/td>/g,
  '<td className="border border-slate-400 px-1.5 py-1.5 text-center font-black bg-slate-100 text-slate-900">{student.aggregate}</td>'
);


fs.writeFileSync(path, code);
console.log('Typography and padding increased.');

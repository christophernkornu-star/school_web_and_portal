const fs = require('fs');
const path = 'app/teacher/mock/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Title headers
code = code.replace(
  /<div className="text-center mb-2 border-b-2 border-black pb-1">/g,
  '<div className="text-center mb-4 border-b-[3px] border-slate-800 pb-3">'
);
code = code.replace(
  /<h1 className="text-xl md:text-2xl font-bold font-serif uppercase tracking-wide">Biriwa Methodist "C" Basic School<\/h1>/g,
  '<h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase">Biriwa Methodist "C" Basic School</h1>'
);
code = code.replace(
  /<h2 className="text-lg md:text-xl font-bold uppercase mt-0">/g,
  '<h2 className="text-sm md:text-base font-bold tracking-widest text-slate-600 uppercase mt-1">'
);
code = code.replace(
  /\{currentMockData\.academic_year\} \{currentMockData\.name\.replace\(\/mock\/i, ''\)\.trim\(\)\} Mock Results/g,
  '{currentMockData.academic_year} • {currentMockData.name.replace(/mock/i, \'\').trim()} Mock Results'
);

// Table configuration
code = code.replace(
  /<table className="w-full border-collapse border border-black text-xs md:text-sm print:text-\[11px\] min-w-\[800px\] md:min-w-0">/g,
  '<table className="w-full border-collapse border border-slate-400 text-xs md:text-sm print:text-[10px] min-w-[800px] md:min-w-0">'
);
code = code.replace(
  /<tr className="bg-gray-100">/g,
  '<tr className="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider">'
);

// Table headings
code = code.replace(
  /className="border border-black px-1 py-0\.5 w-8 text-center"/g,
  'className="border border-slate-400 px-1.5 py-1 w-8 text-center"'
);
code = code.replace(
  /className="border border-black px-1 py-0\.5 text-left min-w-\[150px\]"/g,
  'className="border border-slate-400 px-2 py-1 text-left min-w-[150px]"'
);
code = code.replace(
  /className="border border-black px-1 py-0\.5 w-10 text-center rotate-heads"/g,
  'className="border border-slate-400 px-1 py-1 w-10 text-center rotate-heads text-slate-700"'
);
code = code.replace(
  /className="border border-black px-1 py-0\.5 w-10 text-center bg-gray-50 font-bold whitespace-nowrap"/g,
  'className="border border-slate-400 px-1.5 py-1 w-10 text-center bg-slate-50 whitespace-nowrap truncate"'
);
code = code.replace(
  /className="border border-black px-1 py-0\.5 w-10 text-center bg-gray-50"/g,
  'className="border border-slate-400 px-1.5 py-1 w-10 text-center bg-slate-50"'
);
code = code.replace(
  /className="border border-black px-1 py-0\.5 w-10 text-center bg-gray-200"/g,
  'className="border border-slate-400 px-1.5 py-1 w-10 text-center bg-slate-200"'
);

// Table body
code = code.replace(
  /<tbody>/g,
  '<tbody className="text-slate-700 font-medium">'
);
code = code.replace(
  /<tr key=\{student\.id\}>/g,
  '<tr key={student.id} className="even:bg-slate-50/50">'
);
code = code.replace(
  /<td className="border border-black px-1 py-0\.5 text-center">\{pageIndex \* STUDENTS_PER_PAGE \+ idx \+ 1\}<\/td>/g,
  '<td className="border border-slate-400 px-1.5 py-1 text-center">{pageIndex * STUDENTS_PER_PAGE + idx + 1}</td>'
);
code = code.replace(
  /<td className="border border-black px-1 py-0\.5 font-medium uppercase whitespace-nowrap px-2 truncate max-w-\[150px\]">/g,
  '<td className="border border-slate-400 px-2 py-1 font-bold whitespace-nowrap truncate max-w-[150px] tracking-tight">'
);
code = code.replace(
  /<td key=\{s\.id\} className="border border-black px-1 py-0\.5 text-center">/g,
  '<td key={s.id} className="border border-slate-400 px-1 py-1 text-center">'
);

// Grades
code = code.replace(
  /<span>\{scoreVal\}<\/span>\s*<sup className="text-\[9px\] font-bold text-gray-700">\{grade\}<\/sup>/g,
  '<span className={scoreVal < 30 ? "text-red-700 font-bold" : ""}>{scoreVal}</span><sup className="text-[8px] font-bold text-slate-500">{grade}</sup>'
);

// Totals
code = code.replace(
  /<td className="border border-black px-1 py-0\.5 text-center font-bold bg-gray-50">/g,
  '<td className="border border-slate-400 px-1.5 py-1 text-center font-bold bg-slate-50">'
);
code = code.replace(
  /<td className="border border-black px-1 py-0\.5 text-center font-bold">/g,
  '<td className="border border-slate-400 px-1.5 py-1 text-center font-bold">'
);
code = code.replace(
  /<td className="border border-black px-1 py-0\.5 text-center font-bold bg-gray-100">/g,
  '<td className="border border-slate-400 px-1.5 py-1 text-center font-black bg-slate-100">'
);


fs.writeFileSync(path, code);
console.log('Update Complete');

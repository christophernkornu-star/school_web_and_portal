const fs = require('fs');
const pf = 'app/student/profile/page.tsx';
let c = fs.readFileSync(pf, 'utf8');

c = c.replace(/className="bg-white dark:bg-gray-800 shadow"/g, 'className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-800"');
c = c.replace(/className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"/g, 'className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl shadow-xl shadow-gray-200/30 p-8 border border-gray-100/50 dark:border-gray-800/50"');
c = c.replace(/className="bg-white rounded-lg shadow p-12 text-center"/g, 'className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-[3rem] p-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800"');
c = c.replace(/className="bg-white rounded-lg shadow mb-8"/g, 'className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-[2.5rem] shadow-2xl shadow-gray-200/40 mb-8 border border-gray-100/50 overflow-hidden"');
c = c.replace(/className="bg-white p-4 md:p-6 rounded-lg border border-gray-200"/g, 'className="bg-slate-50/50 dark:bg-gray-800/50 p-6 md:p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm"');
c = c.replace(/bg-methodist-blue text-white px-2 py-1 flex items-center/g, 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center rounded-xl');

fs.writeFileSync(pf, c);
console.log('Fixed styling misses inside profile page');

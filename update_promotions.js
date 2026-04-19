const fs = require('fs');
const path = 'app/teacher/promotions/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Update Skeleton container to match new rounded UI
code = code.replace(
  /<div className="bg-white dark:bg-gray-800 shadow mb-8">/g,
  '<div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30 shadow-sm transition-colors mb-8">'
);

// Empty State Header
code = code.replace(
  /<header className="bg-white dark:bg-gray-800 shadow">/g,
  '<header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30 shadow-sm transition-colors">'
);

// Main Page Header
code = code.replace(
  /<header className="bg-white dark:bg-gray-800 shadow transition-colors">/g,
  '<header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30 shadow-sm transition-colors">'
);

code = code.replace(
  /<h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Student Promotions<\/h1>/g,
  '<h1 className="text-xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Student Promotions</h1>'
);
code = code.replace(
  /<h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Student Promotion Decisions<\/h1>/g,
  '<h1 className="text-xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Student Promotion Decisions</h1>'
);


// Warning Cards
code = code.replace(
  /<div className="bg-blue-50 dark:bg-blue-900\/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 md:p-6/g,
  '<div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/60 rounded-2xl shadow-sm p-4 md:p-6'
);
code = code.replace(
  /<div className="mb-6 bg-green-50 dark:bg-green-900\/20 border border-green-200 dark:border-green-800 rounded-lg p-4/g,
  '<div className="mb-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl shadow-sm p-4'
);
code = code.replace(
  /<div className="mb-6 bg-red-50 dark:bg-red-900\/20 border border-red-200 dark:border-red-800 rounded-lg p-4/g,
  '<div className="mb-6 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/60 rounded-2xl shadow-sm p-4'
);
code = code.replace(
  /bg-green-600/g,
  'bg-emerald-600'
);
code = code.replace(
  /text-green-600/g,
  'text-emerald-600'
);
code = code.replace(
  /text-green-800/g,
  'text-emerald-800'
);
code = code.replace(
  /text-green-700/g,
  'text-emerald-700'
);
code = code.replace(
  /text-green-300/g,
  'text-emerald-300'
);
code = code.replace(
  /text-green-500/g,
  'text-emerald-500'
);
code = code.replace(
  /bg-green-100/g,
  'bg-emerald-100'
);
code = code.replace(
  /bg-green-900\/30/g,
  'bg-emerald-900/30'
);
code = code.replace(
  /dark:text-green-400/g,
  'dark:text-emerald-400'
);

code = code.replace(
  /bg-red-600/g,
  'bg-rose-600'
);
code = code.replace(
  /text-red-600/g,
  'text-rose-600'
);
code = code.replace(
  /text-red-800/g,
  'text-rose-800'
);
code = code.replace(
  /text-red-700/g,
  'text-rose-700'
);
code = code.replace(
  /text-red-300/g,
  'text-rose-300'
);
code = code.replace(
  /text-red-500/g,
  'text-rose-500'
);
code = code.replace(
  /bg-red-100/g,
  'bg-rose-100'
);
code = code.replace(
  /bg-red-900\/30/g,
  'bg-rose-900/30'
);
code = code.replace(
  /dark:text-red-400/g,
  'dark:text-rose-400'
);

// Standard Card container
code = code.replace(
  /<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 mb-6">/g,
  '<div className="bg-white dark:bg-gray-800/90 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4 md:p-6 mb-6 backdrop-blur-sm">'
);


// Form Select
code = code.replace(
  /className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent text-xs md:text-sm dark:bg-gray-700 dark:text-white"/g,
  'className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border-0 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm dark:text-white shadow-sm transition-all cursor-pointer"'
);


// Card Headers
code = code.replace(
  /<h2 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white mb-4">/g,
  '<h2 className="text-lg md:text-xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">'
);
code = code.replace(
  /<h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 flex items-center space-x-2 text-sm md:text-base">/g,
  '<h3 className="font-bold text-blue-900 dark:text-blue-300 mb-3 flex items-center space-x-2 text-base md:text-lg">'
);


// Stats / Summary Cards
code = code.replace(
  /<div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">/g,
  '<div className="bg-white dark:bg-gray-800/90 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5 md:p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1">'
);
code = code.replace(
  /<div className="bg-green-50 dark:bg-green-900\/20 rounded-lg shadow p-4 md:p-6">/g,
  '<div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-800/50 p-5 md:p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1">'
);
code = code.replace(
  /<div className="bg-red-50 dark:bg-red-900\/20 rounded-lg shadow p-4 md:p-6">/g,
  '<div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl shadow-sm border border-rose-100 dark:border-rose-800/50 p-5 md:p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-1">'
);

code = code.replace(
  /<p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">/g,
  '<p className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white mt-1">'
);
code = code.replace(
  /<p className="text-xl md:text-2xl font-bold text-green-900 dark:text-green-400">/g,
  '<p className="text-2xl md:text-3xl font-black tracking-tight text-emerald-700 dark:text-emerald-400 mt-1">'
);
code = code.replace(
  /<p className="text-xl md:text-2xl font-bold text-red-900 dark:text-red-400">/g,
  '<p className="text-2xl md:text-3xl font-black tracking-tight text-rose-700 dark:text-rose-400 mt-1">'
);

// Table Container
code = code.replace(
  /<div className="hidden md:block bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">/g,
  '<div className="hidden md:block bg-white dark:bg-gray-800/90 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden backdrop-blur-sm">'
);
code = code.replace(
  /<thead className="bg-gray-50 dark:bg-gray-700">/g,
  '<thead className="bg-gray-50 dark:bg-gray-800/80">'
);
code = code.replace(
  /className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"/g,
  'className="px-6 py-4 text-left text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider"'
);

// Promote / Repeat buttons (Table)
code = code.replace(
  /className=\{`px-3 py-1 rounded-lg text-sm font-medium transition \${/g,
  'className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-sm ${'
);
code = code.replace(
  /decision\?\.decision === 'promote'\n                                        \? 'bg-green-600 text-white'\n                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'/g,
  'decision?.decision === \'promote\'\n                                        ? \'bg-emerald-600 text-white shadow-emerald-500/20\'\n                                        : \'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600\''
);
code = code.replace(
  /decision\?\.decision === 'repeat'\n                                        \? 'bg-red-600 text-white'\n                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'/g,
  'decision?.decision === \'repeat\'\n                                        ? \'bg-rose-600 text-white shadow-rose-500/20\'\n                                        : \'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600\''
);

// Remarks Input (Table)
code = code.replace(
  /className="w-full px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"/g,
  'className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white shadow-sm transition-all"'
);


// Mobile View
code = code.replace(
  /<div key=\{rec\.student_id\} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">/g,
  '<div key={rec.student_id} className="bg-white dark:bg-gray-800/90 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5 space-y-3">'
);

code = code.replace(
  /className=\{`py-2 rounded-lg text-sm font-medium transition flex items-center justify-center space-x-1 \${/g,
  'className={`py-2 rounded-xl text-sm font-semibold transition-all shadow-sm flex items-center justify-center space-x-1 ${'
);
// Make sure mobile matched the shadow colors
code = code.replace(
  /decision\?\.decision === 'promote'\n                                  \? 'bg-green-600 text-white'\n                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'/g,
  'decision?.decision === \'promote\'\n                                  ? \'bg-emerald-600 text-white shadow-emerald-500/20\'\n                                  : \'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300\''
);
code = code.replace(
  /decision\?\.decision === 'repeat'\n                                  \? 'bg-red-600 text-white'\n                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'/g,
  'decision?.decision === \'repeat\'\n                                  ? \'bg-rose-600 text-white shadow-rose-500/20\'\n                                  : \'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300\''
);


code = code.replace(
  /className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-ghana-green dark:bg-gray-700 dark:text-white"/g,
  'className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700/50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white shadow-sm transition-all"'
);


fs.writeFileSync(path, code);
console.log('Done mapping promotion overrides');

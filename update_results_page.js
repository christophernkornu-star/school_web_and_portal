const fs = require('fs');

let file = 'app/student/results/page.tsx';
let data = fs.readFileSync(file, 'utf8');

// Global layout wrapping
data = data.replace(
    /className="min-h-screen bg-gray-50 flex flex-col transition-colors"/g,
    'className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors font-sans"'
);
data = data.replace(
    /className="min-h-screen bg-gray-50"/g,
    'className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans"'
);

// Loading Header
data = data.replace(
    /className="bg-white dark:bg-gray-800 shadow"/g,
    'className="bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl shadow-sm border-b border-gray-200 dark:border-gray-800"'
);

// Results View Header
data = data.replace(
    /className="ghana-flag-border bg-white shadow-md"/g,
    'className="bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50"'
);

// Loading Card
data = data.replace(
    /className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"/g,
    'className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-[2.5rem] shadow-2xl shadow-gray-200/40 p-8 border border-gray-100/50 dark:border-gray-800/50"'
);

// Text styling in header
data = data.replace(
    /className="text-xl font-bold text-methodist-blue"/g,
    'className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight"'
);
data = data.replace(
    /className="text-xs text-gray-600"/g,
    'className="text-[10px] md:text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mt-0.5"'
);
data = data.replace(
    /text-methodist-blue/g,
    'text-blue-700 dark:text-blue-400'
);

// Top Section Filter/Download Card
data = data.replace(
    /className="bg-white rounded-lg shadow-lg p-4 md:p-6 mb-6"/g,
    'className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-[2rem] shadow-xl shadow-gray-200/40 p-6 md:p-8 mb-8 border border-gray-100 dark:border-gray-800/50"'
);

// Download button
let oldBtn = `className="flex items-center gap-2 px-4 md:px-6 py-2 bg-blue-700 dark:text-blue-400 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"`;
let newBtn = `className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:-translate-y-0.5 shadow-lg hover:shadow-blue-500/25 transition-all font-bold text-sm md:text-base"`;
data = data.replace(oldBtn, newBtn);

data = data.replace(
    /className="flex items-center gap-2 px-4 md:px-6 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm md:text-base"/g,
    'className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:-translate-y-0.5 shadow-lg hover:shadow-blue-500/25 transition-all font-bold text-sm md:text-base"'
);

// Term Filter Buttons Active
data = data.replace(
    /return 'bg-blue-700 dark:text-blue-400 text-white'/g,
    'return "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-blue-500/25 font-bold hover:-translate-y-0.5"'
);
data = data.replace(
    /return 'bg-gray-100 text-gray-700 hover:bg-gray-200'/g,
    'return "bg-gray-100/80 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 font-medium border border-gray-200 dark:border-gray-700"'
);

// Main Table Wrapper Card
data = data.replace(
    /className="bg-white rounded-lg shadow-lg overflow-hidden"/g,
    'className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-[2.5rem] shadow-xl shadow-gray-200/40 overflow-hidden border border-gray-100 dark:border-gray-800"'
);

// Table Header
data = data.replace(
    /className="bg-blue-700 dark:text-blue-400 text-white"/g,
    'className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm border-b border-indigo-500/50"'
);
data = data.replace(
    /className="bg-blue-700 text-white"/g,
    'className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm border-b border-indigo-500/50"'
);

// Table Body and Rows
data = data.replace(
    /className="bg-white divide-y divide-gray-200"/g,
    'className="bg-white/50 dark:bg-gray-900/50 divide-y divide-gray-100 dark:divide-gray-800 backdrop-blur-sm"'
);
data = data.replace(
    /className="hover:bg-gray-50 transition-colors"/g,
    'className="hover:bg-white dark:hover:bg-gray-800 transition-all hover:shadow-sm"'
);

// Summary Stats Cards
data = data.replace(
    /className="bg-white rounded-lg shadow p-4 md:p-6"/g,
    'className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-[2rem] shadow-lg shadow-gray-200/30 p-6 md:p-8 border border-gray-100 dark:border-gray-800 hover:-translate-y-1 transition-all duration-300"'
);

// Additional text tweaks
data = data.replace(
    /text-gray-900/g,
    'text-slate-800 dark:text-slate-100'
);
data = data.replace(
    /text-gray-500/g,
    'text-slate-500 dark:text-slate-400'
);
data = data.replace(
    /text-gray-800/g,
    'text-slate-800 dark:text-slate-100'
);

data = data.replace( // Table th text uppercase sizing
    /text-xs md:text-sm font-semibold uppercase tracking-wider/g,
    'text-xs md:text-sm font-bold uppercase tracking-wider py-4'
);

fs.writeFileSync(file, data);
console.log('Results page updated with premium modern styles.');

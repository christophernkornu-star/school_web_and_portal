const fs = require('fs');

let file = 'app/student/results/page.tsx';
let data = fs.readFileSync(file, 'utf8');

// Header Logo 
data = data.replace(
    /<GraduationCap className="w-10 h-10 text-blue-700 dark:text-blue-400" \/>/g,
    '<GraduationCap className="w-10 h-10 text-methodist-blue" />'
);

// Header Primary Title
data = data.replace(
    /className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight"/g,
    'className="text-xl md:text-2xl font-black text-methodist-blue tracking-tight"'
);

// Header Subtitle Text
data = data.replace(
    /className="text-\[10px\] md:text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mt-0\.5"/g,
    'className="text-[10px] md:text-xs text-methodist-yellow font-bold uppercase tracking-wider mt-0.5"'
);

// Back to Dashboard
data = data.replace(
    /className="text-gray-700 hover:text-blue-700 dark:text-blue-400"/g,
    'className="text-gray-700 hover:text-methodist-blue font-semibold"'
);

// Download button - let's ensure it maps to methodist-blue if it isn't already or is incorrectly set up from previous replaces
data = data.replace(
    /bg-methodist-blue text-white rounded-lg hover:bg-blue-700/g,
    'bg-methodist-blue text-white rounded-xl shadow-lg hover:shadow-blue-900/40 hover:-translate-y-0.5 transition-all font-bold'
);

data = data.replace( // Fix term filters styling to use the elegant methodist blue/yellow
    /\? 'bg-methodist-blue text-white'/g,
    '? "bg-methodist-blue text-methodist-yellow font-bold shadow-md hover:-translate-y-0.5 transition-all"'
);
data = data.replace(
    /: 'bg-gray-200 text-gray-700 hover:bg-gray-300'/g,
    ': "bg-white/50 text-slate-600 hover:bg-white hover:text-methodist-blue border border-gray-200 transition-all font-medium"'
);

// Ensure the Table Header uses the school color, since I see it currently reads `thead className="bg-methodist-blue text-white"` which is good, but let's make the text yellow for extra contrast
data = data.replace(
    /<thead className="bg-methodist-blue text-white">/g,
    '<thead className="bg-methodist-blue text-methodist-yellow shadow-md border-b-2 border-methodist-yellow/30">'
);

// Fix the total subjects text color at the bottom
data = data.replace(
    /className="text-2xl md:text-3xl font-bold text-blue-700 dark:text-blue-400"/g,
    'className="text-2xl md:text-3xl font-bold text-methodist-blue"'
);

// Adding ghana-flag-border back to the sticky header (using top border)
data = data.replace(
    /<header className="bg-white\/90 dark:bg-gray-950\/90 backdrop-blur-xl shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50">/g,
    '<header className="bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 ghana-flag-border">'
);

fs.writeFileSync(file, data);
console.log('Results page updated with Methodist colors');

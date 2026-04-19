const fs = require('fs');

function replaceInFile(fileStr, replacements) {
    let content = fs.readFileSync(fileStr, 'utf8');
    for (let r of replacements) {
        content = content.replace(r.old, r.new);
    }
    fs.writeFileSync(fileStr, content);
}

// 1. Student Dashboard
replaceInFile('app/student/dashboard/page.tsx', [
    {
        old: /className="space-y-4 p-4"/g,
        new: 'className="space-y-3 p-3"'
    },
    {
        old: /className="p-6 bg-white dark:bg-gray-800 rounded-2xl/g,
        new: 'className="p-4 md:p-5 bg-white dark:bg-gray-800 rounded-xl'
    },
    {
        old: /text-\[15px\] text-slate-700 dark:text-slate-300 leading-loose whitespace-pre-wrap font-medium mt-3/g,
        new: 'text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap mt-2'
    },
    {
        old: /text-lg group-hover:text-blue-700/g,
        new: 'text-[15px] group-hover:text-blue-700'
    }
]);
console.log('Fixed Student Dashboard typography');

// 2. Teacher Dashboard
replaceInFile('app/teacher/dashboard/page.tsx', [
    {
        old: /font-bold text-methodist-blue mb-1\.5 leading-snug break-words tracking-tight/g,
        new: 'font-semibold text-methodist-blue mb-1 break-words tracking-normal'
    },
    {
        old: /text-\[13px\] text-slate-600 dark:text-slate-300 leading-relaxed font-medium line-clamp-3 whitespace-pre-line/g,
        new: 'text-xs text-slate-600 dark:text-slate-300 leading-normal line-clamp-2 whitespace-pre-line'
    }
]);
console.log('Fixed Teacher Dashboard typography');

// 3. Teacher Announcements
replaceInFile('app/teacher/announcements/page.tsx', [
    {
        old: /text-2xl font-black text-methodist-blue mt-3 tracking-tight/g,
        new: 'text-xl md:text-2xl font-bold text-methodist-blue mt-2'
    },
    {
        old: /text-\[16px\] md:text-\[17px\] text-slate-700 dark:text-slate-300 leading-loose font-medium whitespace-pre-wrap tracking-wide/g,
        new: 'text-[15px] md:text-[16px] text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap'
    },
    {
        old: /shadow-xl shadow-gray-200\/40 p-2 md:p-4 border border-gray-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 mb-6/g,
        new: 'shadow-lg p-4 md:p-5 border border-gray-100 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 mb-4'
    }
]);
console.log('Fixed Teacher Announcements typography');

// 4. Announcements Banner
replaceInFile('components/AnnouncementsBanner.tsx', [
    {
        old: /font-bold text-\[15px\] tracking-wide/g,
        new: 'font-semibold text-[14px]'
    },
    {
        old: /text-\[14px\] leading-relaxed opacity-95 truncate max-w-xl md:max-w-3xl font-medium tracking-wide whitespace-pre-wrap/g,
        new: 'text-[13px] leading-normal opacity-90 truncate max-w-xl md:max-w-2xl'
    }
]);
console.log('Fixed Announcements Banner typography');


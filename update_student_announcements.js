const fs = require('fs');

let fileStr = 'app/student/dashboard/page.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

// Fix wrapper - remove divide-y and replace with gap-y
content = content.replace(
  /<div className="divide-y divide-gray-100">/g,
  '<div className="space-y-4 p-4">'
);

// Update individual announcement card
let oldCard = `className="p-5 hover:bg-gray-50 transition-colors duration-200"`;
let newCard = `className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900 transition-all duration-300 group"`;
content = content.replace(oldCard, newCard);

// Update title string to methodist blue
let oldTitle = `className="font-bold text-gray-800 text-base">`;
let newTitle = `className="font-bold text-methodist-blue text-lg group-hover:text-blue-700 transition-colors">`;
content = content.replace(oldTitle, newTitle);

// Update body text
let oldBody = `className="text-sm text-gray-600 leading-relaxed">{announcement.content}</p>`;
let newBody = `className="text-[15px] text-slate-700 dark:text-slate-300 leading-loose whitespace-pre-wrap font-medium mt-3">{announcement.content}</p>`;
content = content.replace(oldBody, newBody);

// Make Date a bit cleaner and more visible
let oldDate = `className="text-xs text-gray-400 whitespace-nowrap ml-4">`;
let newDate = `className="text-xs font-semibold text-methodist-yellow bg-methodist-blue/5 px-3 py-1 rounded-full whitespace-nowrap ml-4">`;
content = content.replace(oldDate, newDate);

fs.writeFileSync(fileStr, content);
console.log('Updated app/student/dashboard/page.tsx announcements');

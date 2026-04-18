const fs = require("fs");
let content = fs.readFileSync("app/admin/finance/setup/page.tsx", "utf-8");

// Convert header
content = content.replace(
  /<div className="min-h-screen bg-gray-50 flex flex-col">/,
  `<div className="bg-gray-50/50 min-h-screen pb-20 font-sans">`
);

content = content.replace(
  /<div className="min-h-screen bg-gray-50">[\s\S]*?<header className="bg-white shadow">[\s\S]*?<\/header>/,
  `<div className="bg-gray-50/50 min-h-screen pb-20 font-sans w-full max-w-[100vw] overflow-x-hidden box-border">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Modern Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-indigo-50/60 to-transparent pointer-events-none"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <BackButton href="/admin/finance" className="shadow-sm" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Settings className="w-7 h-7 text-indigo-600" />
                Fee Configuration
              </h1>
              <p className="text-sm sm:text-base text-gray-500 font-medium mt-1">
                Manage fee types, structures, and amounts per class
              </p>
            </div>
          </div>
        </div>`
);

// We also need to fix `<main className="container mx-auto px-4 md:px-6 py-6 md:py-8">`
content = content.replace(
  /<main className="container mx-auto px-4 md:px-6 py-6 md:py-8">/,
  `<div>`
);

// We need to fix closing </main> -> </div>
content = content.replace(/<\/main>/, `</div>\n      </div>`);

// Update cards
content = content.replace(
  /<div className="bg-white rounded-lg shadow p-6">/g,
  `<div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-6 md:p-8">`
);

// Update Left Column: Fee Types title
content = content.replace(
  /<h2 className="text-base md:text-lg font-bold \ntext-gray-800">Fee Types<\/h2>/g,
  `<h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-500"/> Fee Types</h2>`
);
content = content.replace(
  /<h2 className="text-base md:text-lg font-bold text-gray-800">Fee Types<\/h2>/g,
  `<h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-500"/> Fee Types</h2>`
);

// Update Right Column: Fee Structures title
content = content.replace(
  /<h2 className="text-base md:text-lg font-bold \ntext-gray-800">Fee Structures \(Amounts\)<\/h2>/g,
  `<h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><DollarSign className="w-5 h-5 text-indigo-500"/> Fee Structures</h2>`
);
content = content.replace(
  /<h2 className="text-base md:text-lg font-bold text-gray-800">Fee Structures \(Amounts\)<\/h2>/g,
  `<h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><DollarSign className="w-5 h-5 text-indigo-500"/> Fee Structures</h2>`
);

// Purple button styling
content = content.replace(/purple/g, 'indigo');

fs.writeFileSync("app/admin/finance/setup/page.tsx", content);

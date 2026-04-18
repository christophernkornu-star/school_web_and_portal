const fs = require("fs");
let content = fs.readFileSync("app/admin/reports/financial/page.tsx", "utf-8");

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
          <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-amber-50/60 to-transparent pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between w-full relative z-10 gap-4">
            <div className="flex items-center gap-4">
              <BackButton href="/admin/finance" className="shadow-sm" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <PieChart className="w-7 h-7 text-amber-600" />
                  Revenue Analytics
                </h1>
                <p className="text-sm sm:text-base text-gray-500 font-medium mt-1">
                  Generate detailed financial statements and view revenue forecasts
                </p>
              </div>
            </div>
            
            <button 
              onClick={exportToCSV}
              className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm w-full md:w-auto"
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>`
);

content = content.replace(
  /<main className="container mx-auto px-4 md:px-6 py-6 md:py-8">/,
  `<div>`
);

content = content.replace(/<\/main>/, `</div>\n      </div>`);

// Cards
content = content.replace(
  /<div className="bg-white rounded-lg shadow /g,
  `<div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 `
);

content = content.replace(/green-600/g, 'emerald-600');
content = content.replace(/blue-600/g, 'indigo-600');

fs.writeFileSync("app/admin/reports/financial/page.tsx", content);

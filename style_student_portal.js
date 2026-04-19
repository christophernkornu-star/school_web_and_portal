const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('app/student', function(filePath) {
  if (!filePath.endsWith('.tsx')) return;
  let o = fs.readFileSync(filePath, 'utf8');
  let c = o;

  // Global Header Replacements
  c = c.replace(
      /bg-gradient-to-r from-methodist-gold via-yellow-500 to-yellow-600 shadow-lg border-b-4 border-yellow-700/g,
      'bg-white/90 dark:bg-gray-950/90 backdrop-blur-xl shadow-sm border-b border-gray-200 dark:border-gray-800'
  );

  c = c.replace(
      /className="text-base md:text-xl font-bold text-methodist-blue"/g,
      'className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight"'
  );
  
  c = c.replace(
      /text-methodist-blue/g,
      'text-blue-700 dark:text-blue-400'
  );
  
  // Hero Welcome Section Replacements
  c = c.replace(
      /bg-gradient-to-br from-methodist-blue to-blue-900 text-white rounded-2xl p-6 md:p-10 mb-8 shadow-xl relative overflow-hidden/g,
      'bg-gradient-to-br from-blue-950 to-indigo-950 text-white rounded-[2.5rem] p-8 md:p-12 mb-8 shadow-2xl relative overflow-hidden border border-blue-900/30'
  );

  c = c.replace(
      /className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 dark:border-gray-700"/g,
      'className="bg-white dark:bg-gray-900 rounded-[1.5rem] shadow-xl shadow-gray-200/40 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1.5 border border-gray-100 dark:border-gray-800"'
  );

  // General Widget Re-shapings
  c = c.replace(
      /className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"/g,
      'className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100/50 dark:border-gray-800/50"'
  );

  c = c.replace(
      /className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"/g,
      'className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl shadow-xl shadow-gray-200/30 p-8 border border-gray-100/50 dark:border-gray-800/50"'
  );
  
  c = c.replace(
      /bg-gray-50 flex/g,
      'bg-slate-50 dark:bg-slate-950 flex font-sans'
  );

  c = c.replace(
      /className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center"/g,
      'className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm shadow-inner rounded-[3rem] p-16 text-center border-2 border-dashed border-gray-200 dark:border-gray-800"'
  );

  c = c.replace(
      /bg-gray-50 dark:bg-gray-700\/50 rounded-lg p-4/g,
      'bg-slate-50/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-[1.5rem] p-6 border border-gray-100 dark:border-gray-800'
  );

  c = c.replace(
      /bg-methodist-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700/g,
      'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-blue-500/25 px-8 py-3 rounded-xl hover:-translate-y-0.5 transition-all font-bold tracking-wide'
  );

  if (c !== o) {
      fs.writeFileSync(filePath, c);
      console.log("Updated " + filePath);
  }
});

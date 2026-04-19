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
  let text = fs.readFileSync(filePath, 'utf8');
  let original = text;

  // Restore the Methodist Gold Banner
  text = text.replace(
      /\{\/\* Main Header \*\/\}\s*<div className="bg-white\/90[^>]*>/,
      '{/* Main Header */}\n        <div className="bg-gradient-to-r from-methodist-gold via-yellow-500 to-yellow-600 shadow-lg border-b-4 border-yellow-700">'
  );

  // Restore the GraduationCap color
  text = text.replace(
      /<GraduationCap className="w-8 h-8 md:w-10 md:h-10 text-blue-700(?: dark:text-blue-400)?" \/>/,
      '<GraduationCap className="w-8 h-8 md:w-10 md:h-10 text-methodist-blue" />'
  );

  // Restore the Title text
  text = text.replace(
      /<h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight">\s*(Biriwa Methodist 'C' Basic School)\s*<\/h1>/,
      '<h1 className="text-xl md:text-2xl font-black text-methodist-blue tracking-tight">\n                      $1\n                    </h1>'
  );

  // Restore the Portal subtitle
  text = text.replace(
      /<p className="text-\[10px\] md:text-xs text-blue-700(?: dark:text-blue-400)? font-semibold">(Student Portal)<\/p>/,
      '<p className="text-[10px] md:text-xs text-methodist-blue font-bold tracking-wider uppercase">$1</p>'
  );

  if (text !== original) {
      fs.writeFileSync(filePath, text);
      console.log("Restored yellow banner in: " + filePath);
  }
});

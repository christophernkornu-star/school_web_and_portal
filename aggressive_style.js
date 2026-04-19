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

  // Very aggressive replacements for missed card blocks
  c = c.replace(
      /className="bg-white([^"]*)rounded-lg([^"]*)shadow([^"]*)"/g,
      'className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl shadow-xl shadow-gray-200/30 overflow-hidden border border-gray-100/50 dark:border-gray-800/50 $1 $2 $3"'
  );

  c = c.replace(
      /className="bg-white([^"]*)shadow([^"]*)"/g,
      'className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm border-b border-gray-100 dark:border-gray-800 $1 $2"'
  );

  c = c.replace(
      /bg-methodist-blue text-white/g,
      'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all font-bold tracking-wide'
  );

  if (c !== o) {
      fs.writeFileSync(filePath, c);
      console.log("Updated aggressive styling in " + filePath);
  }
});

const fs = require('fs');
const glob = require('fs').readdirSync;

function updateCards(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = dir + '/' + file;
    if (fs.statSync(fullPath).isDirectory()) {
      updateCards(fullPath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      const a = content.replace(
        /className="([^"]*)rounded-lg shadow-md([^"]*)"/g,
        'className="-2xl shadow-lg shadow-gray-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100"'
      );
      const b = a.replace(
        /className="([^"]*)rounded-lg shadow-lg([^"]*)"/g,
        'className="-3xl shadow-xl shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden border border-slate-100"'
      );
      if(b !== content) {
        fs.writeFileSync(fullPath, b);
      }
    }
  });
}

updateCards('app/components/home');
console.log('Processed home components');

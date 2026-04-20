const fs = require('fs');
let fileStr = 'app/teacher/dashboard/page.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

content = content.replace(
    /<\/div>\n                          \}\)\)\n                          <\/div><\/div>\n                       \)\}/g,
    '</div>\n                          ))}\n                      </div>\n                   )}'
);

fs.writeFileSync(fileStr, content);
console.log('Fixed extra divs accurately.');
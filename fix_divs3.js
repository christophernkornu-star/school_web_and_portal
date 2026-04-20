const fs = require('fs');
let fileStr = 'app/teacher/dashboard/page.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

const regex = /<\/div>\s+\)\)\}\s+<\/div><\/div>\s+\)\}\s*<\/CardContent>/g;

content = content.replace(
    regex,
    '</div>\n                          ))}\n                      </div>\n                   )}\n                 </CardContent>'
);

fs.writeFileSync(fileStr, content);
console.log('Fixed extra divs perfectly.');
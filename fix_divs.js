const fs = require('fs');
let fileStr = 'app/teacher/dashboard/page.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

content = content.replace(
    /<\/div>\s*\}\)\)\}\s*<\/div><\/div>/g,
    '</div>\n                          ))}\n                      </div>'
);

if (content.includes('</div></div>\n                       )}')) {
    content = content.replace(
        /<\/div><\/div>\n                       \)\}/g,
        '</div>\n                       )}'
    );
}

fs.writeFileSync(fileStr, content);
console.log('Fixed extra divs.');
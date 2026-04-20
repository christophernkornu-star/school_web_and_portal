const fs = require('fs');

let fileStr = 'app/teacher/dashboard/page.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

const regex = /<\/div>\s*<\/div>\s*\{\/\* Dashboard Content Grid \*\/\}/g;
if (regex.test(content)) {
    content = content.replace(
        regex,
        `  </div>
            </CardContent>
          </Card>
          
          {/* Dashboard Content Grid */}`
    );
    fs.writeFileSync(fileStr, content);
    console.log("Fixed closing tags");
} else {
    console.log("Failed to find Dashboard Content Grid");
}
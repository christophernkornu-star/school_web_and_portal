const fs = require('fs');
let content = fs.readFileSync('components/SystemNotifications.tsx', 'utf8');

// Fix implicitly any type on payload
content = content.replace(
  "(payload) => {",
  "(payload: any) => {"
);

fs.writeFileSync('components/SystemNotifications.tsx', content);
console.log('Fixed TS Error in SystemNotifications');
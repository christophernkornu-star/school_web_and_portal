const fs = require('fs');
let c = fs.readFileSync('components/admin/AdminHeader.tsx', 'utf8');

c = c.replace(
    /new Notification\('Action Required: Term Wrapping Up', \{\s*body: `The term is \$\{progress\}% complete\. Please enter total attendances and student remarks for the term\.`,\s*icon: '\/school_crest\.png'\s*\}\)/,
    "const notificationBody = termRes.data.total_days > 0\n                  ? `The term is ${progress}% complete. Please remind teachers to enter student remarks for the term.`\n                  : `The term is ${progress}% complete. Please enter total attendances and student remarks for the term.`;\n               new Notification('Action Required: Term Wrapping Up', {\n                 body: notificationBody,\n                 icon: '/school_crest.png'\n               })"
);

fs.writeFileSync('components/admin/AdminHeader.tsx', c);

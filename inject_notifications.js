const fs = require('fs');
let content = fs.readFileSync('app/layout.tsx', 'utf8');

// Insert import
if (!content.includes('import SystemNotifications')) {
  content = content.replace(
    "import { Toaster } from 'react-hot-toast'",
    "import { Toaster } from 'react-hot-toast'\nimport SystemNotifications from '@/components/SystemNotifications'"
  );
}

// Insert component
if (!content.includes('<SystemNotifications />')) {
  content = content.replace(
    '<Toaster position="top-right" />',
    '<Toaster position="top-right" />\n          <SystemNotifications />'
  );
}

fs.writeFileSync('app/layout.tsx', content);
console.log('Injected SystemNotifications to layout.tsx');
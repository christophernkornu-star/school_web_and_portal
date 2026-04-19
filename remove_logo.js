const fs = require('fs');

let fileStr = 'app/login/page.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

// The exact block to remove:
let oldBlock = `          {/* School Crest */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-[2rem] p-4 shadow-2xl shadow-methodist-gold/20 border-4 border-methodist-gold/80 overflow-hidden w-32 h-32 md:w-36 md:h-36 relative">
              <Image
                src="/school_crest.png"
                alt="Biriwa Methodist School Crest"
                fill
                className="object-contain p-2"
                sizes="(max-width: 768px) 128px, 144px"
                priority
              />
            </div>
            <h2 className="text-3xl font-bold text-methodist-blue">Portal Login</h2>`;

let newBlock = `          {/* Title Area */}
          <div className="text-center">
            <h2 className="text-3xl font-bold text-methodist-blue">Portal Login</h2>`;

// Because the regex updates might have mangled exactly what's printed vs what was applied, let's just do a string replacement targeting the exact things that are there
let actualOldBlock = content.substring(
    content.indexOf('{/* School Crest */}'),
    content.indexOf('<h2 className="text-3xl') + '<h2 className="text-3xl font-bold text-methodist-blue">Portal Login</h2>'.length
);

content = content.replace(
    actualOldBlock,
    newBlock
);

fs.writeFileSync(fileStr, content);
console.log('Removed logo from login page successfully.');
const fs = require('fs');

let fileStr = 'app/login/page.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

// The school crest container might be clipping the image, or the rounded-full forces a circle constraint 
// on an image that is likely an irregular shield/crest shape. Let's make it a rounded square or remove 
// strict circle properties, and ensure the image scales nicely.

let oldCrest = `<div className="inline-flex items-center justify-center mb-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-full p-3.5 shadow-2xl shadow-methodist-gold/20 border-4 border-methodist-gold/80">`;
let newCrest = `<div className="inline-flex items-center justify-center mb-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-[2rem] p-4 shadow-2xl shadow-methodist-gold/20 border-4 border-methodist-gold/80 overflow-hidden w-32 h-32 md:w-36 md:h-36 relative">`;

content = content.replace(oldCrest, newCrest);

let oldImage = `                <Image
                  src="/school_crest.png"
                  alt="Biriwa Methodist School Crest"
                  width={140}
                  height={140}
                  className="object-contain"
                />`;
let newImage = `                <Image
                  src="/school_crest.png"
                  alt="Biriwa Methodist School Crest"
                  fill
                  className="object-contain p-2"
                  sizes="(max-width: 768px) 128px, 144px"
                  priority
                />`;
                
content = content.replace(oldImage, newImage);


fs.writeFileSync(fileStr, content);
console.log('Fixed logo sizing and container in login page');
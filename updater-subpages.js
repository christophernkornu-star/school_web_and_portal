const fs = require('fs');

const pages = ['app/about/page.tsx', 'app/events/page.tsx', 'app/news/page.tsx', 'app/admission/page.tsx', 'app/gallery/page.tsx'];

pages.forEach(pFile => {
  if (fs.existsSync(pFile)) {
    let content = fs.readFileSync(pFile, 'utf8');
    
    // Replace standard solid banner
    content = content.replace(
      '<section className="methodist-gradient text-white py-16">',
      '<section className="relative overflow-hidden bg-gradient-to-b from-blue-950 to-indigo-950 text-white py-24 md:py-32">\n        <div className="absolute inset-0 bg-[url(\\'/pattern.svg\\')] opacity-10 blur-[1px]"></div>\n        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl mix-blend-screen"></div>'
    );
    
    // Some headers have py-12 instead of py-16
    content = content.replace(
      '<section className="methodist-gradient text-white py-12 md:py-20">',
      '<section className="relative overflow-hidden bg-gradient-to-b from-blue-950 to-indigo-950 text-white py-24 md:py-32">\n        <div className="absolute inset-0 bg-[url(\\'/pattern.svg\\')] opacity-10 blur-[1px]"></div>\n        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl mix-blend-screen"></div>'
    );

    // Make H2 more impactful
    content = content.replace(
      '<h2 className="text-4xl font-bold mb-4">',
      '<h2 className="text-5xl md:text-6xl font-black mb-6 tracking-tight relative z-10">'
    );

    content = content.replace(
      '<h1 className="text-4xl md:text-5xl font-bold mb-4">',
      '<h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight relative z-10">'
    );
    
    // Make text slightly better
    content = content.replace(
      '<p className="text-xl text-gray-200">',
      '<p className="text-xl md:text-2xl text-blue-200 font-medium relative z-10">'
    );

    // Card styling overhauls - let's make lists of cards use nicer shadows and roundings
    content = content.replace(
      /className="bg-white rounded-lg shadow-md/g,
      'className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100'
    );

    content = content.replace(
      /className="bg-white rounded-lg shadow-lg/g,
      'className="bg-white rounded-3xl shadow-xl shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden border border-slate-100'
    );
    
    fs.writeFileSync(pFile, content);
  }
});
console.log('Processed subpages');

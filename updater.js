const fs = require('fs');

// 1. Update SiteHeader
let hFile = 'components/SiteHeader.tsx';
if (fs.existsSync(hFile)) {
  let content = fs.readFileSync(hFile, 'utf8');
  content = content.replace(
    'return (\n    <header className="sticky top-0 z-50 relative overflow-hidden">',
    'return (\n    <header className="sticky top-0 z-50 overflow-hidden bg-white/85 dark:bg-gray-950/85 backdrop-blur-xl shadow-sm border-b border-gray-200/50 dark:border-gray-800/50 transition-all duration-300 w-full">'
  );
  content = content.replace(
    '<div className="bg-gradient-to-r from-methodist-gold via-yellow-500 to-yellow-600 shadow-lg border-b-4 border-yellow-700 w-full">',
    '<div className="w-full">'
  );
  content = content.replace(
    '<h1 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold xl:font-extrabold text-methodist-blue tracking-tight leading-tight drop-shadow-lg">',
    '<h1 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-tight">'
  );
  fs.writeFileSync(hFile, content);
}

// 2. Update Home Page Hero
let pFile = 'app/page.tsx';
if (fs.existsSync(pFile)) {
  let content = fs.readFileSync(pFile, 'utf8');
  content = content.replace(
    '<section className="methodist-gradient text-white py-12 md:py-20">',
    '<section className="relative overflow-hidden bg-gradient-to-b from-blue-950 to-indigo-950 text-white py-20 md:py-32">\n        <div className="absolute inset-0 bg-[url(\'/pattern.svg\')] opacity-10 blur-[1px]"></div>\n        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl mix-blend-screen"></div>\n        '
  );
  content = content.replace(
    '<h2 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">',
    '<h2 className="text-4xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight tracking-tight drop-shadow-md relative z-10">'
  );
  content = content.replace(
    '<p className="text-lg md:text-xl mb-4 text-gray-200">',
    '<p className="text-xl md:text-2xl mb-4 text-blue-200 font-medium tracking-wide relative z-10">'
  );
  content = content.replace(
    '<Link href="/admission" className="bg-ghana-gold text-methodist-blue font-bold py-3 px-8 rounded-lg hover:bg-yellow-300 transition-colors w-full md:w-auto">',
    '<Link href="/admission" className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 font-bold py-3.5 px-8 rounded-full shadow-lg hover:shadow-amber-400/25 hover:-translate-y-1 transition-all duration-300 w-full md:w-auto relative z-10">'
  );
  content = content.replace(
    '<Link href="/about" className="bg-white text-methodist-blue font-bold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors w-full md:w-auto">',
    '<Link href="/about" className="bg-white/10 backdrop-blur text-white border border-white/20 font-bold py-3.5 px-8 rounded-full hover:bg-white/20 hover:-translate-y-1 transition-all duration-300 w-full md:w-auto relative z-10">'
  );
  fs.writeFileSync(pFile, content);
}

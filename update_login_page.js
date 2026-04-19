const fs = require('fs');

let fileStr = 'app/login/page.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

// 1. Container Wrapper for the login
let oldWrapper = `      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-y-auto">
        <div className="max-w-md w-full space-y-8">`;

let newWrapper = `      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Dynamic Orbs background */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-methodist-blue/20 rounded-full blur-[80px] pointer-events-none hidden md:block"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] bg-methodist-gold/20 rounded-full blur-[100px] pointer-events-none hidden md:block"></div>

        <div className="max-w-[28rem] w-full z-10">
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-[0_8px_40px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgb(0,0,0,0.4)] border border-white/50 dark:border-gray-800 transition-all">`;

content = content.replace(oldWrapper, newWrapper);

// 2. Adjust Crest border color and size a bit
let oldCrest = `className="inline-flex items-center justify-center mb-6 bg-white rounded-full p-3 shadow-xl border-4 border-methodist-gold"`;
let newCrest = `className="inline-flex items-center justify-center mb-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-full p-3.5 shadow-2xl shadow-methodist-gold/20 border-4 border-methodist-gold/80"`
content = content.replace(oldCrest, newCrest);

// 3. School Moto text to be a bit cleaner
let oldMoto = `<p className="mt-2 text-sm text-methodist-blue font-bold italic">"Discipline with Hardwork"</p>`;
let newMoto = `<p className="mt-3 text-sm text-methodist-yellow font-bold tracking-wider uppercase bg-methodist-blue/5 dark:bg-methodist-blue/20 py-1.5 px-4 rounded-full inline-block">"Discipline with Hardwork"</p>`;
content = content.replace(oldMoto, newMoto);

// 4. Form background remove since we moved it to the parent wrapper
let oldForm = `<form className="mt-8 space-y-6 bg-white p-8 rounded-lg shadow-lg" onSubmit={handleLogin}>`;
let newForm = `<form className="mt-8 space-y-6" onSubmit={handleLogin}>`;
content = content.replace(oldForm, newForm);

// 5. Input styling fixes
let oldUserInputWrap = `              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>`;
let newUserInputWrap = `              <div>
                <label htmlFor="username" className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                  Username
                </label>`;
content = content.replace(oldUserInputWrap, newUserInputWrap);

let oldPassInputWrap = `              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>`;
let newPassInputWrap = `              <div>
                <label htmlFor="password" className="block text-[13px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wide">
                  Password
                </label>`;
content = content.replace(oldPassInputWrap, newPassInputWrap);

let oldUserInput = `className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent transition-all"`;
let newUserInput = `placeholder="Your username" className="w-full pl-12 pr-4 py-3.5 bg-white/60 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-4 focus:ring-methodist-blue/20 focus:border-methodist-blue transition-all text-gray-900 dark:text-white font-medium placeholder:text-gray-400"`
content = content.replace(oldUserInput, newUserInput);

let oldPassInput = `className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent transition-all"`;
let newPassInput = `placeholder="••••••••" className="w-full pl-12 pr-12 py-3.5 bg-white/60 dark:bg-gray-950/60 border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-4 focus:ring-methodist-blue/20 focus:border-methodist-blue transition-all text-gray-900 dark:text-white font-medium placeholder:text-gray-400"`
content = content.replace(oldPassInput, newPassInput);

// Remove the hardcoded placeholder overlay elements
content = content.replace(/\{!username && \([\s\S]*?\)\}/g, '');
content = content.replace(/\{!password && \([\s\S]*?\)\}/g, '');

// Modernize the login button
let oldBtn = `className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed mt-6"`;
let newBtn = `className="w-full bg-gradient-to-r from-methodist-blue to-blue-800 text-white font-bold text-[15px] py-4 rounded-2xl shadow-lg shadow-methodist-blue/30 hover:shadow-xl hover:-translate-y-0.5 hover:from-blue-800 hover:to-methodist-blue disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-8 transition-all duration-300"`;
content = content.replace(oldBtn, newBtn);

let oldBack = `          <p className="text-center text-sm text-gray-600">
            <Link href="/" className="font-medium text-methodist-blue hover:text-blue-700">
              ← Back to Homepage
            </Link>
          </p>
        </div>
      </div>
      <div className="flex-none">`;

let newBack = `          <p className="text-center text-[14px] text-slate-600 dark:text-slate-400 mt-2">
            <Link href="/" className="font-bold text-methodist-blue hover:text-blue-800 transition-colors flex items-center justify-center gap-2">
              <span className="text-lg">←</span> Back to Homepage
            </Link>
          </p>
          </div> {/* end inner card */}
        </div>
      </div>
      <div className="flex-none">`;
content = content.replace(oldBack, newBack);

fs.writeFileSync(fileStr, content);
console.log('Login logic updated to be super professional!');
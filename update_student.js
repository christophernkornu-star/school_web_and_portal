const fs=require("fs");const path=require("path");function walkDir(r,c){fs.readdirSync(r).forEach(f=>{let d=path.join(r,f);fs.statSync(d).isDirectory()?walkDir(d,c):c(d)})}
walkDir("app/student",function(f){
  if(!f.endsWith(".tsx"))return;
  let o=fs.readFileSync(f,"utf8");
  let c=o;
  
  c=c.replace(/bg-gradient-to-r from-methodist-gold via-yellow-500 to-yellow-600 shadow-lg border-b-4 border-yellow-700/g,"bg-white dark:bg-gray-950 backdrop-blur-xl shadow-sm border-b border-gray-200 dark:border-gray-800");
  c=c.replace(/text-methodist-blue/g, "text-slate-800 dark:text-slate-100");
  c=c.replace(/bg-gradient-to-br from-methodist-blue to-blue-900 text-white rounded-2xl p-6 md:p-10 mb-8 shadow-xl relative overflow-hidden/g,"bg-gradient-to-r from-slate-900 to-blue-900 text-white rounded-[2rem] p-8 md:p-12 mb-8 shadow-2xl shadow-blue-900/20 relative overflow-hidden border border-blue-800/30");
  c=c.replace(/className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 dark:border-gray-700/g,"className=\"bg-white dark:bg-gray-900 rounded-[1.5rem] shadow-lg shadow-gray-200/50 dark:shadow-blue-900/5 hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 border border-gray-100 dark:border-gray-800");
  
  c=c.replace(/className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden"/g,"className=\"bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100/50 dark:border-gray-800/50\"");
  c=c.replace(/className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"/g,"className=\"bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-3xl shadow-xl shadow-gray-200/30 p-8 border border-gray-100/50 dark:border-gray-800/50\"");
  
  c=c.replace(/bg-gray-50/g,"bg-slate-50 dark:bg-gray-950");
  c=c.replace(/rounded-lg/g,"rounded-2xl");
  c=c.replace(/shadow-lg/g,"shadow-xl");
  
  // Specific tweaks
  c=c.replace(/className="text-base md:text-xl font-bold text-slate-800 dark:text-slate-100"/g, "className=\"text-xl md:text-2xl font-black tracking-tight text-slate-850 dark:text-white\"");
  c=c.replace(/className="text-\\[10px\\] md:text-xs text-slate-800 dark:text-slate-100 font-semibold"/g, "className=\"text-xs md:text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1\"");

  if(c!==o){fs.writeFileSync(f,c);console.log("Updated "+f)}
});

const fs = require('fs');
let code = fs.readFileSync('app/teacher/mock/page.tsx', 'utf8');

// The block to replace
const oldPaginationLogic = `                   {/* Pagination Logic */}
                   {(() => {
                        // Adjusted for A4 Landscape. Using exactly 14 rows per page with the larger fonts guarantees a flawless fit
                        const STUDENTS_PER_PAGE = 22;
                        const pages: typeof processedData[] = [];
                        for (let i = 0; i < processedData.length; i += STUDENTS_PER_PAGE) {
                          pages.push(processedData.slice(i, i + STUDENTS_PER_PAGE));
                      }
                      if (pages.length === 0) pages.push([]); // Handle empty case if needed`;

const newPaginationLogic = `                   {/* Pagination Logic */}
                   {(() => {
                        // Dynamic Pagination for A4 Landscape: First page fits 21 items (due to header)
                        // Subsequent pages without header can safely fit 23 items.
                        const FIRST_PAGE_COUNT = 20;
                        const OTHER_PAGE_COUNT = 24;
                        const pages: typeof processedData[] = [];
                        
                        if (processedData.length > 0) {
                            pages.push(processedData.slice(0, FIRST_PAGE_COUNT));
                            for (let i = FIRST_PAGE_COUNT; i < processedData.length; i += OTHER_PAGE_COUNT) {
                                pages.push(processedData.slice(i, i + OTHER_PAGE_COUNT));
                            }
                        } else {
                            pages.push([]); // Handle empty case
                        }`;                      

// Need to make sure the search string is exact, I'll use a regex that matches smoothly
code = code.replace(
  /\{\/\* Pagination Logic \*\/\}\s*\{\(\(\) => \{\s*\/\/ Adjusted for A4 Landscape[^\n]*\s*const STUDENTS_PER_PAGE = 22;\s*const pages: typeof processedData\[\] = \[\];\s*for \(let i = 0; i < processedData.length; i \+= STUDENTS_PER_PAGE\) \{\s*pages\.push\(processedData\.slice\(i, i \+ STUDENTS_PER_PAGE\)\);\s*\}\s*if \(pages\.length === 0\) pages\.push\(\[\]\); \/\/ Handle empty case if needed/,
  newPaginationLogic
);


// Replace the SN math 
code = code.replace(
  /<td className="border border-slate-400 px-1\.5 py-1 text-center">\{pageIndex \* STUDENTS_PER_PAGE \+ idx \+ 1\}<\/td>/,
  '<td className="border border-slate-400 px-1.5 py-1 text-center">{pageIndex === 0 ? idx + 1 : FIRST_PAGE_COUNT + ((pageIndex - 1) * OTHER_PAGE_COUNT) + idx + 1}</td>'
);

fs.writeFileSync('app/teacher/mock/page.tsx', code);
console.log('Update Successful');

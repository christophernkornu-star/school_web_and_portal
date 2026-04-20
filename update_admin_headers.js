const fs = require('fs');

let fileStr = 'app/admin/dashboard/page.tsx';
let content = fs.readFileSync(fileStr, 'utf8');

// 1. Quick Actions Panel
let oldQA = `{/* Quick Actions Panel */}
             <Card className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks used daily</CardDescription>
                </CardHeader>`;
let newQA = `{/* Quick Actions Panel */}
             <Card className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white pb-4">
                  <CardTitle className="text-xl font-bold flex items-center gap-2"><span className="w-1.5 h-6 bg-methodist-gold rounded-full"></span>Quick Actions</CardTitle>
                  <CardDescription className="text-blue-100 ml-3.5">Common tasks used daily</CardDescription>
                </CardHeader>`;

// 2. Recent Activity
let oldRA = `{/* Recent Activity */}
             <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                   <div className="space-y-1">
                     <CardTitle>Recent Activity</CardTitle>
                     <CardDescription>Latest student admissions</CardDescription>
                   </div>
                   <Link href="/admin/students" className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline">View All</Link>
                </CardHeader>`;
let newRA = `{/* Recent Activity */}
             <Card className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-4 pt-5 bg-gradient-to-r from-methodist-blue to-blue-800 text-white">
                   <div className="space-y-1">
                     <CardTitle className="text-xl font-bold flex items-center gap-2"><span className="w-1.5 h-6 bg-methodist-gold rounded-full"></span>Recent Activity</CardTitle>
                     <CardDescription className="text-blue-100 ml-3.5">Latest student admissions</CardDescription>
                   </div>
                   <Link href="/admin/students" className="text-sm font-bold text-methodist-gold hover:text-yellow-300 hover:underline">View All</Link>
                </CardHeader>`;

// 3. Upcoming Events
let oldUE = `{/* Upcoming Events Mini */}
             <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="w-5 h-5 text-red-600" />
                      Upcoming Events
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">`;
let newUE = `{/* Upcoming Events Mini */}
             <Card className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden h-fit">
                 <CardHeader className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white pb-4">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                      <CalendarDays className="w-5 h-5 text-methodist-gold" />
                      Upcoming Events
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4 pt-5">`;

let failed = false;

if (content.includes('{/* Quick Actions Panel */}')) {
    content = content.replace(
        /\{\/\* Quick Actions Panel \*\/\}\s*<Card className="border border-white\/40 shadow-\[0_8px_30px_rgb\(0,0,0,0\.04\)\] bg-white\/60 backdrop-blur-xl rounded-3xl">\s*<CardHeader>\s*<CardTitle>Quick Actions<\/CardTitle>\s*<CardDescription>Common tasks used daily<\/CardDescription>\s*<\/CardHeader>/,
        newQA
    );
} else {
    failed = true;
    console.log("Could not match Quick Actions properly");
}

if (content.includes('{/* Recent Activity */}')) {
    content = content.replace(
        /\{\/\* Recent Activity \*\/\}\s*<Card>\s*<CardHeader className="flex flex-row items-center justify-between pb-2">\s*<div className="space-y-1">\s*<CardTitle>Recent Activity<\/CardTitle>\s*<CardDescription>Latest student admissions<\/CardDescription>\s*<\/div>\s*<Link href="\/admin\/students" className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline">View All<\/Link>\s*<\/CardHeader>/,
        newRA
    );
} else {
    failed = true;
    console.log("Could not match Recent Activity properly");
}

if (content.includes('{/* Upcoming Events Mini */}')) {
    content = content.replace(
        /\{\/\* Upcoming Events Mini \*\/\}\s*<Card>\s*<CardHeader>\s*<CardTitle className="flex items-center gap-2">\s*<CalendarDays className="w-5 h-5 text-red-600" \/>\s*Upcoming Events\s*<\/CardTitle>\s*<\/CardHeader>\s*<CardContent className="space-y-4">/,
        newUE
    );
} else {
    failed = true;
    console.log("Could not match Upcoming Events properly");
}

if (!failed) {
    fs.writeFileSync(fileStr, content);
    console.log("Admin headers successfully updated to Methodist brand style.");
}

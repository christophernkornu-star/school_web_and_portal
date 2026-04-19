const fs = require('fs');

let file = 'app/student/performance/page.tsx';
let data = fs.readFileSync(file, 'utf8');

// Replace the old boring colors with a modern Tailwind-inspired palette that's friendly and accessible to all ages
let oldColors = `  const colors = [
    '#003366', '#0066CC', '#3399FF', '#66B2FF', '#99CCFF',
    '#9933FF', '#CC66FF', '#FF6699', '#FF9933', '#FFCC33'
  ]`;
let newColors = `  // Modern, high-contrast accessible color palette for younger and older students
  const colors = [
    '#3b82f6', // Blueprint
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Rose/Red
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#0ea5e9', // Sky Blue
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#6366f1'  // Indigo
  ]`;

data = data.replace(oldColors, newColors);

// Update AreaChart
let oldArea = `<CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="term" tick={{ fill: '#666', fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      border: 'none',
                      fontSize: '12px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <ReferenceLine y={50} stroke="#ff6b6b" strokeDasharray="5 5" label={{ value: 'Pass Mark', fill: '#ff6b6b', fontSize: 10 }} />
                  <ReferenceLine y={75} stroke="#51cf66" strokeDasharray="5 5" label={{ value: 'Good', fill: '#51cf66', fontSize: 10 }} />
                  {subjectPerformance.map((subject, index) => (
                    <Area
                      key={subject.subject}
                      type="monotoneX"
                      dataKey={subject.subject}
                      stroke={colors[index % colors.length]}
                      strokeWidth={3}
                      fill={\`url(#gradient-\${index})\`}
                      dot={{ r: 5, fill: colors[index % colors.length], strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8, fill: colors[index % colors.length], strokeWidth: 2, stroke: '#fff' }}
                    />
                  ))}`;

let newArea = `<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="term" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                  <Tooltip 
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: '#334155',
                      padding: '12px'
                    }}
                    itemStyle={{ paddingBottom: '4px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 600, color: '#475569', paddingTop: '20px' }} />
                  <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Pass Mark (50)', fill: '#ef4444', fontSize: 11, fontWeight: 'bold', position: 'insideTopLeft' }} />
                  <ReferenceLine y={75} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: 'Excellent (75)', fill: '#10b981', fontSize: 11, fontWeight: 'bold', position: 'insideTopLeft' }} />
                  {subjectPerformance.map((subject, index) => (
                    <Area
                      key={subject.subject}
                      type="monotone"
                      dataKey={subject.subject}
                      stroke={colors[index % colors.length]}
                      strokeWidth={4}
                      fill={\`url(#gradient-\${index})\`}
                      dot={{ r: 4, fill: '#fff', strokeWidth: 3, stroke: colors[index % colors.length] }}
                      activeDot={{ r: 8, fill: colors[index % colors.length], strokeWidth: 3, stroke: '#fff' }}
                    />
                  ))}`;

data = data.replace(oldArea, newArea);

// Update BarChart
let oldBar = `<CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="term" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  {subjectPerformance.map((subject, index) => (
                    <Bar
                      key={subject.subject}
                      dataKey={subject.subject}
                      fill={colors[index % colors.length]}
                    />
                  ))}`;

let newBar = `<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="term" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      padding: '12px'
                    }} 
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: 600, color: '#475569', paddingTop: '20px' }} />
                  {subjectPerformance.map((subject, index) => (
                    <Bar
                      key={subject.subject}
                      dataKey={subject.subject}
                      fill={colors[index % colors.length]}
                      radius={[6, 6, 0, 0]}
                      barSize={subjectPerformance.length > 5 ? 8 : 16}
                    />
                  ))}`;

data = data.replace(oldBar, newBar);

// Update RadarChart
let oldRadar = `<PolarGrid />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar
                    name="Latest Scores"
                    dataKey="score"
                    stroke="#003366"
                    fill="#003366"
                    fillOpacity={0.6}
                  />
                  <Tooltip contentStyle={{ fontSize: '12px' }} />`;

let newRadar = `<PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Radar
                    name="Latest Scores"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      borderRadius: '12px',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: '#334155',
                      padding: '10px'
                    }} 
                  />`;

data = data.replace(oldRadar, newRadar);

fs.writeFileSync(file, data);
console.log('Successfully updated the charts for accessibility and modern design.');

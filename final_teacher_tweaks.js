const fs = require('fs');

let dFile = 'app/teacher/dashboard/page.tsx';
let dContent = fs.readFileSync(dFile, 'utf8');

// Notice Board height fix
dContent = dContent.replace(
    /flex flex-col min-h-\[450px\]"/g,
    'flex flex-col h-[500px] lg:h-[600px]"'
);

// Marquee container absolute -> relative block
dContent = dContent.replace(
    /<div className="absolute inset-x-6 top-0 bottom-0 overflow-hidden mask-image-vertical px-2">/g,
    '<div className="h-full w-full relative overflow-hidden mask-image-vertical px-2 py-2">'
);

// Profile Summary padding to make it flush
dContent = dContent.replace(
    /<CardContent className="p-6 pt-5">/g,
    '<CardContent className="p-6">'
);

fs.writeFileSync(dFile, dContent);
console.log('Teacher Dashboard fix applied.');

// Performance Chart
let cFile = 'components/PerformanceChart.tsx';
let cContent = fs.readFileSync(cFile, 'utf8');

// Fix empty state double borders
cContent = cContent.replace(
    /<div className=\{\`bg-white rounded-lg border border-gray-200 \$\{className\}\`\}>/g,
    '<div className={`${className || "bg-white rounded-lg border border-gray-200"}`}>\n        <div className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white px-5 py-4 mb-4">\n          <h3 className="text-xl font-bold flex items-center gap-2"><span className="w-1.5 h-6 bg-methodist-gold rounded-full"></span>{title}</h3>\n        </div>'
);

// I already have the inner gradients, so let's reset it totally
cContent = `
'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface PerformanceDataPoint {
  termName: string
  score: number
  maxScore?: number
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[]
  title: string
  lineColor?: string
  showMaxScore?: boolean
  primaryLineName?: string
  secondaryLineName?: string
  className?: string
}

export default function PerformanceChart({ 
  data, 
  title, 
  lineColor = '#1e40af',
  showMaxScore = false,
  primaryLineName = "Your Score",
  secondaryLineName = "Class Average",
  className = ""
}: PerformanceChartProps) {
  if (!data || data.length < 2) {
    return (
      <div className={\`\${className || "bg-white rounded-lg border border-gray-200 p-6"}\`}>
        <div className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white px-5 py-4 mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2"><span className="w-1.5 h-6 bg-methodist-gold rounded-full"></span>{title}</h3>
        </div>
        <div className="flex items-center justify-center min-h-[250px] text-gray-500 pb-6">
          <p>Performance trends will appear after 2 or more terms</p>
        </div>
      </div>
    )
  }

  return (
    <div className={\`\${className || "bg-white rounded-lg border border-gray-200"}\`}>
      <div className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white px-5 py-4 mb-4">
         <h3 className="text-xl font-bold flex items-center gap-2"><span className="w-1.5 h-6 bg-methodist-gold rounded-full"></span>{title}</h3>
      </div>
      <div className="px-6 pb-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="termName" 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px'
              }}
              formatter={(value: number, name: string) => [\`\${value.toFixed(1)}%\`, name]}
            />
            <Legend 
              wrapperStyle={{ fontSize: '14px' }}
            />
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke={lineColor} 
              strokeWidth={3}
              dot={{ fill: lineColor, r: 5 }}
              activeDot={{ r: 7 }}
              name={primaryLineName}
            />
            {showMaxScore && (
              <Line 
                type="monotone" 
                dataKey="maxScore" 
                stroke="#9ca3af" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#9ca3af', r: 3 }}
                name={secondaryLineName}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
`;

fs.writeFileSync(cFile, cContent);
console.log('Chart fixed.');

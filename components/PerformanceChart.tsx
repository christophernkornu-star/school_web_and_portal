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
      <div className={`${className || "bg-white rounded-lg border border-gray-200 p-6"}`}>
        <div className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white px-5 py-4 mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span className="w-1.5 h-6 bg-methodist-gold rounded-full"></span>
            {title}
          </h3>
        </div>
        <div className="flex items-center justify-center min-h-[250px] text-gray-500 px-6 sm:px-10 py-8 text-center">
          <p className="max-w-md leading-relaxed">
            Performance trends will appear after 2 or more terms
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className || "bg-white rounded-lg border border-gray-200"}`}>
      <div className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white px-5 py-4 mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <span className="w-1.5 h-6 bg-methodist-gold rounded-full"></span>
          {title}
        </h3>
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
              formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
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
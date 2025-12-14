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
}

export default function PerformanceChart({ 
  data, 
  title, 
  lineColor = '#1e40af',
  showMaxScore = false 
}: PerformanceChartProps) {
  if (!data || data.length < 2) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>Performance trends will appear after 2 or more terms</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
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
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
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
            name="Your Score"
          />
          {showMaxScore && (
            <Line 
              type="monotone" 
              dataKey="maxScore" 
              stroke="#9ca3af" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#9ca3af', r: 3 }}
              name="Class Average"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

import React from 'react'
import { format } from 'date-fns'

interface ClassFeeReportProps {
  className: string
  students: any[]
  feeStructures: any[]
  payments: any[]
}

export const ClassFeeReport = React.forwardRef<HTMLDivElement, ClassFeeReportProps>(({ className, students, feeStructures, payments }, ref) => {
  // Calculate totals for the whole class
  const totalClassBill = students.length * feeStructures.reduce((sum, f) => sum + Number(f.amount), 0)
  const totalClassPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
  const totalClassOutstanding = totalClassBill - totalClassPaid

  return (
    <div ref={ref} className="p-8 bg-white text-black print:p-8">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wide mb-2">Biriwa Methodist 'C' Basic School</h1>
        <h2 className="text-xl font-bold uppercase">Class Fee Report</h2>
        <div className="flex justify-center gap-8 mt-4 text-sm font-medium text-gray-600">
          <p>Class: <span className="text-black font-bold">{className}</span></p>
          <p>Date: <span className="text-black font-bold">{format(new Date(), 'dd MMM yyyy')}</span></p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="border border-gray-300 p-4 rounded text-center bg-gray-50">
          <p className="text-xs uppercase text-gray-500 mb-1">Total Expected</p>
          <p className="text-lg font-bold">GH₵ {totalClassBill.toFixed(2)}</p>
        </div>
        <div className="border border-green-200 p-4 rounded text-center bg-green-50">
          <p className="text-xs uppercase text-green-600 mb-1">Total Collected</p>
          <p className="text-lg font-bold text-green-700">GH₵ {totalClassPaid.toFixed(2)}</p>
        </div>
        <div className="border border-red-200 p-4 rounded text-center bg-red-50">
          <p className="text-xs uppercase text-red-600 mb-1">Outstanding</p>
          <p className="text-lg font-bold text-red-700">GH₵ {totalClassOutstanding.toFixed(2)}</p>
        </div>
      </div>

      {/* Student List Table */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 border-b-2 border-gray-300">
            <th className="p-2 text-left font-semibold border border-gray-300 w-12">S/N</th>
            <th className="p-2 text-left font-semibold border border-gray-300">Student Name</th>
            <th className="p-2 text-left font-semibold border border-gray-300">Student ID</th>
            <th className="p-2 text-right font-semibold border border-gray-300">Bill (GH₵)</th>
            <th className="p-2 text-right font-semibold border border-gray-300">Paid (GH₵)</th>
            <th className="p-2 text-right font-semibold border border-gray-300">Balance (GH₵)</th>
            <th className="p-2 text-center font-semibold border border-gray-300">Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, index) => {
            // Calculate individual stats
            const studentBill = feeStructures.reduce((sum, f) => sum + Number(f.amount), 0)
            const studentPayments = payments.filter(p => p.student_id === student.id)
            const studentPaid = studentPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
            const studentBalance = studentBill - studentPaid
            
            let status = 'Unpaid'
            if (studentBalance <= 0) status = 'Paid'
            else if (studentPaid > 0) status = 'Partial'

            return (
              <tr key={student.id} className="border-b border-gray-200">
                <td className="p-2 border border-gray-300 text-center">{index + 1}</td>
                <td className="p-2 border border-gray-300 font-medium">
                  {student.last_name} {student.first_name}
                </td>
                <td className="p-2 border border-gray-300 font-mono text-xs">{student.student_id}</td>
                <td className="p-2 border border-gray-300 text-right">{studentBill.toFixed(2)}</td>
                <td className="p-2 border border-gray-300 text-right">{studentPaid.toFixed(2)}</td>
                <td className="p-2 border border-gray-300 text-right font-bold text-red-600">
                  {studentBalance > 0 ? studentBalance.toFixed(2) : '-'}
                </td>
                <td className="p-2 border border-gray-300 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    status === 'Paid' ? 'bg-green-100 text-green-800' :
                    status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {status}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
        Generated on {format(new Date(), 'PPP p')}
      </div>
    </div>
  )
})

ClassFeeReport.displayName = 'ClassFeeReport'

import React from 'react'
import { format } from 'date-fns'

interface ClassFeeReportProps {
  className: string
  academicYear: string
  termName: string
  students: any[]
  feeStructures: any[]
  payments: any[]
}

export const ClassFeeReport = React.forwardRef<HTMLDivElement, ClassFeeReportProps>(({ className, academicYear, termName, students, feeStructures, payments }, ref) => {
  // Calculate totals for the whole class
  const totalClassBill = students.length * feeStructures.reduce((sum, f) => sum + Number(f.amount), 0)
  const totalClassPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
  const totalClassOutstanding = totalClassBill - totalClassPaid

  return (
    <div ref={ref} className="p-4 lg:p-8 bg-white dark:bg-gray-800 text-black dark:text-white print:p-8 max-w-3xl mx-auto w-full overflow-hidden">
      {/* Header */}
      <div className="mb-6 lg:mb-8 border-b-2 border-gray-800 dark:border-gray-600 pb-4 lg:pb-6">
        <div className="flex flex-col items-center gap-3 text-center print:text-left">
          <div>
            <h1 className="text-lg md:text-2xl font-bold uppercase mb-2 break-words px-2 leading-tight">Biriwa Methodist 'C' Basic School</h1>
            <h2 className="text-base md:text-xl font-bold uppercase break-words px-2">Class Fee Report</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400 px-2 w-full max-w-4xl">
            <p className="break-words"><span className="block font-semibold text-black dark:text-white">Class</span>{className}</p>
            <p className="break-words"><span className="block font-semibold text-black dark:text-white">Academic Year</span>{academicYear}</p>
            <p className="break-words"><span className="block font-semibold text-black dark:text-white">Term</span>{termName || 'Selected Term'}</p>
            <p className="break-words"><span className="block font-semibold text-black dark:text-white">Date</span><span suppressHydrationWarning>{format(new Date(), 'dd MMM yyyy')}</span></p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 lg:mb-8 text-sm print:text-xs max-w-2xl mx-auto">
        <div className="border border-gray-300 dark:border-gray-600 px-3 py-3 sm:px-4 sm:py-4 rounded text-center bg-gray-50 dark:bg-gray-700 sm:col-span-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400 mb-1">Total Expected</p>
          <p className="text-base sm:text-lg font-bold">GH₵ {totalClassBill.toFixed(2)}</p>
        </div>
        <div className="border border-green-200 dark:border-green-800 px-3 py-3 sm:px-4 sm:py-4 rounded text-center bg-green-50 dark:bg-green-900/20">
          <p className="text-[10px] uppercase tracking-[0.16em] text-green-600 dark:text-green-400 mb-1">Total Collected</p>
          <p className="text-base sm:text-lg font-bold text-green-700 dark:text-green-400">GH₵ {totalClassPaid.toFixed(2)}</p>
        </div>
        <div className="border border-red-200 dark:border-red-800 px-3 py-3 sm:px-4 sm:py-4 rounded text-center bg-red-50 dark:bg-red-900/20">
          <p className="text-[10px] uppercase tracking-[0.16em] text-red-600 dark:text-red-400 mb-1">Outstanding</p>
          <p className="text-base sm:text-lg font-bold text-red-700 dark:text-red-400">GH₵ {totalClassOutstanding.toFixed(2)}</p>
        </div>
      </div>

      {/* Student List Table (Desktop + Print) */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] print:text-[10px] border-collapse min-w-full">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600">
              <th className="p-2 print:p-1 text-left font-semibold border border-gray-300 dark:border-gray-600 w-10">S/N</th>
              <th className="p-2 print:p-1 text-left font-semibold border border-gray-300 dark:border-gray-600">Student Name</th>
              <th className="p-2 print:p-1 text-left font-semibold border border-gray-300 dark:border-gray-600 w-28">Student ID</th>
              <th className="p-2 print:p-1 text-right font-semibold border border-gray-300 dark:border-gray-600 w-24">Bill</th>
              <th className="p-2 print:p-1 text-right font-semibold border border-gray-300 dark:border-gray-600 w-24">Paid</th>
              <th className="p-2 print:p-1 text-right font-semibold border border-gray-300 dark:border-gray-600 w-24">Balance</th>
              <th className="p-2 print:p-1 text-center font-semibold border border-gray-300 dark:border-gray-600 w-24">Status</th>
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
                <tr key={student.id} className="border-b border-gray-200 dark:border-gray-700">
                  <td className="p-2 print:p-1 border border-gray-300 dark:border-gray-600 text-center">{index + 1}</td>
                  <td className="p-2 print:p-1 border border-gray-300 dark:border-gray-600 font-medium leading-tight">
                    {student.last_name} {student.middle_name ? `${student.middle_name} ` : ''}{student.first_name}
                  </td>
                  <td className="p-2 print:p-1 border border-gray-300 dark:border-gray-600 font-mono text-[10px]">{student.student_id}</td>
                  <td className="p-2 print:p-1 border border-gray-300 dark:border-gray-600 text-right">{studentBill.toFixed(2)}</td>
                  <td className="p-2 print:p-1 border border-gray-300 dark:border-gray-600 text-right">{studentPaid.toFixed(2)}</td>
                  <td className="p-2 print:p-1 border border-gray-300 dark:border-gray-600 text-right font-bold text-red-600 dark:text-red-400">
                    {studentBalance > 0 ? studentBalance.toFixed(2) : '-'}
                  </td>
                  <td className="p-2 print:p-1 border border-gray-300 dark:border-gray-600 text-center">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      status === 'Partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden print:hidden space-y-4">
        {students.map((student, index) => {
          const studentBill = feeStructures.reduce((sum, f) => sum + Number(f.amount), 0)
          const studentPayments = payments.filter(p => p.student_id === student.id)
          const studentPaid = studentPayments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
          const studentBalance = studentBill - studentPaid
          
          let status = 'Unpaid'
          if (studentBalance <= 0) status = 'Paid'
          else if (studentPaid > 0) status = 'Partial'

          return (
            <div key={student.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-base">
                    {student.last_name} {student.first_name}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{student.student_id}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  status === 'Paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                  status === 'Partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                }`}>
                  {status}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-sm border-t border-gray-200 dark:border-gray-600 pt-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase">Bill</p>
                  <p className="font-medium">{studentBill.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase">Paid</p>
                  <p className="font-medium">{studentPaid.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase">Bal</p>
                  <p className={`font-bold ${studentBalance > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                    {studentBalance > 0 ? studentBalance.toFixed(2) : '-'}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400" suppressHydrationWarning>
        Generated on {format(new Date(), 'PPP p')}
      </div>
    </div>
  )
})

ClassFeeReport.displayName = 'ClassFeeReport'

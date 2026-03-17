import React from 'react'
import { format } from 'date-fns'

interface FeeStatementProps {
  student: any
  feeStructures: any[]
  payments: any[]
  className?: string
}

export const FeeStatement = React.forwardRef<HTMLDivElement, FeeStatementProps>(({ student, feeStructures, payments, className }, ref) => {
  // Calculate totals
  const totalFees = feeStructures.reduce((sum, f) => sum + Number(f.amount), 0)
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount_paid), 0)
  const balance = totalFees - totalPaid

  // Sort payments by date
  const sortedPayments = [...payments].sort((a, b) => 
    new Date(b.payment_date || b.created_at).getTime() - new Date(a.payment_date || a.created_at).getTime()
  )

  return (
    <div ref={ref} className={`p-8 bg-white text-black print:p-8 ${className || ''}`}>
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
        <h1 className="text-3xl font-bold uppercase tracking-wide mb-2">Biriwa Methodist 'C' Basic School</h1>
        <p className="text-sm font-medium text-gray-600">P.O. Box 123, Biriwa, Central Region</p>
        <p className="text-sm font-medium text-gray-600">Tel: +233 50 123 4567 | Email: info@biriwaschool.edu.gh</p>
        <div className="mt-6 inline-block border-2 border-gray-800 px-6 py-2">
          <h2 className="text-xl font-bold uppercase">Student Fee Statement</h2>
        </div>
      </div>

      {/* Student Info */}
      <div className="flex justify-between mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div>
          <div className="mb-2">
            <span className="text-gray-500 text-sm uppercase tracking-wider">Student Name</span>
            <p className="font-bold text-lg">{student?.last_name} {student?.first_name}</p>
          </div>
          <div>
            <span className="text-gray-500 text-sm uppercase tracking-wider">Student ID</span>
            <p className="font-mono font-medium">{student?.student_id}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="mb-2">
            <span className="text-gray-500 text-sm uppercase tracking-wider">Class</span>
            <p className="font-bold text-lg">{student?.classes?.name || 'N/A'}</p>
          </div>
          <div>
            <span className="text-gray-500 text-sm uppercase tracking-wider">Date</span>
            <p className="font-medium" suppressHydrationWarning>{format(new Date(), 'dd MMM yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-8">
        <h3 className="font-bold text-gray-800 border-b border-gray-300 mb-4 pb-2 uppercase text-sm tracking-wider">Financial Summary</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Total Fees Payable</p>
            <p className="font-bold text-xl text-gray-800">GH₵ {totalFees.toFixed(2)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
            <p className="text-green-600 text-xs uppercase tracking-wider mb-1">Total Paid</p>
            <p className="font-bold text-xl text-green-700">GH₵ {totalPaid.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
            <p className="text-red-600 text-xs uppercase tracking-wider mb-1">Outstanding Balance</p>
            <p className="font-bold text-xl text-red-700">GH₵ {balance.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="mb-8">
        <h3 className="font-bold text-gray-800 border-b border-gray-300 mb-4 pb-2 uppercase text-sm tracking-wider">Fee Breakdown</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
              <th className="p-3 text-left font-semibold">Fee Description</th>
              <th className="p-3 text-right font-semibold">Amount (GH₵)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {feeStructures.map((fee, index) => (
              <tr key={index}>
                <td className="p-3 text-gray-800">{fee.fee_types?.name}</td>
                <td className="p-3 text-right font-medium text-gray-800">{Number(fee.amount).toFixed(2)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-bold">
              <td className="p-3 text-right text-gray-600 uppercase text-xs">Total Payable</td>
              <td className="p-3 text-right text-gray-900">{totalFees.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment History */}
      <div className="mb-12">
        <h3 className="font-bold text-gray-800 border-b border-gray-300 mb-4 pb-2 uppercase text-sm tracking-wider">Payment History</h3>
        {sortedPayments.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500 italic">
            No payments recorded yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-xs">
                <th className="p-3 text-left font-semibold">Date</th>
                <th className="p-3 text-left font-semibold">Fee Type</th>
                <th className="p-3 text-left font-semibold">Method</th>
                <th className="p-3 text-left font-semibold">Recorded By</th>
                <th className="p-3 text-right font-semibold">Amount (GH₵)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedPayments.map((payment, index) => (
                <tr key={index}>
                  <td className="p-3 text-gray-800">{format(new Date(payment.payment_date || payment.created_at), 'dd MMM yyyy')}</td>
                  <td className="p-3 text-gray-800">{payment.fee_structures?.fee_types?.name || 'Unknown'}</td>
                  <td className="p-3 text-gray-600">{payment.payment_method}</td>
                  <td className="p-3 text-gray-600 text-xs">{payment.profiles?.full_name || '-'}</td>
                  <td className="p-3 text-right font-medium text-green-600">{Number(payment.amount_paid).toFixed(2)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td colSpan={4} className="p-3 text-right text-gray-600 uppercase text-xs">Total Paid</td>
                <td className="p-3 text-right text-green-700">{totalPaid.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-8 border-t border-gray-200 text-center">
        <p className="text-xs text-gray-500 mb-1">This is a computer-generated document. No signature is required.</p>
        <p className="text-xs text-gray-400" suppressHydrationWarning>Generated on {format(new Date(), 'PPP p')}</p>
      </div>
    </div>
  )
})

FeeStatement.displayName = 'FeeStatement'

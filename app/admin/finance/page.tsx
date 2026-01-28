'use client'

import BackButton from '@/components/ui/BackButton'
import Link from 'next/link'
import { ArrowLeft, Settings, DollarSign, CreditCard, PieChart, TrendingUp } from 'lucide-react'

export default function FinanceDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center space-x-4">
            <BackButton href="/admin/dashboard" />
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-800">Finance Management</h1>
              <p className="text-xs md:text-sm text-gray-600">Manage school fees and payments</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          
          {/* Fee Setup Card */}
          <Link href="/admin/finance/setup" className="group">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-all h-full border-l-4 border-purple-500">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-purple-100 p-3 rounded-lg group-hover:bg-purple-200 transition-colors">
                  <Settings className="w-8 h-8 text-purple-600" />
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">Fee Setup</h3>
              <p className="text-sm md:text-base text-gray-600">
                Define fee types (Tuition, PTA, etc.) and set amounts for each class and term.
              </p>
              <div className="mt-4 text-purple-600 font-medium flex items-center">
                Configure Fees <span className="ml-2">→</span>
              </div>
            </div>
          </Link>

          {/* Fee Collection Card */}
          <Link href="/admin/finance/collection" className="group">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-all h-full border-l-4 border-green-500">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-green-100 p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">Fee Collection</h3>
              <p className="text-sm md:text-base text-gray-600">
                Record payments from students, view outstanding balances, and payment history.
              </p>
              <div className="mt-4 text-green-600 font-medium flex items-center">
                Collect Fees <span className="ml-2">→</span>
              </div>
            </div>
          </Link>

          {/* Reports Card (Link to existing reports or placeholder) */}
          <Link href="/admin/reports/financial" className="group">
            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-all h-full border-l-4 border-yellow-500">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-yellow-100 p-3 rounded-lg group-hover:bg-yellow-200 transition-colors">
                  <PieChart className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">Financial Reports</h3>
              <p className="text-sm md:text-base text-gray-600">
                View daily collections, outstanding debts, and generate financial statements.
              </p>
              <div className="mt-4 text-yellow-600 font-medium flex items-center">
                View Reports <span className="ml-2">→</span>
              </div>
            </div>
          </Link>

        </div>
      </main>
    </div>
  )
}

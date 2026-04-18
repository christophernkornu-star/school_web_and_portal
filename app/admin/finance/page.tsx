'use client'

import BackButton from '@/components/ui/back-button'
import Link from 'next/link'
import { Settings, DollarSign, PieChart, ArrowRight, LineChart, Wallet, CreditCard, Activity } from 'lucide-react'

export default function FinanceDashboard() {
  return (
    <div className="bg-gray-50/50 min-h-screen pb-20 font-sans">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-emerald-50/60 to-transparent pointer-events-none"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <BackButton href="/admin" className="shadow-sm" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <Wallet className="w-8 h-8 text-emerald-600" />
                Finance Management
              </h1>
              <p className="text-sm sm:text-base text-gray-500 font-medium mt-1">
                Oversee school fees, manage payments, and generate revenue reports
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50/80 px-4 py-2 rounded-xl border border-emerald-100/50 shadow-sm relative z-10">
            <Activity className="w-4 h-4 text-emerald-500" />
            Finance Module
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl">
          
          {/* Fee Setup Card */}
          <Link href="/admin/finance/setup" className="group h-full">
            <div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-8 h-full relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-indigo-200">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-indigo-50 blur-[40px] opacity-60 group-hover:bg-indigo-100 transition-colors"></div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                  <Settings className="w-7 h-7" />
                </div>
                
                <h3 className="text-xl font-black text-gray-900 mb-2">Fee configuration</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8 flex-1">
                  Define fee types such as Tuition, PTA, and other charges. Set specific amounts per academic term and class level.
                </p>
                
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-600 group-hover:text-indigo-700 mt-auto">
                  Configure Settings
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

          {/* Fee Collection Card */}
          <Link href="/admin/finance/collection" className="group h-full">
            <div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-8 h-full relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-200">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-emerald-50 blur-[40px] opacity-60 group-hover:bg-emerald-100 transition-colors"></div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                  <DollarSign className="w-7 h-7" />
                </div>
                
                <h3 className="text-xl font-black text-gray-900 mb-2">Payment Collection</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8 flex-1">
                  Record incoming transactions, monitor outstanding student balances, issue receipts, and track complete payment history.
                </p>
                
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-600 group-hover:text-emerald-700 mt-auto">
                  Process Payments
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

          {/* Reports Card */}
          <Link href="/admin/reports/financial" className="group h-full">
            <div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 p-8 h-full relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-amber-200">
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-amber-50 blur-[40px] opacity-60 group-hover:bg-amber-100 transition-colors"></div>
              
              <div className="relative z-10 flex flex-col h-full">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                  <PieChart className="w-7 h-7" />
                </div>
                
                <h3 className="text-xl font-black text-gray-900 mb-2">Revenue Analytics</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-8 flex-1">
                  Generate detailed financial statements. View daily collection graphs, revenue forecasts, and outstanding debt summaries.
                </p>
                
                <div className="flex items-center gap-2 text-sm font-bold text-amber-600 group-hover:text-amber-700 mt-auto">
                  View Analytics
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Save, AlertCircle, Check, DollarSign, X } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function FeeSetupPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [feeTypes, setFeeTypes] = useState<any[]>([])
  const [feeStructures, setFeeStructures] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  
  // Form states
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [showStructureModal, setShowStructureModal] = useState(false)
  const [newType, setNewType] = useState({ name: '', description: '' })
  const [newStructure, setNewStructure] = useState({
    fee_type_id: '',
    class_ids: [] as string[],
    term_id: '',
    amount: '',
    academic_year: ''
  })
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load Fee Types
      const { data: types } = await supabase
        .from('fee_types')
        .select('*')
        .order('name')
      setFeeTypes(types || [])

      // Load Classes
      const { data: cls } = await supabase
        .from('classes')
        .select('id, name')
        .order('name')
      setClasses(cls || [])

      // Load Terms
      const { data: trms } = await supabase
        .from('academic_terms')
        .select('*')
        .order('start_date', { ascending: false })
      setTerms(trms || [])

      // Load Fee Structures
      const { data: structs } = await supabase
        .from('fee_structures')
        .select(`
          *,
          fee_types (name),
          classes (name),
          academic_terms (name, academic_year)
        `)
        .order('created_at', { ascending: false })
      setFeeStructures(structs || [])

      // Set default academic year from current term
      const currentTerm = trms?.find((t: any) => t.is_current)
      if (currentTerm) {
        setNewStructure(prev => ({
          ...prev,
          term_id: currentTerm.id,
          academic_year: currentTerm.academic_year
        }))
      }

    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddType = async () => {
    if (!newType.name) return
    
    const { error } = await supabase
      .from('fee_types')
      .insert(newType)
    
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Fee type added successfully' })
      setShowTypeModal(false)
      setNewType({ name: '', description: '' })
      loadData()
    }
  }

  const handleDeleteType = async (id: string) => {
    if (!confirm('Are you sure? This will delete the fee type and all associated structures.')) return

    const { error } = await supabase
      .from('fee_types')
      .delete()
      .eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Fee type deleted successfully' })
      loadData()
    }
  }

  const handleAddStructure = async () => {
    if (!newStructure.fee_type_id || !newStructure.amount || newStructure.class_ids.length === 0) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    const inserts = newStructure.class_ids.map(classId => ({
      fee_type_id: newStructure.fee_type_id,
      class_id: classId,
      term_id: newStructure.term_id,
      amount: newStructure.amount,
      academic_year: newStructure.academic_year
    }))

    const { error } = await supabase
      .from('fee_structures')
      .insert(inserts)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Fee structures created successfully' })
      setShowStructureModal(false)
      // Reset form but keep term/year
      setNewStructure(prev => ({
        ...prev,
        fee_type_id: '',
        class_ids: [],
        amount: ''
      }))
      loadData()
    }
  }

  const handleDeleteStructure = async (id: string) => {
    if (!confirm('Are you sure? This will delete the fee structure.')) return

    const { error } = await supabase
      .from('fee_structures')
      .delete()
      .eq('id', id)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Deleted successfully' })
      loadData()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard" className="text-purple-600 hover:text-purple-700">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Fee Setup</h1>
              <p className="text-xs md:text-sm text-gray-600">Manage fee types and amounts per class</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
            <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Fee Types */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base md:text-lg font-bold text-gray-800">Fee Types</h2>
                <button 
                  onClick={() => setShowTypeModal(true)}
                  className="p-2 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-3">
                {feeTypes.map(type => (
                  <div key={type.id} className="p-3 border rounded-lg hover:bg-gray-50 flex justify-between items-start group">
                    <div>
                      <div className="font-medium text-gray-800 text-xs md:text-base">{type.name}</div>
                      {type.description && <div className="text-[10px] md:text-xs text-gray-500">{type.description}</div>}
                    </div>
                    <button 
                      onClick={() => handleDeleteType(type.id)}
                      className="text-red-400 hover:text-red-600 p-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                      title="Delete Fee Type"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {feeTypes.length === 0 && (
                  <p className="text-xs md:text-sm text-gray-500 text-center py-4">No fee types defined.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Fee Structures */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-base md:text-lg font-bold text-gray-800">Fee Structures (Amounts)</h2>
                <button 
                  onClick={() => setShowStructureModal(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 text-xs md:text-base"
                >
                  <Plus className="w-4 h-4" />
                  <span>Set New Fee</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b bg-gray-50 text-xs md:text-sm">
                      <th className="pb-3 pl-4 py-3 font-semibold text-gray-600">Fee Type</th>
                      <th className="pb-3 py-3 font-semibold text-gray-600">Class</th>
                      <th className="pb-3 py-3 font-semibold text-gray-600">Term/Year</th>
                      <th className="pb-3 py-3 font-semibold text-gray-600">Amount</th>
                      <th className="pb-3 pr-4 py-3 font-semibold text-gray-600 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs md:text-sm">
                    {feeStructures.map(struct => (
                      <tr key={struct.id} className="hover:bg-gray-50">
                        <td className="py-3 pl-4 font-medium text-gray-900">{struct.fee_types?.name}</td>
                        <td className="py-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] md:text-xs font-medium">
                            {struct.classes?.name}
                          </span>
                        </td>
                        <td className="py-3 text-gray-600">
                          {struct.academic_terms?.name} <br/>
                          <span className="text-[10px] md:text-xs">{struct.academic_year}</span>
                        </td>
                        <td className="py-3 font-bold text-gray-800">
                          GH₵ {struct.amount}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <button 
                            onClick={() => handleDeleteStructure(struct.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {feeStructures.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-gray-500">
                          No fee structures set up yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Add Fee Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Add Fee Type</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tuition, PTA, Feeding"
                  value={newType.name}
                  onChange={e => setNewType({...newType, name: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  placeholder="Optional description"
                  value={newType.description}
                  onChange={e => setNewType({...newType, description: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowTypeModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-xs md:text-sm">Cancel</button>
              <button onClick={handleAddType} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-xs md:text-sm">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Fee Structure Modal */}
      {showStructureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Set Fee Amount</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fee Type</label>
                <select
                  value={newStructure.fee_type_id}
                  onChange={e => setNewStructure({...newStructure, fee_type_id: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                >
                  <option value="">Select Fee Type</option>
                  {feeTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Classes</label>
                <div className="border rounded-lg p-2 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                  <div className="flex items-center pb-2 border-b border-gray-200">
                    <input 
                        type="checkbox" 
                        checked={newStructure.class_ids.length === classes.length && classes.length > 0}
                        onChange={(e) => {
                            if (e.target.checked) {
                                setNewStructure({...newStructure, class_ids: classes.map(c => c.id)})
                            } else {
                                setNewStructure({...newStructure, class_ids: []})
                            }
                        }}
                        className="mr-2 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-bold text-gray-700">Select All Classes</span>
                  </div>
                  {classes.map(c => (
                    <div key={c.id} className="flex items-center">
                      <input
                        type="checkbox"
                        value={c.id}
                        checked={newStructure.class_ids.includes(c.id)}
                        onChange={e => {
                          const ids = newStructure.class_ids
                          if (e.target.checked) {
                            setNewStructure({...newStructure, class_ids: [...ids, c.id]})
                          } else {
                            setNewStructure({...newStructure, class_ids: ids.filter(id => id !== c.id)})
                          }
                        }}
                        className="mr-2 rounded text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{c.name}</span>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {newStructure.class_ids.length} classes selected
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
                  <select
                    value={newStructure.term_id}
                    onChange={e => {
                      const term = terms.find(t => t.id === e.target.value)
                      setNewStructure({
                        ...newStructure, 
                        term_id: e.target.value,
                        academic_year: term?.academic_year || ''
                      })
                    }}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                  >
                    <option value="">Select Term</option>
                    {terms.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.academic_year})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newStructure.amount}
                    onChange={e => setNewStructure({...newStructure, amount: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-purple-500 text-gray-900"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowStructureModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleAddStructure} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Save Structure</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

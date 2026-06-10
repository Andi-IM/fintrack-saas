'use client'

import { useState, useEffect } from 'react'
import { getGroupedBankStatements, getFileUrl, deleteBankStatement, BankStatementWithItems } from '@/lib/actions/statements'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  ChevronDown, 
  ChevronRight, 
  Building2, 
  Calendar, 
  FileText, 
  ExternalLink,
  ArrowUpRight,
  ArrowDownLeft,
  Loader2,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BankStatementList() {
  const [groupedData, setGroupedData] = useState<Record<string, BankStatementWithItems[]> | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedBanks, setExpandedBanks] = useState<string[]>([])
  const [expandedPeriods, setExpandedPeriods] = useState<string[]>([])

  const fetchData = async () => {
    try {
      const data = await getGroupedBankStatements()
      setGroupedData(data)
      return data
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData().then(data => {
      if (data) {
        const keys = Object.keys(data)
        if (keys.length > 0) setExpandedBanks([keys[0]])
      }
    })
  }, [])

  const handleDelete = async (e: React.MouseEvent, id: string, filePath: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this statement and all its items? This will also remove the uploaded file.')) return
    
    setDeletingId(id)
    try {
      await deleteBankStatement(id, filePath)
      await fetchData()
    } catch (err) {
      alert('Failed to delete statement')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleBank = (bank: string) => {
    setExpandedBanks(prev => 
      prev.includes(bank) ? prev.filter(b => b !== bank) : [...prev, bank]
    )
  }

  const togglePeriod = (id: string) => {
    setExpandedPeriods(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  const handleViewFile = async (path: string) => {
    try {
      const url = await getFileUrl(path)
      window.open(url, '_blank')
    } catch (err) {
      alert('Failed to access file')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!groupedData || Object.keys(groupedData).length === 0) {
    return (
      <Card className="border-dashed border-slate-200">
        <CardContent className="p-8 text-center text-slate-500">
          No bank statements found. Upload one to get started.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(groupedData).map(([bank, statements]) => (
        <div key={bank} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          {/* Bank Header */}
          <button 
            onClick={() => toggleBank(bank)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors bg-slate-50/50"
          >
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900">{bank}</h3>
              <span className="text-xs font-medium bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                {statements.length} Statements
              </span>
            </div>
            {expandedBanks.includes(bank) ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
          </button>

          {/* Periods List */}
          {expandedBanks.includes(bank) && (
            <div className="divide-y divide-slate-100">
              {statements.map((statement) => (
                <div key={statement.id} className="bg-white">
                  <div 
                    onClick={() => togglePeriod(statement.id)}
                    className="w-full flex items-center justify-between px-6 py-3 hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-semibold text-slate-700">{statement.statement_period}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        onClick={(e) => handleDelete(e, statement.id, statement.file_path)}
                        disabled={deletingId === statement.id}
                      >
                        {deletingId === statement.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewFile(statement.file_path)
                        }}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1.5" />
                        View PDF
                      </Button>
                      {expandedPeriods.includes(statement.id) ? <ChevronDown className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
                    </div>
                  </div>

                  {/* Transaction Details */}
                  {expandedPeriods.includes(statement.id) && (
                    <div className="px-6 pb-4 bg-slate-50/30">
                      {/* Balance Summary Card */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo Awal</p>
                          <p className="text-sm font-bold text-slate-700 font-mono">
                            Rp {(statement.opening_balance || 0).toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo Akhir</p>
                          <p className="text-sm font-bold text-indigo-600 font-mono">
                            Rp {(statement.closing_balance || 0).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2">Date</th>
                              <th className="px-4 py-2">Description</th>
                              <th className="px-4 py-2 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {statement.bank_statement_items.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                                  {new Date(item.date).toLocaleString('id-ID', { 
                                    day: '2-digit', 
                                    month: '2-digit', 
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className="px-4 py-2.5">
                                  <p className="font-bold text-slate-700 line-clamp-1">{item.description}</p>
                                  <p className="text-[10px] text-slate-400">{item.category}</p>
                                </td>
                                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                  <div className={`flex items-center justify-end gap-1 font-mono font-bold ${item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {item.type === 'income' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                    Rp {item.amount.toLocaleString('id-ID')}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

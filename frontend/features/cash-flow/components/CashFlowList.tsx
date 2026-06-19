'use client'

import { format } from "date-fns"
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "@/components/ui/dialog"
import { Tables } from "@/lib/database.types"
import { formatCurrency } from "@/lib/utils/transaction"
import { Edit2, Trash2, FileText, Plus, Minus, Receipt, Link as LinkIcon, Search, X, ChevronLeft, ChevronRight, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import { useCashFlowController } from "@/features/cash-flow/hooks/use-cash-flow-controller"

export function CashFlowList({ transactions, timeRange }: { transactions: Tables<'cash_flow'>[], dateFilter?: string, timeRange: string }) {
  const router = useRouter()
  
  // Delegate state management to custom hook controller abstraction
  const {
    activeMobileTx,
    setActiveMobileTx,
    search,
    category,
    payment,
    source,
    range,
    dateFilter,
    handleClearDateFilter,
    handleDelete,
    handleSearchChange,
    handleCategoryChange,
    handlePaymentChange,
    handleSourceChange,
    handlePageChange,
    handlePageSizeChange,
    handleRangeChange,
    handleResetFilters,
    uniqueCategories,
    uniquePaymentMethods,
    paginatedTransactions,
    hasActiveFilters,
    pageNumbers,
    validPage,
    limit,
    startIndex,
    totalItems,
    totalPages,
  } = useCashFlowController({ initialTransactions: transactions, timeRange })

  const handleEdit = (id: string) => {
    router.push(`/add?edit=${id}`)
  }

  return (
    <Card className="shadow-sm border-slate-200 rounded-xl bg-white relative">
      <CardHeader className="border-b border-slate-100 flex flex-col gap-4 pb-4 px-6 pt-5">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-sm font-bold text-slate-800">Riwayat Arus Kas</CardTitle>
            {dateFilter && (
              <button onClick={handleClearDateFilter} className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-1">
                Filter Tanggal: {dateFilter} <span>✕</span>
              </button>
            )}
          </div>
          {hasActiveFilters && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleResetFilters}
              className="h-7 px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold flex items-center gap-1 rounded-md"
            >
              <X className="w-3.5 h-3.5" /> Bersihkan Filter
            </Button>
          )}
        </div>

        {/* Toolbar - Search and Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              type="text"
              placeholder="Cari deskripsi / kategori..."
              value={search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs rounded-lg border-slate-200 focus-visible:ring-indigo-500"
            />
            {search && (
              <button 
                onClick={() => handleSearchChange('')} 
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="relative flex items-center">
            <select
              value={category || 'all'}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Filter className="w-3 h-3" />
            </div>
          </div>

          {/* Payment Method Filter */}
          <div className="relative flex items-center">
            <select
              value={payment || 'all'}
              onChange={(e) => handlePaymentChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="all">Semua Metode Bayar</option>
              {uniquePaymentMethods.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Filter className="w-3 h-3" />
            </div>
          </div>

          {/* Source Type Filter */}
          <div className="relative flex items-center">
            <select
              value={source || 'all'}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="all">Semua Sumber Data</option>
              <option value="receipt">Hanya Resit (Receipt)</option>
              <option value="statement">Hanya Mutasi Bank</option>
              <option value="manual">Hanya Manual</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Filter className="w-3 h-3" />
            </div>
          </div>

          {/* Time Range Filter */}
          <div className="relative flex items-center">
            <select
              value={range || 'ALL'}
              onChange={(e) => handleRangeChange(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 appearance-none cursor-pointer"
            >
              <option value="ALL">Semua Waktu</option>
              <option value="1W">1 Minggu Terakhir</option>
              <option value="1M">1 Bulan Terakhir</option>
              <option value="3M">3 Bulan Terakhir</option>
              <option value="1Y">1 Tahun Terakhir</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Filter className="w-3 h-3" />
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Mobile View (Cards) */}
        <section aria-label="Daftar Transaksi Mobile" className="grid grid-cols-1 gap-4 p-4 md:hidden">
          {paginatedTransactions.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              <p className="text-xs">Tidak ada transaksi yang cocok dengan filter.</p>
            </div>
          ) : (
            paginatedTransactions.map((tx) => {
              const isIncome = Number(tx.income) > 0;
              const nominal = isIncome ? Number(tx.income) : Number(tx.expense);

              return (
                <article key={tx.id}>
                  <Card 
                    className="overflow-hidden border border-slate-100 shadow-none bg-white hover:border-indigo-100 hover:bg-slate-50/30 transition-all cursor-pointer active:scale-[0.99]"
                    onClick={() => setActiveMobileTx(tx)}
                  >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500">
                          {format(new Date(tx.date), "dd MMM yyyy, HH:mm")}
                        </p>
                        <h4 className="font-bold text-slate-800 text-sm mt-1 leading-relaxed break-words">
                          {tx.description || "Tanpa Deskripsi"}
                        </h4>
                      </div>
                      <span className={cn(
                        "font-bold font-mono text-sm whitespace-nowrap",
                        isIncome ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {isIncome ? "+" : "-"} {formatCurrency(nominal)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 border border-slate-200 font-bold uppercase tracking-tight">
                        {tx.main_category}
                      </span>
                      {tx.sub_category && (
                        <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          {tx.sub_category}
                        </span>
                      )}
                      {tx.payment_method && (
                        <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {tx.payment_method}
                        </span>
                      )}
                      {tx.receipt_id && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                          <Receipt className="w-2.5 h-2.5" /> Resit
                        </span>
                      )}
                      {tx.source_item_id && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          <LinkIcon className="w-2.5 h-2.5" /> Mutasi
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </article>
              )
            })
          )}
        </section>

        {/* Desktop View (Table) */}
        <section aria-label="Daftar Transaksi Desktop" className="hidden md:block overflow-hidden">
          <Table className="w-full text-left">
            <TableHeader className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
              <TableRow>
                <TableHead className="px-6 py-3 font-bold text-slate-400 w-40">Waktu</TableHead>
                <TableHead className="px-6 py-3 font-bold text-slate-400">Deskripsi / Kategori</TableHead>
                <TableHead className="px-6 py-3 text-right font-bold text-slate-400">Nominal</TableHead>
                <TableHead className="px-6 py-3 text-center font-bold text-slate-400 w-24">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 text-sm">
              {paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-slate-500 h-32">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className="w-8 h-8 text-slate-200" />
                      <p>Tidak ada transaksi yang cocok dengan filter.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isIncome = Number(tx.income) > 0;
                  const nominal = isIncome ? Number(tx.income) : Number(tx.expense);

                  return (
                    <TableRow key={tx.id} className="hover:bg-slate-50 transition-colors group">
                      <TableCell className="px-6 py-4 text-slate-500 whitespace-nowrap align-top text-xs">
                        {format(new Date(tx.date), "dd MMM yyyy, HH:mm")}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-medium text-slate-900 min-w-[300px] max-w-md">
                        <span className="block mb-1 group-hover:text-indigo-600 transition-colors break-words leading-relaxed text-sm">
                          {tx.description || "Tanpa Deskripsi"}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap mt-1.5">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 border border-slate-200 font-bold uppercase tracking-tight">
                            {tx.main_category}
                          </span>
                          {tx.sub_category && (
                            <span className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                              {tx.sub_category}
                            </span>
                          )}
                          {tx.payment_method && (
                            <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {tx.payment_method}
                            </span>
                          )}
                          {tx.receipt_id && (
                            <span className="flex items-center gap-1 text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100" title="Terkait dengan Resit">
                              <Receipt className="w-2.5 h-2.5" /> Resit
                            </span>
                          )}
                          {tx.source_item_id && (
                            <span className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100" title="Terkait dengan Mutasi Bank">
                              <LinkIcon className="w-2.5 h-2.5" /> Mutasi
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className={cn("px-6 py-4 text-right font-bold whitespace-nowrap align-top font-mono", isIncome ? 'text-emerald-600' : 'text-rose-600')}>
                        <div className="flex items-center justify-end gap-1">
                          {isIncome ? <Plus className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                          {formatCurrency(nominal)}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-center whitespace-nowrap align-top">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(tx.id)} className="h-8 w-8 text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(tx.id)} className="h-8 w-8 text-rose-700 hover:text-rose-800 hover:bg-rose-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </section>

        {/* Pagination Controls */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
            {/* Items Summary Info */}
            <div className="text-xs text-slate-500 font-medium order-2 sm:order-1">
              Menampilkan <span className="font-bold text-slate-800">{startIndex + 1}</span>–
              <span className="font-bold text-slate-800">{Math.min(startIndex + limit, totalItems)}</span> dari{' '}
              <span className="font-bold text-slate-800">{totalItems}</span> transaksi
            </div>

            {/* Controls Button Row */}
            <div className="flex items-center gap-4 order-1 sm:order-2">
              {/* Page Size Selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>Tampilkan:</span>
                <select
                  value={String(limit)}
                  onChange={(e) => handlePageSizeChange(e.target.value)}
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="10">10</option>
                  <option value="15">15</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              {/* Page Buttons List */}
              <div className="flex items-center gap-1">
                {/* Prev Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(validPage - 1)}
                  disabled={validPage === 1}
                  className="h-8 w-8 text-slate-500 border-slate-200 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {/* Number Buttons */}
                {pageNumbers.map((p, idx) => {
                  if (p === '...') {
                    return (
                      <span key={`ellipse-${idx}`} className="px-2 text-slate-400 text-xs font-bold">
                        ...
                      </span>
                    )
                  }
                  const pageNum = p as number
                  return (
                    <Button
                      key={`page-${pageNum}`}
                      variant={validPage === pageNum ? "default" : "outline"}
                      onClick={() => handlePageChange(pageNum)}
                      className={cn(
                        "h-8 w-8 text-xs font-bold transition-all",
                        validPage === pageNum
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent shadow-sm"
                          : "text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {pageNum}
                    </Button>
                  )
                })}

                {/* Next Button */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handlePageChange(validPage + 1)}
                  disabled={validPage === totalPages}
                  className="h-8 w-8 text-slate-500 border-slate-200 disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Mobile Transaction Management Drawer */}
      <Dialog open={!!activeMobileTx} onOpenChange={() => setActiveMobileTx(null)}>
        <DialogContent 
          showCloseButton={false}
          className="fixed bottom-0 top-auto left-0 right-0 translate-y-0 translate-x-0 w-full max-w-full rounded-t-2xl rounded-b-none border-t border-slate-200 p-6 gap-4 bg-white pb-8 focus:outline-none focus-visible:ring-0 data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-bottom-full data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-bottom-full duration-200 ease-out"
        >
          <div className="mx-auto w-12 h-1.5 bg-slate-200 rounded-full mb-2" />
          <DialogHeader className="text-left">
            <DialogTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Kelola Transaksi
            </DialogTitle>
            <DialogDescription className="text-slate-900 font-bold text-base mt-1.5 leading-relaxed">
              {activeMobileTx?.description || "Tanpa Deskripsi"}
            </DialogDescription>
          </DialogHeader>

          {activeMobileTx && (
            <div className="space-y-4 my-2">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Nominal Transaksi</span>
                <span className={cn(
                  "font-bold font-mono text-base",
                  Number(activeMobileTx.income) > 0 ? "text-emerald-600" : "text-rose-600"
                )}>
                  {Number(activeMobileTx.income) > 0 ? "+" : "-"} {formatCurrency(Number(activeMobileTx.income) > 0 ? Number(activeMobileTx.income) : Number(activeMobileTx.expense))}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-505">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-tight">Kategori</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">{activeMobileTx.main_category}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-tight">Tanggal</span>
                  <span className="font-bold text-slate-800 mt-0.5 block">
                    {format(new Date(activeMobileTx.date), "dd MMM yyyy, HH:mm")}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 flex items-center justify-center gap-2 rounded-xl"
              onClick={() => {
                if (activeMobileTx) {
                  handleEdit(activeMobileTx.id)
                  setActiveMobileTx(null)
                }
              }}
            >
              <Edit2 className="w-4 h-4" /> Edit Transaksi
            </Button>
            <Button
              variant="outline"
              className="w-full border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800 font-bold h-11 flex items-center justify-center gap-2 rounded-xl"
              onClick={() => {
                if (activeMobileTx && window.confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
                  handleDelete(activeMobileTx.id)
                  setActiveMobileTx(null)
                }
              }}
            >
              <Trash2 className="w-4 h-4" /> Hapus Transaksi
            </Button>
            <Button
              variant="ghost"
              className="w-full text-slate-500 hover:bg-slate-100 font-bold h-11 rounded-xl"
              onClick={() => setActiveMobileTx(null)}
            >
              Batal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

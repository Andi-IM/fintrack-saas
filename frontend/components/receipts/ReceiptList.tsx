'use client'

import { useState, useTransition, useMemo, Suspense, lazy } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { format } from 'date-fns'
import { 
  Trash2, 
  Search, 
  Eye, 
  MapPin, 
  Calendar, 
  CreditCard,
  FileText,
  Maximize2,
  Pencil
} from 'lucide-react'
const ReceiptEditDialog = lazy(() => import('./ReceiptEditDialog').then(m => ({ default: m.ReceiptEditDialog })))
import { Card, CardContent } from "@/components/ui/card"
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
import { formatCurrency } from "@/lib/utils/transaction"
import { deleteReceipt, getReceiptFileUrl, ReceiptWithItems } from "@/features/receipts/actions/receipts"

interface ReceiptListProps {
  receipts: ReceiptWithItems[]
}

export function ReceiptList({ receipts }: ReceiptListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'shopping' | 'atm'>('all')
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptWithItems | null>(null)
  const [receiptFileUrl, setReceiptFileUrl] = useState<string | null>(null)
  const [loadingUrl, setLoadingUrl] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [editingReceipt, setEditingReceipt] = useState<ReceiptWithItems | null>(null)

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    return receipts.filter(receipt => {
      const matchesSearch = 
        receipt.store_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (receipt.store_address && receipt.store_address.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesType = typeFilter === 'all' || receipt.type === typeFilter

      return matchesSearch && matchesType
    })
  }, [receipts, searchQuery, typeFilter])

  const handleSelectReceipt = async (receipt: ReceiptWithItems) => {
    setSelectedReceipt(receipt)
    if (receipt.file_path) {
      setLoadingUrl(true)
      setReceiptFileUrl(null)
      const res = await getReceiptFileUrl(receipt.file_path)
      if (res.success && res.data) {
        setReceiptFileUrl(res.data)
      }
      setLoadingUrl(false)
    } else {
      setReceiptFileUrl(null)
    }
  }

  const handleCloseModal = () => {
    setSelectedReceipt(null)
    setReceiptFileUrl(null)
    setIsZoomed(false)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation() // prevent opening modal when clicking delete
    
    if (!window.confirm("Apakah Anda yakin ingin menghapus struk ini? Semua data barang terkait juga akan dihapus.")) {
      return
    }

    startTransition(async () => {
      const res = await deleteReceipt(id)
      if (res.success) {
        // If the deleted receipt is currently open in modal, close it
        if (selectedReceipt?.id === id) {
          handleCloseModal()
        }
        router.refresh()
      } else {
        alert(`Gagal menghapus struk: ${res.error}`)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
<Input
           placeholder="Cari toko, bank, atau alamat..."
           value={searchQuery}
           onChange={(e) => setSearchQuery(e.target.value)}
           className="pl-9"
           aria-label="Cari toko, bank, atau alamat"
         />
        </div>
        <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
            className="rounded-full text-xs"
            aria-pressed={typeFilter === 'all'}
          >
            Semua
          </Button>
          <Button
            variant={typeFilter === 'shopping' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('shopping')}
            className="rounded-full text-xs"
            aria-pressed={typeFilter === 'shopping'}
          >
            Belanja (Shopping)
          </Button>
          <Button
            variant={typeFilter === 'atm' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('atm')}
            className="rounded-full text-xs"
            aria-pressed={typeFilter === 'atm'}
          >
            Struk ATM
          </Button>
        </div>
      </div>

      {/* Receipts List */}
      {filteredReceipts.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="h-48 flex flex-col justify-center items-center text-slate-500 space-y-2">
            <FileText className="w-12 h-12 stroke-[1.5]" />
            <p className="text-sm" data-testid="empty-receipt-state">Tidak ada struk yang ditemukan.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile View (Cards) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredReceipts.map((receipt) => (
              <Card
                key={receipt.id}
                className="overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer"
                onClick={() => handleSelectReceipt(receipt)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{receipt.store_name}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {format(new Date(receipt.date), 'dd MMM yyyy, HH:mm')}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      receipt.type === 'atm' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {receipt.type === 'atm' ? 'ATM' : 'Shopping'}
                    </span>
                  </div>

                  {receipt.store_address && (
                    <p className="text-xs text-slate-500 flex items-center gap-1 line-clamp-1">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      {receipt.store_address}
                    </p>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] text-slate-400">Total Nominal</p>
                      <p className="font-bold text-indigo-700 text-sm font-mono">
                        {formatCurrency(Number(receipt.total_price))}
                      </p>
                    </div>
<div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSelectReceipt(receipt)
                            }}
                            className="text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
                            aria-label={`Lihat detail ${receipt.store_name}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingReceipt(receipt)
                            }}
                            className="text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
                            aria-label={`Edit ${receipt.store_name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={isPending}
                            onClick={(e) => handleDelete(receipt.id, e)}
                            className="text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                            aria-label={`Hapus ${receipt.store_name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop View (Table) */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px]">Tanggal & Waktu</TableHead>
                  <TableHead>Nama Toko / Bank</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Alamat / Lokasi</TableHead>
                  <TableHead className="text-right">Total Nominal</TableHead>
                  <TableHead className="w-[100px] text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceipts.map((receipt) => (
                  <TableRow
                    key={receipt.id}
                    className="cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSelectReceipt(receipt)}
                  >
                    <TableCell className="font-medium text-slate-600 text-xs">
                      {format(new Date(receipt.date), 'dd MMM yyyy, HH:mm')}
                    </TableCell>
                    <TableCell className="font-bold text-slate-800 text-sm">
                      {receipt.store_name}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        receipt.type === 'atm' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {receipt.type === 'atm' ? 'ATM' : 'Shopping'}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[200px] truncate">
                      {receipt.store_address || '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900 font-mono text-sm">
                      {formatCurrency(Number(receipt.total_price))}
                    </TableCell>
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
<div className="flex items-center justify-center gap-1">
                         <Button
                           variant="ghost"
                           size="icon-sm"
                           onClick={() => handleSelectReceipt(receipt)}
                           className="text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
                           aria-label={`Lihat detail ${receipt.store_name}`}
                         >
                           <Eye className="w-4 h-4" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="icon-sm"
                           onClick={(e) => {
                             e.stopPropagation()
                             setEditingReceipt(receipt)
                           }}
                           className="text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
                           aria-label={`Edit ${receipt.store_name}`}
                         >
                           <Pencil className="w-4 h-4" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="icon-sm"
                           disabled={isPending}
                           onClick={(e) => handleDelete(receipt.id, e)}
                           className="text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                           aria-label={`Hapus ${receipt.store_name}`}
                         >
                           <Trash2 className="w-4 h-4" />
                         </Button>
                       </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Details Modal */}
      <Dialog open={selectedReceipt !== null} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent 
          className="max-w-md md:max-w-lg p-0 overflow-hidden bg-slate-50 rounded-3xl border border-slate-200 shadow-2xl"
          aria-describedby={undefined}
        >
          {selectedReceipt && (
            <>
              {/* Header card with receipt metadata */}
              <div className="bg-indigo-900 text-white p-6 relative">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white border border-white/10`}>
                    {selectedReceipt.type === 'atm' ? 'Struk ATM' : 'Struk Belanja'}
                  </span>
                  <p className="text-xs text-indigo-200">ID: {selectedReceipt.id.slice(0, 8)}...</p>
                </div>
                
                <DialogTitle asChild>
                  <h3 className="text-xl font-bold leading-tight line-clamp-2">{selectedReceipt.store_name}</h3>
                </DialogTitle>
                
                <p className="text-xs text-indigo-200 mt-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(selectedReceipt.date), 'dd MMMM yyyy, HH:mm')}
                </p>

                {selectedReceipt.store_address && (
                  <p className="text-xs text-indigo-100/80 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="line-clamp-1">{selectedReceipt.store_address}</span>
                  </p>
                )}
              </div>

              {/* Detail body */}
              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto animate-in fade-in-50 duration-200">
                {/* Receipt Image / File Preview */}
                {selectedReceipt.file_path && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Berkas Struk</h4>
                    <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center min-h-24">
                      {loadingUrl ? (
                        <div className="h-24 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                          <span className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></span>
                          <span>Memuat berkas...</span>
                        </div>
                      ) : receiptFileUrl ? (
                        selectedReceipt.file_path.toLowerCase().endsWith('.pdf') ? (
                          <a 
                            href={receiptFileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-semibold py-4 w-full border border-dashed border-indigo-200 rounded-xl bg-indigo-50/50 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            Buka Berkas PDF Struk
                          </a>
                        ) : (
                          <div 
                            onClick={() => setIsZoomed(true)}
                            className="relative group w-full h-64 overflow-hidden rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center cursor-pointer"
                          >
                            <Image 
                              src={receiptFileUrl} 
                              alt="Struk Fisik" 
                              fill
                              sizes="(max-width: 768px) 100vw, 500px"
                              className="object-contain rounded-xl transition-all duration-300 group-hover:scale-[1.02]"
                              loading="lazy"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1.5 text-white">
                              <div className="bg-white/20 p-2 rounded-full backdrop-blur-md border border-white/20 shadow-lg">
                                <Maximize2 className="w-5 h-5 text-white" />
                              </div>
                              <span className="text-[11px] font-semibold tracking-wide">Klik untuk memperbesar</span>
                            </div>
                          </div>
                        )
                      ) : (
                        <p className="text-xs text-slate-400 py-4">Gagal memuat berkas struk.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Reconciliation & Reference Info */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Nomor Referensi</p>
                      <p className="font-bold text-slate-800 mt-0.5 font-mono">
                        {selectedReceipt.bank_statement_item_id || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold text-right">Status Rekonsiliasi</p>
                      <div className="mt-1 text-right">
                        {selectedReceipt.bank_statement_items ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Terkonsiliasi
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-100">
                            Belum Terkait
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Linked Bank Statement Item Details */}
                  {selectedReceipt.bank_statement_items && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-2 mt-2">
                      <p className="font-bold text-slate-700 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                        Transaksi Bank Terkait
                      </p>
                      <div className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                        <div>
                          <span className="text-slate-400">Bank:</span>
                          <p className="font-semibold text-slate-700">
                            {selectedReceipt.bank_statement_items.bank_statements?.bank_name || 'Unknown Bank'}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Tanggal Mutasi:</span>
                          <p className="font-semibold text-slate-700 font-mono">
                            {format(new Date(selectedReceipt.bank_statement_items.date), 'dd MMM yyyy')}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400">Deskripsi:</span>
                          <p className="font-semibold text-slate-700 line-clamp-2 leading-tight">
                            {selectedReceipt.bank_statement_items.description}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Nominal Mutasi:</span>
                          <p className="font-bold text-slate-800 font-mono">
                            {formatCurrency(Number(selectedReceipt.bank_statement_items.amount))}
                          </p>
                        </div>
                        <div>
                          <span className="text-slate-400">Jenis Mutasi:</span>
                          <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                            selectedReceipt.bank_statement_items.type === 'income'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-100'
                          }`}>
                            {selectedReceipt.bank_statement_items.type === 'income' ? 'Masuk (Cr)' : 'Keluar (Db)'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {selectedReceipt.type === 'shopping' ? (
                  <>
                    {/* Shopping Metadata */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Metode Pembayaran</p>
                        <p className="font-bold text-slate-700 mt-0.5 capitalize flex items-center gap-1">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                          {selectedReceipt.payment_method || 'Cash'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Belanja</p>
                        <p className="font-bold text-slate-800 mt-0.5 font-mono">
                          {formatCurrency(Number(selectedReceipt.total_price))}
                        </p>
                      </div>
                      {selectedReceipt.amount_paid !== null && (
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Uang Dibayar</p>
                          <p className="font-bold text-slate-700 mt-0.5 font-mono">
                            {formatCurrency(Number(selectedReceipt.amount_paid))}
                          </p>
                        </div>
                      )}
                      {selectedReceipt.change !== null && (
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Kembalian</p>
                          <p className="font-bold text-slate-700 mt-0.5 font-mono">
                            {formatCurrency(Number(selectedReceipt.change))}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Shopping Items */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Rincian Barang</h4>
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
                        {selectedReceipt.receipts_items.map((item, idx) => (
                          <div key={item.id || idx} className="p-3 flex justify-between items-center text-xs">
                            <div className="space-y-0.5 pr-2">
                              <p className="font-semibold text-slate-800 line-clamp-1">{item.product_name}</p>
                              <p className="text-slate-400 text-[10px]">
                                {item.quantity} x {formatCurrency(Number(item.price))}
                              </p>
                            </div>
                            <p className="font-bold text-slate-800 font-mono flex-shrink-0">
                              {formatCurrency(Number(item.quantity) * Number(item.price))}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* ATM Metadata */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-xs border-b border-slate-100 pb-4">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tipe Transaksi ATM</p>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-1 ${
                            selectedReceipt.transaction_type === 'withdrawal'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : selectedReceipt.transaction_type === 'deposit'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-purple-50 text-purple-700 border border-purple-100'
                          }`}>
                            {selectedReceipt.transaction_type === 'withdrawal' ? 'Tarik Tunai' :
                             selectedReceipt.transaction_type === 'deposit' ? 'Setor Tunai' : 'Transfer'}
                          </span>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Terminal ATM ID</p>
                          <p className="font-mono font-bold text-slate-700 mt-1">{selectedReceipt.atm_id || '-'}</p>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <p className="text-slate-500">Nominal Transaksi</p>
                          <p className="font-mono font-bold text-slate-800">
                            {formatCurrency(Number(selectedReceipt.total_price))}
                          </p>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-slate-500">Biaya Admin</p>
                          <p className="font-mono text-slate-600">
                            {formatCurrency(Number(selectedReceipt.fee))}
                          </p>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-sm font-bold">
                          <p className="text-indigo-700">Total Pengeluaran/Mutasi</p>
                          <p className="font-mono text-indigo-700">
                            {formatCurrency(Number(selectedReceipt.total_price) + Number(selectedReceipt.fee))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Dialog Footer */}
              <div className="bg-white p-4 border-t border-slate-100 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleCloseModal}
                  className="rounded-xl text-xs"
                >
                  Tutup
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingReceipt(selectedReceipt)
                    setSelectedReceipt(null)
                  }}
                  className="rounded-xl text-xs flex items-center gap-1.5 border-indigo-100 hover:bg-indigo-50/50 hover:text-indigo-700 text-indigo-600"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Struk
                </Button>
                <Button
                  variant="ghost"
                  disabled={isPending}
                  onClick={(e) => handleDelete(selectedReceipt.id, e)}
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus Struk
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Full Screen Image Preview Modal */}
      <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
        <DialogContent 
          className="max-w-[95vw] md:max-w-4xl p-2 overflow-hidden bg-slate-950/95 border-slate-800 rounded-3xl shadow-2xl"
          aria-describedby={undefined}
          showCloseButton={true}
        >
          <DialogTitle className="sr-only">Pratinjau Struk Layar Penuh</DialogTitle>
          {receiptFileUrl && (
            <div className="relative w-full h-[80vh] flex items-center justify-center">
<Image 
                  src={receiptFileUrl} 
                  alt="Pratinjau Struk Fisik" 
                  fill
                  sizes="(max-width: 768px) 100vw, 1200px"
                  className="object-contain"
                  loading="lazy"
                  unoptimized
                />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      {editingReceipt && (
        <Suspense fallback={null}>
          <ReceiptEditDialog
            receipt={editingReceipt}
            open={editingReceipt !== null}
            onOpenChange={(open) => {
              if (!open) setEditingReceipt(null)
            }}
            onSuccess={() => {
              setEditingReceipt(null)
              router.refresh()
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

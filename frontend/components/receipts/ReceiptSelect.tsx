'use client'

import * as React from "react"
import { Check, ChevronsUpDown, Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getReceipts, ReceiptWithItems } from "@/features/receipts/actions/receipts"
import { getCashFlow } from "@/features/cash-flow/actions/cash_flow"
import { Tables } from "@/lib/database.types"
import { formatCurrency } from "@/lib/utils/transaction"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface ReceiptSelectProps {
  value?: string | null
  onChange: (value: string | null) => void
  onSelect?: (receipt: ReceiptWithItems) => void
  disabled?: boolean
}

export function ReceiptSelect({ value, onChange, onSelect, disabled }: ReceiptSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [receipts, setReceipts] = React.useState<ReceiptWithItems[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchData() {
      try {
        const [receiptsRes, cashFlows] = await Promise.all([
          getReceipts(),
          getCashFlow()
        ])
        
        if (receiptsRes.success && receiptsRes.data) {
          // Get all receipt IDs that are already linked in cash_flow
          const linkedReceiptIds = new Set(
            cashFlows.data
              .filter((cf: Tables<'cash_flow'>) => cf.receipt_id)
              .map((cf: Tables<'cash_flow'>) => cf.receipt_id)
          )
          
          // Filter out linked receipts, but always keep the currently selected one
          const availableReceipts = receiptsRes.data.filter(
            (receipt: ReceiptWithItems) => !linkedReceiptIds.has(receipt.id) || receipt.id === value
          )
          
          setReceipts(availableReceipts)
        }
      } catch (error) {
        console.error("Failed to fetch data for ReceiptSelect", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [value])

  const selectedItem = React.useMemo(() => 
    receipts.find((item) => item.id === value),
    [receipts, value]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-11 text-sm font-normal rounded-lg border-slate-200"
          disabled={disabled || loading}
        >
          {selectedItem ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-indigo-600 truncate max-w-[120px]">{selectedItem.store_name}</span>
              <span className="text-slate-400 font-mono text-xs">({formatCurrency(selectedItem.total_price)})</span>
            </div>
          ) : (
            <span className="text-slate-500">Pilih resit terkait (Opsional)...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl shadow-xl border-slate-200" align="start">
        <Command className="rounded-xl flex flex-col overflow-hidden bg-popover p-1 text-popover-foreground">
          <CommandInput placeholder="Cari nama toko atau nominal..." />
          <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden outline-none scroll-py-1">
            <CommandEmpty>Resit tidak ditemukan.</CommandEmpty>
            <CommandGroup heading="Daftar Resit Tersimpan">
              {receipts.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.store_name} ${item.total_price} ${format(new Date(item.date), "dd MMMM yyyy")}`}
                  onSelect={() => {
                    const isSelected = item.id === value
                    const newValue = isSelected ? null : item.id
                    onChange(newValue)
                    if (!isSelected && onSelect) {
                      onSelect(item)
                    }
                    setOpen(false)
                  }}
                  className="rounded-lg mb-0.5"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-indigo-600",
                      value === item.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col flex-1 overflow-hidden">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-medium truncate text-sm">{item.store_name}</span>
                      <span className="text-xs font-bold font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {formatCurrency(item.total_price)}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <CalendarIcon className="w-2.5 h-2.5" />
                      {format(new Date(item.date), "dd MMMM yyyy, HH:mm", { locale: id })}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

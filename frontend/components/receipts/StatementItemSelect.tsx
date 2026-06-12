'use client'

import * as React from "react"
import { Check, ChevronsUpDown, Search, Banknote, Calendar as CalendarIcon, Hash } from "lucide-react"
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
import { getGroupedBankStatements, BankStatementWithItems } from "@/lib/actions/statements"
import { formatCurrency } from "@/lib/utils/transaction"
import { format } from "date-fns"
import { id } from "date-fns/locale"

interface StatementItemSelectProps {
  value?: string | null
  onChange: (value: string | null) => void
  onSelect?: (item: any) => void
  disabled?: boolean
  filterBankName?: string | null
}

export function StatementItemSelect({ value, onChange, onSelect, disabled, filterBankName }: StatementItemSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [statements, setStatements] = React.useState<Record<string, BankStatementWithItems[]>>({})
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchData() {
      const res = await getGroupedBankStatements()
      if (res.success && res.data) {
        setStatements(res.data)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const filteredStatements = React.useMemo(() => {
    if (!filterBankName) return statements

    const filtered: Record<string, BankStatementWithItems[]> = {}
    const searchName = filterBankName.toLowerCase()

    Object.entries(statements).forEach(([bankName, bankStatements]) => {
      // Direct match or partial match for bank name
      if (bankName.toLowerCase().includes(searchName) || searchName.includes(bankName.toLowerCase())) {
        filtered[bankName] = bankStatements
      }
    })

    // If no match found with filter, fallback to all to avoid empty dropdown
    return Object.keys(filtered).length > 0 ? filtered : statements
  }, [statements, filterBankName])

  const allItems = React.useMemo(() => {
    const flatItems: any[] = []
    Object.entries(statements).forEach(([bankName, bankStatements]) => {
      bankStatements.forEach(stmt => {
        stmt.bank_statement_items.forEach(item => {
          flatItems.push({
            ...item,
            bankName,
            statementPeriod: stmt.statement_period
          })
        })
      })
    })
    return flatItems
  }, [statements])

  const selectedItem = React.useMemo(() => 
    allItems.find((item) => item.id === value),
    [allItems, value]
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 text-sm font-normal rounded-lg border-slate-200"
          disabled={disabled || loading}
        >
          {selectedItem ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-indigo-600">[{selectedItem.bankName}]</span>
              <span className="truncate">{selectedItem.description}</span>
              <span className="text-slate-400 font-mono">({formatCurrency(selectedItem.amount)})</span>
            </div>
          ) : (
            <span className="text-slate-500">Pilih mutasi bank (Opsional)...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl shadow-xl border-slate-200" align="start">
        <Command className="rounded-xl">
          <CommandInput placeholder="Cari deskripsi, bank, atau nominal..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>Mutasi tidak ditemukan.</CommandEmpty>
            {Object.entries(filteredStatements).map(([bankName, bankStatements]) => (
              <CommandGroup key={bankName} heading={bankName}>
                {bankStatements.map((stmt) => (
                  <div key={stmt.id} className="px-2 py-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase px-2 mb-1 flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" />
                      {stmt.statement_period}
                    </div>
                    {stmt.bank_statement_items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`${bankName} ${stmt.statement_period} ${item.description} ${item.amount}`}
                        onSelect={() => {
                          const isSelected = item.id === value
                          const newValue = isSelected ? null : item.id
                          onChange(newValue)
                          if (!isSelected && onSelect) {
                            onSelect({ ...item, bankName, statementPeriod: stmt.statement_period })
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
                            <span className="font-medium truncate">{item.description}</span>
                            <span className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded",
                              item.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}>
                              {item.type === 'income' ? '+' : '-'} {formatCurrency(item.amount)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <CalendarIcon className="w-2.5 h-2.5" />
                            {format(new Date(item.date), "dd MMMM yyyy", { locale: id })}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </div>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

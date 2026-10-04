'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Key, Copy, Check, Trash2, Plus, ShieldCheck, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

interface ApiKeyItem {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  lastUsedAt: string | null
  createdAt: string
}

export function ExtensionApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null)
  const [hasCopied, setHasCopied] = useState(false)

  useEffect(() => {
    let mounted = true
    fetch('/api/settings/api-keys')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setKeys(json.data)
        }
      })
      .catch(() => toast.error('Gagal memuat daftar API Key'))
      .finally(() => { if (mounted) setIsLoading(false) })
    return () => { mounted = false }
  }, [])

  const handleGenerateKey = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Browser Extension Bibit Sync' }),
      })
      const json = await res.json()
      if (json.success && json.data?.rawKey) {
        setNewlyCreatedKey(json.data.rawKey)
        setHasCopied(false)
        toast.success('API Key berhasil dibuat!')
        fetch('/api/settings/api-keys')
          .then((res) => res.json())
          .then((json) => { if (json.success && Array.isArray(json.data)) setKeys(json.data) })
      } else {
        toast.error(json.error || 'Gagal membuat API Key')
      }
    } catch {
      toast.error('Gagal membuat API Key')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin mencabut (revoke) API Key ini? Extension tidak akan bisa menyinkronkan data lagi sampai key baru dimasukkan.')) {
      return
    }

    try {
      const res = await fetch(`/api/settings/api-keys/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('API Key berhasil dicabut')
        setKeys((prev) => prev.filter((k) => k.id !== id))
      } else {
        toast.error(json.error || 'Gagal mencabut API Key')
      }
    } catch {
      toast.error('Gagal mencabut API Key')
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setHasCopied(true)
    toast.success('API Key disalin ke clipboard')
    setTimeout(() => setHasCopied(false), 3000)
  }

  return (
    <Card className="border-indigo-100 dark:border-indigo-950/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200">
              <Key className="w-5 h-5 text-indigo-600" />
              Browser Extension Sync Key
            </CardTitle>
            <CardDescription>
              Gunakan Personal Sync Key untuk menghubungkan Browser Extension (Bibit) secara aman tanpa tergantung sesi login cookie.
            </CardDescription>
          </div>
          <Button
            onClick={handleGenerateKey}
            disabled={isGenerating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            {isGenerating ? 'Membuat...' : 'Buat Key Baru'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Newly created key modal banner */}
        {newlyCreatedKey && (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              Kunci Baru Dibuat (Hanya Ditampilkan Sekali)
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Salin kunci ini sekarang dan tempelkan ke popup ekstensi FinTrack di browser Anda. Kunci tidak akan ditampilkan lagi setelah Anda menutup pesan ini.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={newlyCreatedKey}
                className="flex-1 px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-900 border border-amber-300 rounded-lg outline-none select-all"
              />
              <Button
                size="sm"
                onClick={() => handleCopy(newlyCreatedKey)}
                variant="outline"
                className="border-amber-300 text-amber-900 dark:text-amber-200 hover:bg-amber-100"
              >
                {hasCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                <span className="ml-1 text-xs">{hasCopied ? 'Tersalin' : 'Salin'}</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setNewlyCreatedKey(null)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Tutup
              </Button>
            </div>
          </div>
        )}

        {/* Existing keys table */}
        {isLoading ? (
          <div className="text-sm text-slate-500 py-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Memuat daftar API Key...
          </div>
        ) : keys.length === 0 ? (
          <div className="text-xs text-slate-500 py-3 italic bg-slate-50 dark:bg-slate-900/50 px-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
            Belum ada API Key aktif. Klik tombol &ldquo;Buat Key Baru&rdquo; di atas untuk menghubungkan ekstensi Chrome.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            {keys.map((k) => (
              <div key={k.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-200">
                    <span>{k.name}</span>
                    <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono">
                      {k.keyPrefix}
                    </code>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Dibuat: {new Date(k.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {k.lastUsedAt
                      ? ` • Terakhir digunakan: ${new Date(k.lastUsedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                      : ' • Belum pernah digunakan'}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRevokeKey(k.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs h-8"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Cabut Akses
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

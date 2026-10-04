import { useState, useEffect } from 'react'

export function App() {
  const [apiKey, setApiKey] = useState<string>('')
  const [inputKey, setInputKey] = useState<string>('')
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' })
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    chrome.storage?.local?.get(['fintrack_api_key'], (res) => {
      const stored = (res?.fintrack_api_key as string) || ''
      setApiKey(stored)
      setInputKey(stored)
      setIsLoading(false)
    })
  }, [])

  const handleSaveKey = () => {
    const trimmed = inputKey.trim()
    if (!trimmed) {
      setStatusMessage({ text: 'API Key tidak boleh kosong.', type: 'error' })
      return
    }

    if (!trimmed.startsWith('ft_sync_')) {
      setStatusMessage({ text: 'Format tidak valid. Key harus diawali "ft_sync_".', type: 'error' })
      return
    }

    chrome.storage?.local?.set({ fintrack_api_key: trimmed }, () => {
      setApiKey(trimmed)
      setIsEditing(false)
      setStatusMessage({ text: 'API Key berhasil disimpan!', type: 'success' })
      setTimeout(() => setStatusMessage({ text: '', type: '' }), 3000)
    })
  }

  const handleDisconnect = () => {
    chrome.storage?.local?.remove(['fintrack_api_key'], () => {
      setApiKey('')
      setInputKey('')
      setIsEditing(false)
      setStatusMessage({ text: 'Koneksi API Key diputuskan.', type: 'success' })
      setTimeout(() => setStatusMessage({ text: '', type: '' }), 3000)
    })
  }

  const handleOpenApp = () => {
    chrome.tabs.create({ url: 'https://fintrek.web.id/investments' })
  }

  const handleOpenSettings = () => {
    chrome.tabs.create({ url: 'https://fintrek.web.id/investments/settings' })
  }

  if (isLoading) {
    return (
      <div style={{ width: '320px', padding: '24px', textAlign: 'center', fontFamily: 'sans-serif', color: '#64748b' }}>
        Memuat...
      </div>
    )
  }

  const isConnected = !!apiKey && apiKey.startsWith('ft_sync_')

  return (
    <div style={{
      width: '320px',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      backgroundColor: '#ffffff',
      color: '#0f172a',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          boxShadow: '0 4px 8px rgba(79, 70, 229, 0.25)',
          flexShrink: 0
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
            <polyline points="16 7 22 7 22 13" />
          </svg>
        </div>
        <div>
          <h2 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#1e1b4b' }}>FinTrack Sync</h2>
          <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Browser Extension Bibit</p>
        </div>
      </div>

      {/* Connection Status Card */}
      <div style={{
        padding: '12px 14px',
        borderRadius: '10px',
        backgroundColor: isConnected ? '#f0fdf4' : '#f8fafc',
        border: `1px solid ${isConnected ? '#bbf7d0' : '#e2e8f0'}`,
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isConnected ? '6px' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#16a34a' : '#94a3b8',
              display: 'inline-block'
            }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: isConnected ? '#15803d' : '#64748b' }}>
              {isConnected ? 'Terhubung ke FinTrack' : 'Belum Terhubung'}
            </span>
          </div>

          {isConnected && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#4f46e5',
                fontSize: '11px',
                fontWeight: '600',
                cursor: 'pointer',
                padding: '2px 4px'
              }}
            >
              Ubah
            </button>
          )}
        </div>

        {isConnected && !isEditing && (
          <div style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>
            {apiKey.slice(0, 14)}••••••••••
          </div>
        )}
      </div>

      {/* API Key Input Section */}
      {(!isConnected || isEditing) && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
            FinTrack Sync API Key:
          </label>
          <input
            type="password"
            placeholder="ft_sync_..."
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px',
              fontSize: '12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              boxSizing: 'border-box',
              outline: 'none',
              fontFamily: 'monospace',
              marginBottom: '8px'
            }}
          />

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSaveKey}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Simpan Key
            </button>

            {isEditing && (
              <button
                onClick={() => {
                  setIsEditing(false)
                  setInputKey(apiKey)
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>
            )}

            {isConnected && isEditing && (
              <button
                onClick={handleDisconnect}
                style={{
                  padding: '8px 10px',
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Hapus
              </button>
            )}
          </div>

          <div style={{ marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
            Belum punya key?{' '}
            <span
              onClick={handleOpenSettings}
              style={{ color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Buat di FinTrack Web
            </span>
          </div>
        </div>
      )}

      {/* Status Alert */}
      {statusMessage.text && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '6px',
          marginBottom: '14px',
          fontSize: '11px',
          backgroundColor: statusMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
          color: statusMessage.type === 'success' ? '#16a34a' : '#dc2626',
          border: `1px solid ${statusMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* Main Action Button */}
      <button
        onClick={handleOpenApp}
        style={{
          width: '100%',
          padding: '10px 14px',
          backgroundColor: '#f8fafc',
          color: '#1e293b',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          fontWeight: '600',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}
      >
        <span>Buka Web App Investasi</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
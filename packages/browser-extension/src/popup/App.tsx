export function App() {
  const handleOpenApp = () => {
    chrome.tabs.create({ url: 'https://fintrek.web.id/investments' })
  }

  return (
    <div style={{
      width: '320px',
      padding: '24px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      textAlign: 'center',
      backgroundColor: '#ffffff',
      color: '#0f172a'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        margin: '0 auto 16px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        boxShadow: '0 8px 16px rgba(79, 70, 229, 0.25)'
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
      </div>

      <h2 style={{ fontSize: '16px', fontWeight: '700', margin: '0 0 8px', color: '#1e1b4b' }}>
        FinTrack Investasi
      </h2>

      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px', lineHeight: '1.5' }}>
        Fitur portofolio investasi kini telah menjadi <b>fitur independen</b> langsung di dalam Web App FinTrack.
      </p>

      <button
        onClick={handleOpenApp}
        style={{
          width: '100%',
          padding: '11px 16px',
          backgroundColor: '#4f46e5',
          color: '#ffffff',
          border: 'none',
          borderRadius: '10px',
          fontWeight: '600',
          fontSize: '13px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.15s ease'
        }}
      >
        <span>Buka Fitur Investasi</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
          <path d="M12 5l7 7-7 7" />
        </svg>
      </button>

      <div style={{
        marginTop: '16px',
        padding: '10px 12px',
        borderRadius: '8px',
        backgroundColor: '#f8fafc',
        border: '1px solid #e2e8f0',
        fontSize: '11px',
        color: '#64748b',
        lineHeight: '1.4'
      }}>
        💡 <b>Tips</b>: Klik tombol <b>Reload (⟳)</b> di halaman <code>chrome://extensions</code> agar klik icon extension langsung membuka Web App tanpa popup ini.
      </div>
    </div>
  )
}
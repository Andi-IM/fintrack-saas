interface RefreshButtonProps {
  onClick: () => void
  disabled?: boolean
}

export function RefreshButton({ onClick, disabled }: RefreshButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled} title="Refresh">
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: disabled ? 'none' : 'spin 1s linear infinite' }}>
        <path d="M23 4v6h-6" />
        <path d="M1 20v-6h6" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  )
}
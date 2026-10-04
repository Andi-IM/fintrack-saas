export function LoadingState() {
  return (
    <div className="loading-state">
      <div className="spinner" />
      <span style={{ fontSize: '13px', color: '#6b7280' }}>Loading portfolio...</span>
    </div>
  )
}
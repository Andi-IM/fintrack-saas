interface EmptyStateProps {
  onSignIn: () => void
}

export function EmptyState({ onSignIn }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M21 12V7H5" />
        <path d="M16 7l-4-4-4 4" />
        <rect x="2" y="16" width="20" height="6" rx="1" />
      </svg>
      <h3>Not Signed In</h3>
      <p>Sign in to FinTrack to view your investment portfolio summary from the toolbar.</p>
      <button onClick={onSignIn}>Sign In to FinTrack</button>
    </div>
  )
}
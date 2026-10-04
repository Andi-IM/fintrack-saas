interface ErrorStateProps {
  message: string
  onRetry: () => void
  onSignIn: () => void
}

export function ErrorState({ message, onRetry, onSignIn }: ErrorStateProps) {
  return (
    <div className="error-state">
      <svg className="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <h3>Unable to Load Portfolio</h3>
      <p>{message}</p>
      <div className="error-buttons">
        <button onClick={onRetry}>Retry</button>
        <button className="primary" onClick={onSignIn}>Sign In</button>
      </div>
    </div>
  )
}
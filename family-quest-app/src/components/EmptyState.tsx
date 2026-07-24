interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <circle cx="26" cy="26" r="22" stroke="currentColor" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="4 5" />
        <circle cx="19" cy="24" r="2.4" fill="currentColor" />
        <circle cx="33" cy="24" r="2.4" fill="currentColor" />
        <path d="M18 33c2.4 3 5.2 4.5 8 4.5s5.6-1.5 8-4.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <p className="empty-message">{message}</p>
    </div>
  );
}

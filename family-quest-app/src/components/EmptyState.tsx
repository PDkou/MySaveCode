interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="6" y="16" width="36" height="24" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M6 22h36" stroke="currentColor" strokeWidth="2" />
        <path d="M16 10h16l4 6H12l4-6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <p className="empty-message">{message}</p>
    </div>
  );
}

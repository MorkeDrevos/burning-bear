export default function SolanaMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 398 311" role="img" aria-label="Solana" className={className}>
      <defs>
        <linearGradient id="s" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#bca8ff" />
          <stop offset="100%" stopColor="#a8ffdf" />
        </linearGradient>
      </defs>
      <g fill="url(#s)" opacity="0.9">
        <path d="M64 0h318c10 0 18 11 9 19l-68 60a20 20 0 0 1-13 5H0L64 0Z" />
        <path d="M64 156h318c10 0 18 11 9 19l-68 60a20 20 0 0 1-13 5H0l64-84Z" />
        <path d="M0 233h318c5 0 9 2 13 5l68 60c9 8 1 19-9 19H64L0 233Z" />
      </g>
    </svg>
  );
}

export function FlightPath({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 40"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2 32 C 60 2, 120 2, 178 20 S 220 34, 238 12"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeDasharray="1 7"
        strokeLinecap="round"
      />
      <circle cx="2" cy="32" r="3" fill="var(--ink)" />
      <path d="M232 8 L238 12 L231 16" stroke="var(--accent-deep)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

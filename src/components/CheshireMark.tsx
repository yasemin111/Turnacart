interface CheshireMarkProps {
  className?: string;
}

export function CheshireMark({ className = 'w-7 h-5' }: CheshireMarkProps) {
  return (
    <svg
      viewBox="0 0 64 40"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Subtle Cat Eyes */}
      <path
        d="M15 14C17.5 10.5 22.5 10.5 25 14C22.5 16.5 17.5 16.5 15 14Z"
        fill="#2DD4BF"
      />
      <ellipse cx="20" cy="14" rx="1.3" ry="2.6" fill="#07231A" />

      <path
        d="M39 14C41.5 10.5 46.5 10.5 49 14C46.5 16.5 41.5 16.5 39 14Z"
        fill="#2DD4BF"
      />
      <ellipse cx="44" cy="14" rx="1.3" ry="2.6" fill="#07231A" />

      {/* Iconic Cheshire Grin */}
      <path
        d="M10 22C16.5 33 47.5 33 54 22C46.5 28 17.5 28 10 22Z"
        fill="#E879F9"
      />
      <path
        d="M17 25.2L17 27.6M23 26.8L23 29.5M29 27.5L29 30.2M35 27.5L35 30.2M41 26.8L41 29.5M47 25.2L47 27.6"
        stroke="#07231A"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

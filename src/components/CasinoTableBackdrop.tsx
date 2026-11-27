export function CasinoTableBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden="true"
    >
      {/* Casino table felt radial illumination */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 85% 60% at 50% 15%, #12543F 0%, #0A3628 52%, #07261C 100%)',
        }}
      />

      {/* Subtle baize weave pattern & casino table arc + card deck shapes */}
      <svg
        className="absolute inset-0 w-full h-full opacity-100"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <pattern id="feltWeave" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.6" fill="#A7F3D0" fillOpacity="0.06" />
            <circle cx="10" cy="10" r="0.6" fill="#FDE68A" fillOpacity="0.04" />
          </pattern>
        </defs>

        <rect width="1440" height="900" fill="url(#feltWeave)" />

        {/* Classic Casino Table Curved Betting Line */}
        <path
          d="M 140 0 C 140 460, 1300 460, 1300 0"
          stroke="#FDE68A"
          strokeOpacity="0.10"
          strokeWidth="2"
        />
        <path
          d="M 210 0 C 210 390, 1230 390, 1230 0"
          stroke="#FDE68A"
          strokeOpacity="0.06"
          strokeWidth="1.2"
          strokeDasharray="6 8"
        />

        {/* Top-left Fanned Playing Card Deck Silhouette */}
        <g transform="translate(56, 135) rotate(-14)" opacity="0.16">
          <rect x="0" y="0" width="76" height="108" rx="9" fill="#0B3B2C" stroke="#FDE68A" strokeWidth="1.4" />
          <rect x="14" y="-8" width="76" height="108" rx="9" fill="#0E4433" stroke="#FDE68A" strokeWidth="1.4" transform="rotate(9 52 46)" />
          <rect x="28" y="-12" width="76" height="108" rx="9" fill="#12503C" stroke="#E879F9" strokeWidth="1.5" transform="rotate(18 66 42)" />
          <text x="66" y="46" fill="#F0ABFC" fontSize="26" fontFamily="serif" textAnchor="middle">
            ♠
          </text>
        </g>

        {/* Bottom-right Stacked Card Deck Silhouette */}
        <g transform="translate(1250, 670) rotate(12)" opacity="0.16">
          <rect x="0" y="10" width="84" height="118" rx="10" fill="#0B3B2C" stroke="#FDE68A" strokeWidth="1.3" />
          <rect x="6" y="5" width="84" height="118" rx="10" fill="#0E4433" stroke="#FDE68A" strokeWidth="1.3" />
          <rect x="12" y="0" width="84" height="118" rx="10" fill="#12503C" stroke="#FDE68A" strokeWidth="1.5" />
          <rect x="20" y="8" width="68" height="102" rx="6" stroke="#E879F9" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="3 3" />
          <text x="54" y="68" fill="#FDE68A" fontSize="28" fontFamily="serif" textAnchor="middle">
            ♦
          </text>
        </g>

        {/* Bottom-left Suit Emblem Pair */}
        <g transform="translate(88, 760)" opacity="0.14">
          <rect x="0" y="0" width="62" height="88" rx="8" fill="#0B3B2C" stroke="#FDE68A" strokeWidth="1.2" transform="rotate(-8 31 44)" />
          <text x="31" y="52" fill="#F472B6" fontSize="24" fontFamily="serif" textAnchor="middle" transform="rotate(-8 31 44)">
            ♥
          </text>
        </g>

        {/* Top-right Card Silhouette */}
        <g transform="translate(1310, 150) rotate(15)" opacity="0.14">
          <rect x="0" y="0" width="66" height="94" rx="8" fill="#0B3B2C" stroke="#2DD4BF" strokeWidth="1.2" />
          <text x="33" y="55" fill="#5EEAD4" fontSize="24" fontFamily="serif" textAnchor="middle">
            ♣
          </text>
        </g>
      </svg>
    </div>
  );
}

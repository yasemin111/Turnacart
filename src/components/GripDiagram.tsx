interface GripDiagramProps {
  activeStep: number;
  techniqueName: string;
}

export function GripDiagram({ activeStep, techniqueName }: GripDiagramProps) {
  const isDoubleLift = techniqueName.toLowerCase().includes('double');
  const isMechanicsGrip = techniqueName.toLowerCase().includes('mekanik');

  return (
    <div className="rounded-2xl bg-[#0D382B]/90 border border-emerald-200/[0.14] p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-emerald-100/80">
          Kart Destesi Referansı <span aria-hidden="true">·</span> Adım {activeStep}/5
        </span>
        <span className="font-mono-num text-xs text-amber-200">
          {isMechanicsGrip
            ? 'Temel Mekanik Tutuş'
            : isDoubleLift
              ? 'Mekanik Tutuş & Çift Blok'
              : techniqueName}
        </span>
      </div>

      <svg
        viewBox="0 0 360 156"
        className="w-full h-auto block"
        role="img"
        aria-label={`${techniqueName} adım ${activeStep} el ve kart destesi pozisyonu şeması`}
      >
        <defs>
          <linearGradient id="deckGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1B4D3E" />
            <stop offset="100%" stopColor="#0E3026" />
          </linearGradient>
          <linearGradient id="cardHighlight" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F0ABFC" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#FDE68A" stopOpacity="0.14" />
          </linearGradient>
        </defs>

        {/* Casino Table Mat Surface */}
        <rect x="8" y="8" width="344" height="140" rx="12" fill="#07231A" stroke="#FDE68A" strokeOpacity="0.22" strokeWidth="1" />
        <path d="M 36 144 C 110 105, 250 105, 324 144" stroke="#FDE68A" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="4 4" />

        {/* Corner Suit Marks on Mat */}
        <text x="24" y="29" fill="#FDE68A" fillOpacity="0.35" fontSize="12" fontFamily="serif">♠</text>
        <text x="328" y="29" fill="#F472B6" fillOpacity="0.35" fontSize="12" fontFamily="serif">♥</text>
        <text x="24" y="136" fill="#F472B6" fillOpacity="0.35" fontSize="12" fontFamily="serif">♦</text>
        <text x="328" y="136" fill="#FDE68A" fillOpacity="0.35" fontSize="12" fontFamily="serif">♣</text>

        {/* Base Deck Stack */}
        <g transform="translate(86, 46)">
          <path
            d="M 0 18 L 136 18 L 154 62 L 18 62 Z"
            fill="#0A2B21"
            stroke="#5EEAD4"
            strokeOpacity="0.35"
            strokeWidth="1.2"
          />
          <path
            d="M 0 12 L 136 12 L 154 56 L 18 56 Z"
            fill="url(#deckGrad)"
            stroke="#A7F3D0"
            strokeOpacity="0.45"
            strokeWidth="1.2"
          />

          {/* Pinky Break Highlight (Step 1) */}
          {activeStep === 1 && !isMechanicsGrip && (
            <g>
              <line x1="128" y1="15" x2="150" y2="57" stroke="#E879F9" strokeWidth="2.5" strokeDasharray="4 3" />
              <circle cx="145" cy="48" r="6" fill="#E879F9" fillOpacity="0.25" stroke="#E879F9" strokeWidth="1.5" />
              <text x="162" y="52" fill="#F0ABFC" fontSize="10" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="600">
                Pinky Break (2 kart)
              </text>
            </g>
          )}

          {/* Mechanic's Grip Front Index Finger Lock */}
          {isMechanicsGrip && activeStep === 2 && (
            <g>
              <circle cx="68" cy="11" r="5" fill="#FDE68A" />
              <text x="68" y="-3" fill="#FDE68A" fontSize="10" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="600" textAnchor="middle">
                İşaret Parmağı (Ön Kilit)
              </text>
            </g>
          )}

          {/* Top 2 Cards Block */}
          <g
            transform={
              !isMechanicsGrip && activeStep === 3
                ? 'translate(22, -16) rotate(-5)'
                : !isMechanicsGrip && activeStep === 4
                  ? 'translate(10, -22) rotate(4)'
                  : activeStep === 5 || isMechanicsGrip
                    ? 'translate(2, 0)'
                    : 'translate(0, -3)'
            }
          >
            <path
              d="M 2 9 L 138 9 L 156 53 L 20 53 Z"
              fill="#113D30"
              stroke={activeStep === 2 || activeStep === 3 ? '#FDE68A' : '#6EE7B7'}
              strokeWidth="1.3"
            />
            <path
              d="M 0 6 L 136 6 L 154 50 L 18 50 Z"
              fill={activeStep === 4 && !isMechanicsGrip ? 'url(#cardHighlight)' : '#174D3D'}
              stroke={activeStep >= 2 ? '#E879F9' : '#A7F3D0'}
              strokeWidth="1.5"
            />

            {/* Card Back Diamond Lattice or Face Pip */}
            {activeStep === 4 && !isMechanicsGrip ? (
              <text x="76" y="33" fill="#F0ABFC" fontSize="14" fontFamily="Outfit, sans-serif" fontWeight="700" textAnchor="middle">
                A♠
              </text>
            ) : (
              <path
                d="M 16 14 L 122 14 L 136 42 L 30 42 Z"
                fill="none"
                stroke="#FDE68A"
                strokeOpacity="0.28"
                strokeWidth="0.9"
                strokeDasharray="3 2"
              />
            )}
          </g>

          {/* Left Thumb */}
          <circle
            cx="14"
            cy="28"
            r="5"
            fill={activeStep === 2 || activeStep === 3 || activeStep === 5 ? '#E879F9' : '#34D399'}
          />
          <text x="-66" y="31" fill="#D1FAE5" fontSize="10" fontFamily="Plus Jakarta Sans, sans-serif">
            Başparmak
          </text>

          {/* Right Grip Fingers */}
          {(activeStep === 2 || activeStep === 3 || activeStep === 4) && (
            <g>
              <circle cx="152" cy="18" r="5" fill="#FDE68A" />
              <text x="164" y="21" fill="#FDE68A" fontSize="10" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="600">
                {isMechanicsGrip ? 'Sağ Kenar Parmaklar' : 'Sağ Parmak Köşe'}
              </text>
            </g>
          )}

          {/* Alignment Callout (Step 2 & 5) */}
          {!isMechanicsGrip && (activeStep === 2 || activeStep === 5) && (
            <g>
              <line x1="0" y1="4" x2="136" y2="4" stroke="#FDE68A" strokeWidth="2" />
              <text x="68" y="-4" fill="#FDE68A" fontSize="10" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="600" textAnchor="middle">
                Sıfır Kenar Taşması (Tam Hiza)
              </text>
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

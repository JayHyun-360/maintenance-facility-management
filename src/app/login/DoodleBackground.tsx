"use client";

export default function DoodleBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {/* Wrench */}
        <g style={{ opacity: 0.25 }}>
          <path
            d="M 45 20 L 55 10 L 60 15 L 50 25 L 45 20 Z"
            fill="none"
            stroke="#4A5568"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 50 25 L 65 40"
            fill="none"
            stroke="#4A5568"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
          <circle cx="68" cy="43" r="1.5" fill="none" stroke="#4A5568" strokeWidth="0.5" />
        </g>

        {/* Hammer */}
        <g style={{ opacity: 0.22 }}>
          <rect x="15" y="45" width="3" height="8" rx="0.3" fill="none" stroke="#4A5568" strokeWidth="0.5" />
          <rect x="10" y="40" width="6" height="4" rx="0.5" fill="none" stroke="#4A5568" strokeWidth="0.5" />
        </g>

        {/* Screwdriver */}
        <g style={{ opacity: 0.24 }}>
          <rect x="80" y="55" width="1.5" height="6" fill="none" stroke="#4A5568" strokeWidth="0.5" />
          <path
            d="M 79 75 L 82 75 L 84 85 L 77 85 Z"
            fill="none"
            stroke="#4A5568"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
        </g>

        {/* Gear */}
        <g style={{ opacity: 0.2 }}>
          <circle cx="25" cy="25" r="3" fill="none" stroke="#4A5568" strokeWidth="0.5" />
          <circle cx="25" cy="25" r="1.5" fill="none" stroke="#4A5568" strokeWidth="0.5" />
          {[...Array(8)].map((_, i) => (
            <line
              key={i}
              x1="25"
              y1="20"
              x2="25"
              y2="17"
              stroke="#4A5568"
              strokeWidth="0.5"
              transform={`rotate(${i * 45} 25 25)`}
            />
          ))}
        </g>

        {/* Building/School */}
        <g style={{ opacity: 0.22 }}>
          <rect x="70" y="30" width="8" height="10" fill="none" stroke="#4A5568" strokeWidth="0.5" />
          <path d="M 65 30 L 80 20 L 95 30" fill="none" stroke="#4A5568" strokeWidth="0.5" />
          <rect x="74" y="38" width="1.5" height="2" fill="none" stroke="#4A5568" strokeWidth="0.3" />
          <rect x="82" y="38" width="1.5" height="2" fill="none" stroke="#4A5568" strokeWidth="0.3" />
          <rect x="74" y="48" width="1.5" height="2" fill="none" stroke="#4A5568" strokeWidth="0.3" />
          <rect x="82" y="48" width="1.5" height="2" fill="none" stroke="#4A5568" strokeWidth="0.3" />
        </g>

        {/* Broom */}
        <g style={{ opacity: 0.21 }}>
          <path
            d="M 20 80 L 25 65 L 30 80"
            fill="none"
            stroke="#4A5568"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <line x1="22" y1="80" x2="22" y2="95" stroke="#4A5568" strokeWidth="0.5" strokeLinecap="round" />
          <line x1="25" y1="80" x2="25" y2="95" stroke="#4A5568" strokeWidth="0.5" strokeLinecap="round" />
          <line x1="28" y1="80" x2="28" y2="95" stroke="#4A5568" strokeWidth="0.5" strokeLinecap="round" />
        </g>

        {/* Bucket */}
        <g style={{ opacity: 0.23 }}>
          <path
            d="M 85 70 L 88 90 L 102 90 L 105 70"
            fill="none"
            stroke="#4A5568"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
          <path d="M 83 65 Q 95 60 107 65" fill="none" stroke="#4A5568" strokeWidth="0.5" strokeLinecap="round" />
          <path d="M 88 65 L 88 70" fill="none" stroke="#4A5568" strokeWidth="0.5" />
          <path d="M 102 65 L 102 70" fill="none" stroke="#4A5568" strokeWidth="0.5" />
        </g>

        {/* Light bulb */}
        <g style={{ opacity: 0.22 }}>
          <path
            d="M 50 50 Q 55 45 60 50 Q 65 55 60 60 L 55 65 L 50 60 Q 45 55 50 50 Z"
            fill="none"
            stroke="#4A5568"
            strokeWidth="0.5"
          />
          <path d="M 52 65 L 52 72" stroke="#4A5568" strokeWidth="0.5" strokeLinecap="round" />
          <path d="M 58 65 L 58 72" stroke="#4A5568" strokeWidth="0.5" strokeLinecap="round" />
          <path d="M 55 72 L 55 75" stroke="#4A5568" strokeWidth="0.5" strokeLinecap="round" />
          <line x1="55" y1="40" x2="55" y2="45" stroke="#4A5568" strokeWidth="0.5" strokeLinecap="round" />
        </g>

        {/* Clipboard/Checklist */}
        <g style={{ opacity: 0.21 }}>
          <rect x="10" y="60" width="6" height="8" rx="0.8" fill="none" stroke="#4A5568" strokeWidth="0.5" />
          <rect x="14" y="56" width="3" height="3" rx="0.4" fill="none" stroke="#4A5568" strokeWidth="0.5" />
          <line x1="13" y1="68" x2="22" y2="68" stroke="#4A5568" strokeWidth="0.4" />
          <line x1="13" y1="73" x2="22" y2="73" stroke="#4A5568" strokeWidth="0.4" />
          <circle cx="12" cy="68" r="0.6" fill="#4A5568" />
          <circle cx="12" cy="73" r="0.6" fill="#4A5568" />
        </g>

        {/* Pipe/Wrench */}
        <g style={{ opacity: 0.2 }}>
          <path
            d="M 60 85 Q 70 80 80 85 Q 90 90 100 85"
            fill="none"
            stroke="#4A5568"
            strokeWidth="0.8"
            strokeLinecap="round"
          />
          <circle cx="70" cy="82" r="2.5" fill="none" stroke="#4A5568" strokeWidth="0.5" />
        </g>

        {/* Toolbox */}
        <g style={{ opacity: 0.22 }}>
          <rect x="30" y="75" width="10" height="6" rx="0.8" fill="none" stroke="#4A5568" strokeWidth="0.5" />
          <rect x="35" y="72" width="6" height="3" rx="0.4" fill="none" stroke="#4A5568" strokeWidth="0.5" />
          <path d="M 40 77 L 40 82" stroke="#4A5568" strokeWidth="0.4" strokeLinecap="round" />
          <path d="M 45 77 L 45 82" stroke="#4A5568" strokeWidth="0.4" strokeLinecap="round" />
          <path d="M 50 77 L 50 82" stroke="#4A5568" strokeWidth="0.4" strokeLinecap="round" />
        </g>

        {/* Spray bottle */}
        <g style={{ opacity: 0.21 }}>
          <rect x="90" y="35" width="3" height="5" fill="none" stroke="#4A5568" strokeWidth="0.5" />
          <rect x="92" y="28" width="1.5" height="3" fill="none" stroke="#4A5568" strokeWidth="0.5" />
          <path d="M 94 28 L 94 24" stroke="#4A5568" strokeWidth="0.5" strokeLinecap="round" />
          <path d="M 90 24 L 98 24" stroke="#4A5568" strokeWidth="0.5" strokeLinecap="round" />
        </g>

        {/* Checkmark */}
        <g style={{ opacity: 0.2 }}>
          <path
            d="M 35 35 L 40 40 L 50 28"
            fill="none"
            stroke="#4A5568"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Plus sign (medical/repair) */}
        <g style={{ opacity: 0.2 }}>
          <line x1="95" y1="50" x2="95" y2="60" stroke="#4A5568" strokeWidth="0.5" strokeLinecap="round" />
          <line x1="90" y1="55" x2="100" y2="55" stroke="#4A5568" strokeWidth="0.5" strokeLinecap="round" />
        </g>

        {/* Lightning bolt (electricity) */}
        <g style={{ opacity: 0.2 }}>
          <path
            d="M 40 10 L 35 20 L 42 20 L 35 30"
            fill="none"
            stroke="#4A5568"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Paint roller */}
        <g style={{ opacity: 0.2 }}>
          <rect x="5" y="15" width="6" height="2.5" rx="1.2" fill="none" stroke="#4A5568" strokeWidth="0.5" />
          <line x1="8" y1="17.5" x2="8" y2="30" stroke="#4A5568" strokeWidth="0.5" strokeLinecap="round" />
          <path d="M 5 30 L 11 30" stroke="#4A5568" strokeWidth="0.5" strokeLinecap="round" />
        </g>

        {/* Tape measure */}
        <g style={{ opacity: 0.2 }}>
          <circle cx="65" cy="15" r="3" fill="none" stroke="#4A5568" strokeWidth="0.5" />
          <circle cx="65" cy="15" r="1.2" fill="none" stroke="#4A5568" strokeWidth="0.4" />
          <path d="M 73 15 L 85 15" stroke="#4A5568" strokeWidth="0.4" strokeLinecap="round" />
          <line x1="70" y1="15" x2="70" y2="12" stroke="#4A5568" strokeWidth="0.3" />
          <line x1="75" y1="15" x2="75" y2="12" stroke="#4A5568" strokeWidth="0.3" />
          <line x1="80" y1="15" x2="80" y2="12" stroke="#4A5568" strokeWidth="0.3" />
        </g>

        {/* Safety cone */}
        <g style={{ opacity: 0.2 }}>
          <path
            d="M 55 60 L 50 80 L 60 80 Z"
            fill="none"
            stroke="#4A5568"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
          <line x1="52" y1="68" x2="58" y2="68" stroke="#4A5568" strokeWidth="0.4" />
          <line x1="51" y1="74" x2="59" y2="74" stroke="#4A5568" strokeWidth="0.4" />
        </g>
      </svg>
    </div>
  );
}

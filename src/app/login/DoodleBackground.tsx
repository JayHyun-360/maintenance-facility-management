"use client";

export default function DoodleBackground() {
  const doodles = [
    // Wrench
    <g key="wrench" className="doodle" style={{ opacity: 0.25 }}>
      <path
        d="M45 20 L55 10 L60 15 L50 25 L45 20 Z"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50 25 L65 40"
        fill="none"
        stroke="#4A5568"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="68"
        cy="43"
        r="5"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
    </g>,
    // Hammer
    <g key="hammer" className="doodle" style={{ opacity: 0.22 }}>
      <rect
        x="15"
        y="45"
        width="8"
        height="25"
        rx="1"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
      <rect
        x="10"
        y="40"
        width="18"
        height="10"
        rx="2"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
    </g>,
    // Screwdriver
    <g key="screwdriver" className="doodle" style={{ opacity: 0.24 }}>
      <rect
        x="80"
        y="55"
        width="4"
        height="20"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
      <path
        d="M79 75 L82 75 L84 85 L77 85 Z"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </g>,
    // Gear
    <g key="gear" className="doodle" style={{ opacity: 0.2 }}>
      <circle
        cx="25"
        cy="25"
        r="8"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
      <circle
        cx="25"
        cy="25"
        r="4"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
      {[...Array(8)].map((_, i) => (
        <line
          key={i}
          x1="25"
          y1="15"
          x2="25"
          y2="10"
          stroke="#4A5568"
          strokeWidth="2"
          transform={`rotate(${i * 45} 25 25)`}
        />
      ))}
    </g>,
    // Building/School
    <g key="building" className="doodle" style={{ opacity: 0.22 }}>
      <rect
        x="70"
        y="30"
        width="20"
        height="25"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
      <path
        d="M65 30 L80 20 L95 30"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
      <rect
        x="74"
        y="38"
        width="4"
        height="5"
        fill="none"
        stroke="#4A5568"
        strokeWidth="1.5"
      />
      <rect
        x="82"
        y="38"
        width="4"
        height="5"
        fill="none"
        stroke="#4A5568"
        strokeWidth="1.5"
      />
      <rect
        x="74"
        y="48"
        width="4"
        height="5"
        fill="none"
        stroke="#4A5568"
        strokeWidth="1.5"
      />
      <rect
        x="82"
        y="48"
        width="4"
        height="5"
        fill="none"
        stroke="#4A5568"
        strokeWidth="1.5"
      />
    </g>,
    // Broom
    <g key="broom" className="doodle" style={{ opacity: 0.21 }}>
      <path
        d="M20 80 L25 65 L30 80"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="22"
        y1="80"
        x2="22"
        y2="95"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="25"
        y1="80"
        x2="25"
        y2="95"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="28"
        y1="80"
        x2="28"
        y2="95"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>,
    // Bucket
    <g key="bucket" className="doodle" style={{ opacity: 0.23 }}>
      <path
        d="M85 70 L88 90 L102 90 L105 70"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M83 65 Q95 60 107 65"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M88 65 L88 70" fill="none" stroke="#4A5568" strokeWidth="2" />
      <path d="M102 65 L102 70" fill="none" stroke="#4A5568" strokeWidth="2" />
    </g>,
    // Light bulb
    <g key="bulb" className="doodle" style={{ opacity: 0.22 }}>
      <path
        d="M50 50 Q55 45 60 50 Q65 55 60 60 L55 65 L50 60 Q45 55 50 50 Z"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
      <path
        d="M52 65 L52 72"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M58 65 L58 72"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M55 72 L55 75"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="55"
        y1="40"
        x2="55"
        y2="45"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>,
    // Clipboard/Checklist
    <g key="clipboard" className="doodle" style={{ opacity: 0.21 }}>
      <rect
        x="10"
        y="60"
        width="15"
        height="20"
        rx="2"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
      <rect
        x="14"
        y="56"
        width="7"
        height="6"
        rx="1"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
      <line
        x1="13"
        y1="68"
        x2="22"
        y2="68"
        stroke="#4A5568"
        strokeWidth="1.5"
      />
      <line
        x1="13"
        y1="73"
        x2="22"
        y2="73"
        stroke="#4A5568"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="68" r="1.5" fill="#4A5568" />
      <circle cx="12" cy="73" r="1.5" fill="#4A5568" />
    </g>,
    // Pipe/Wrench
    <g key="pipe" className="doodle" style={{ opacity: 0.2 }}>
      <path
        d="M60 85 Q70 80 80 85 Q90 90 100 85"
        fill="none"
        stroke="#4A5568"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle
        cx="70"
        cy="82"
        r="6"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
    </g>,
    // Toolbox
    <g key="toolbox" className="doodle" style={{ opacity: 0.22 }}>
      <rect
        x="30"
        y="75"
        width="25"
        height="15"
        rx="2"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
      <rect
        x="35"
        y="72"
        width="15"
        height="5"
        rx="1"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
      <path
        d="M40 77 L40 82"
        stroke="#4A5568"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M45 77 L45 82"
        stroke="#4A5568"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M50 77 L50 82"
        stroke="#4A5568"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>,
    // Spray bottle
    <g key="spray" className="doodle" style={{ opacity: 0.21 }}>
      <rect
        x="90"
        y="35"
        width="8"
        height="15"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
      <rect
        x="92"
        y="28"
        width="4"
        height="8"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
      <path
        d="M94 28 L94 24"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M90 24 L98 24"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>,
    // Checkmark
    <g key="checkmark" className="doodle" style={{ opacity: 0.2 }}>
      <path
        d="M35 35 L40 40 L50 28"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>,
    // Plus sign (medical/repair)
    <g key="plus" className="doodle" style={{ opacity: 0.2 }}>
      <line
        x1="95"
        y1="50"
        x2="95"
        y2="60"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="90"
        y1="55"
        x2="100"
        y2="55"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>,
    // Lightning bolt (electricity)
    <g key="lightning" className="doodle" style={{ opacity: 0.2 }}>
      <path
        d="M40 10 L35 20 L42 20 L35 30"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>,
    // Paint roller
    <g key="roller" className="doodle" style={{ opacity: 0.2 }}>
      <rect
        x="5"
        y="15"
        width="15"
        height="6"
        rx="3"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
      <line
        x1="8"
        y1="21"
        x2="8"
        y2="30"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M5 30 L11 30"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </g>,
    // Tape measure
    <g key="tape" className="doodle" style={{ opacity: 0.2 }}>
      <circle
        cx="65"
        cy="15"
        r="8"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
      />
      <circle
        cx="65"
        cy="15"
        r="3"
        fill="none"
        stroke="#4A5568"
        strokeWidth="1.5"
      />
      <path
        d="M73 15 L85 15"
        stroke="#4A5568"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line x1="70" y1="15" x2="70" y2="12" stroke="#4A5568" strokeWidth="1" />
      <line x1="75" y1="15" x2="75" y2="12" stroke="#4A5568" strokeWidth="1" />
      <line x1="80" y1="15" x2="80" y2="12" stroke="#4A5568" strokeWidth="1" />
    </g>,
    // Safety cone
    <g key="cone" className="doodle" style={{ opacity: 0.2 }}>
      <path
        d="M55 60 L50 80 L60 80 Z"
        fill="none"
        stroke="#4A5568"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line
        x1="52"
        y1="68"
        x2="58"
        y2="68"
        stroke="#4A5568"
        strokeWidth="1.5"
      />
      <line
        x1="51"
        y1="74"
        x2="59"
        y2="74"
        stroke="#4A5568"
        strokeWidth="1.5"
      />
    </g>,
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {doodles}
      </svg>
    </div>
  );
}

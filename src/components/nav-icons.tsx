type IconProps = { className?: string; size?: number; strokeWidth?: number };

const base = (size: number, className?: string, strokeWidth = 1.6) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  "aria-hidden": true,
});

export function IconDashboard({ className, size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

export function IconReview({ className, size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  );
}

export function IconTransactions({ className, size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M16 3l4 4-4 4" />
      <path d="M20 7H4" />
      <path d="M8 21l-4-4 4-4" />
      <path d="M4 17h16" />
    </svg>
  );
}

export function IconPayroll({ className, size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M5 9h.01M19 15h.01" />
    </svg>
  );
}

export function IconCreditCard({ className, size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </svg>
  );
}

export function IconFiles({ className, size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

export function IconUpload({ className, size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M12 4v12" />
    </svg>
  );
}

export function IconAccounts({ className, size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9h10M7 13h6" />
    </svg>
  );
}

export function IconCashflow({ className, size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M3 21V3" />
      <path d="M3 21h18" />
      <rect x="6" y="13" width="3" height="6" />
      <rect x="11" y="9" width="3" height="10" />
      <rect x="16" y="5" width="3" height="14" />
    </svg>
  );
}

export function IconNetWorth({ className, size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M14 7h7v7" />
    </svg>
  );
}

export function IconRules({ className, size = 18, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <path d="M4 7h10" />
      <path d="M4 17h10" />
      <circle cx="18" cy="7" r="2" />
      <circle cx="8" cy="12" r="2" />
      <circle cx="18" cy="17" r="2" />
      <path d="M10 12h10" />
    </svg>
  );
}

export function IconSettings({ className, size = 16, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.07a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.07a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.07a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.07a1.7 1.7 0 0 0-1.55 1z" />
    </svg>
  );
}

export function IconPanelLeft({ className, size = 16, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, className, strokeWidth)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  );
}

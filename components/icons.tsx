// Штриховые иконки в стиле макетов (stroke 2, round caps).
type P = { size?: number; className?: string; color?: string };

const base = (size: number, color: string | undefined, className: string | undefined) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color ?? "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className,
  "aria-hidden": true,
});

export const Logo = ({ size = 28, className }: P) => (
  <svg {...base(size, "#E8652B", className)}>
    <path d="M22 10 12 5 2 10l10 5 10-5z" />
    <path d="M6 12v5c3 2 9 2 12 0v-5" />
  </svg>
);
export const Home = ({ size = 18, className, color }: P) => (
  <svg {...base(size, color, className)}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /></svg>
);
export const ListIcon = ({ size = 18, className, color }: P) => (
  <svg {...base(size, color, className)}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>
);
export const MapIcon = ({ size = 18, className, color }: P) => (
  <svg {...base(size, color, className)}><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" /><path d="M9 4v14M15 6v14" /></svg>
);
export const Timer = ({ size = 18, className, color }: P) => (
  <svg {...base(size, color, className)}><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2 2M9 2h6" /></svg>
);
export const Calendar = ({ size = 18, className, color }: P) => (
  <svg {...base(size, color, className)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
export const Play = ({ size = 18, className, color }: P) => (
  <svg {...base(size, color, className)}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m10 9 5 3-5 3V9z" /></svg>
);
export const Spark = ({ size = 18, className, color }: P) => (
  <svg {...base(size, color, className)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>
);
export const Pen = ({ size = 18, className, color }: P) => (
  <svg {...base(size, color, className)}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
);
export const Globe = ({ size = 18, className, color }: P) => (
  <svg {...base(size, color, className)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
);
export const User = ({ size = 18, className, color }: P) => (
  <svg {...base(size, color, className)}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
);
export const Bell = ({ size = 18, className, color }: P) => (
  <svg {...base(size, color, className)}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>
);
export const Flag = ({ size = 16, className, color = "#E8652B" }: P) => (
  <svg {...base(size, color, className)}><path d="M4 22V4M4 4h13l-2 4 2 4H4" /></svg>
);
export const Warn = ({ size = 16, className, color = "#B2461A" }: P) => (
  <svg {...base(size, color, className)}><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>
);
export const Close = ({ size = 18, className, color }: P) => (
  <svg {...base(size, color, className)}><path d="M18 6 6 18M6 6l12 12" /></svg>
);
export const Check = ({ size = 18, className, color }: P) => (
  <svg {...base(size, color, className)}><path d="m5 12 5 5 9-10" /></svg>
);
export const Menu = ({ size = 20, className, color }: P) => (
  <svg {...base(size, color, className)}><path d="M3 6h18M3 12h18M3 18h18" /></svg>
);
export const Chart = ({ size = 22, className, color }: P) => (
  <svg {...base(size, color, className)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
);
export const Target = ({ size = 22, className, color }: P) => (
  <svg {...base(size, color, className)}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /></svg>
);
export const Card = ({ size = 22, className, color }: P) => (
  <svg {...base(size, color, className)}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h4" /></svg>
);

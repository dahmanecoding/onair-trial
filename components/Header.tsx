export default function Header({ title }: { title?: string }) {
  return (
    <header className="flex h-16 items-center justify-between px-2 pt-2 pb-2">
      {/* Left: Profile & Streak */}
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 overflow-hidden rounded-full bg-[#1C1E22]">
          <img
            src="https://api.dicebear.com/9.x/avataaars/svg?seed=OnAir"
            alt="Profile"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex items-center gap-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="#FF4E42"
            stroke="none"
          >
            <path d="M12 2c0 0-4 4-4 10a4 4 0 0 0 8 0c0-6-4-10-4-10zm0 16a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
          </svg>

          <span className="font-display text-sm font-bold text-white">
            295
          </span>
        </div>
      </div>

      {/* Center */}
      <div className="flex items-center gap-3 rounded-full bg-[#1C1E22] px-4 py-1.5 shadow-sm">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8A93A5"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>

        <span className="font-display text-[11px] font-bold tracking-[0.15em] text-white uppercase">
          {title ?? "TODAY"}
        </span>

        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8A93A5"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5">
        <span className="font-display text-[11px] font-bold text-[#8A93A5]">
          90%
        </span>

        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#EDEFF3"
          strokeWidth={1.5}
        >
          <rect x="2" y="7" width="17" height="10" rx="2" ry="2" />
          <path d="M22 11v2" strokeWidth={2} strokeLinecap="round" />
          <rect
            x="4"
            y="9"
            width="13"
            height="6"
            rx="1"
            fill="#EDEFF3"
            stroke="none"
          />
        </svg>
      </div>
    </header>
  );
}

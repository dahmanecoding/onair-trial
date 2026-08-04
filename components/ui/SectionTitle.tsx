import type { ReactNode } from "react";

export default function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="eyebrow">{children}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}

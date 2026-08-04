import type { HTMLAttributes, ReactNode } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  tone?: "default" | "blue" | "green";
};

export default function Card({ children, className = "", tone = "default", ...props }: CardProps) {
  return (
    <div className={`surface-card surface-card--${tone} ${className}`} {...props}>
      {children}
    </div>
  );
}

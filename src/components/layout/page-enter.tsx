"use client";

import { usePathname } from "next/navigation";

/** Soft enter on route change — short ease-out, transform+opacity only. */
export function PageEnter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}

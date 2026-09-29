import { Link, useRouterState } from "@tanstack/react-router";
import { NovaMark } from "./NovaMark";

/** Floating NOVA button shown on phones, hidden inside the NOVA workspace. */
export function MobileNovaButton() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path === "/nova") return null;
  return (
    <Link to="/nova" aria-label="Talk to NOVA" className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary py-2 pl-2 pr-4 text-sm font-semibold text-primary-foreground shadow-soft md:hidden">
      <NovaMark className="size-8" /> Ask NOVA
    </Link>
  );
}

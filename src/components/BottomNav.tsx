import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Compass, Map, CalendarDays, User } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Compass },
  { to: "/map", label: "Map", icon: Map },
  { to: "/bookings", label: "Studio", icon: CalendarDays },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path.startsWith("/listing")) return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="glass shadow-float flex items-center gap-1 rounded-full p-1.5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <Link key={to} to={to} className="tap relative flex items-center gap-2 rounded-full px-4 py-2.5" aria-label={label}>
              {active && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <Icon className={`relative h-[18px] w-[18px] ${active ? "text-primary-foreground" : "text-muted-foreground"}`} strokeWidth={2} />
              {active && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  className="relative overflow-hidden whitespace-nowrap text-[13px] font-semibold text-primary-foreground"
                >
                  {label}
                </motion.span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

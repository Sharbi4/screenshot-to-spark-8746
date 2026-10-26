import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Page({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
      className={className}
    >
      {children}
    </motion.main>
  );
}

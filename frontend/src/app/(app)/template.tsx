"use client";

import { motion } from "motion/react";

// template.tsx remounts on every navigation, so this gives each authed page a
// smooth fade-in instead of the abrupt swap. Opacity-only on purpose: a
// transform here would create a containing block and break position: fixed /
// full-screen map children.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

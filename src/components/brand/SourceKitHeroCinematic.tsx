import { motion } from "framer-motion";
import { useMemo } from "react";

/**
 * SourceKitHeroCinematic
 *
 * Particle field convergence animation for high-end landing pages.
 * Particles drift, converge toward center, mark assembles.
 * GPU-accelerated: transform + opacity only, no filters.
 *
 * Requires: npm install framer-motion
 * Use in: landing hero, marketing pages.
 *
 * Visual narrative:
 *   particles = latent GitHub signal field
 *   convergence = AI detection
 *   brackets = system lock-in
 *   pulse = live signal
 */
export default function SourceKitHeroCinematic({
  size = 320,
  particleCount = 36,
}) {
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map((_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = 90 + Math.random() * 40;

      return {
        id: i,
        x: 128 + Math.cos(angle) * radius,
        y: 128 + Math.sin(angle) * radius,
        delay: Math.random() * 1.5,
      };
    });
  }, [particleCount]);

  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
      }}
    >
      <motion.svg viewBox="0 0 256 256" width="100%" height="100%">
        {/* PARTICLE FIELD */}
        {particles.map((p) => (
          <motion.circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r="1.6"
            fill="#1F4E79"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.6, 0.15],
              cx: [p.x, 128],
              cy: [p.y, 128],
            }}
            transition={{
              duration: 3,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* CENTER NODE */}
        <motion.circle
          cx="128"
          cy="128"
          r="10"
          fill="#1F4E79"
          initial={{ scale: 0 }}
          animate={{
            scale: [0, 1.2, 1],
          }}
          transition={{
            duration: 0.6,
            delay: 0.4,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />

        {/* TOP FOCUS */}
        <motion.line
          x1="128"
          y1="64"
          x2="128"
          y2="88"
          stroke="#1F4E79"
          strokeWidth="11"
          strokeLinecap="round"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.8,
            duration: 0.4,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />

        {/* BOTTOM FOCUS */}
        <motion.line
          x1="128"
          y1="168"
          x2="128"
          y2="192"
          stroke="#1F4E79"
          strokeWidth="11"
          strokeLinecap="round"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.8,
            duration: 0.4,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />

        {/* LEFT BRACKET */}
        <motion.path
          d="M88 72 L56 128 L88 184"
          stroke="#1F4E79"
          strokeWidth="20"
          strokeLinecap="round"
          fill="none"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            delay: 1.2,
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />

        {/* RIGHT BRACKET */}
        <motion.path
          d="M168 72 L200 128 L168 184"
          stroke="#1F4E79"
          strokeWidth="20"
          strokeLinecap="round"
          fill="none"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            delay: 1.2,
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: 3,
          }}
        />
      </motion.svg>
    </div>
  );
}

import { motion } from "framer-motion";

/**
 * SourceKitHeroMark
 *
 * Staggered reveal animation for marketing hero sections.
 * Sequence: center node fades in, focus markers slide into alignment,
 * brackets form around node, subtle breathing glow.
 *
 * Requires: npm install framer-motion
 * Use in: splash, hero, onboarding. NOT in nav or footer.
 */
export default function SourceKitHeroMark({ size = 140 }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      initial="hidden"
      animate="visible"
    >
      {/* CENTER NODE */}
      <motion.circle
        cx="128"
        cy="128"
        r="10"
        fill="#1F4E79"
        variants={{
          hidden: { scale: 0, opacity: 0 },
          visible: {
            scale: 1,
            opacity: 1,
            transition: { duration: 0.35 },
          },
        }}
        animate={{
          scale: [1, 1.08, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
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
        variants={{
          hidden: { y: -12, opacity: 0 },
          visible: {
            y: 0,
            opacity: 1,
            transition: { delay: 0.25, duration: 0.35 },
          },
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
        variants={{
          hidden: { y: 12, opacity: 0 },
          visible: {
            y: 0,
            opacity: 1,
            transition: { delay: 0.25, duration: 0.35 },
          },
        }}
      />

      {/* LEFT BRACKET */}
      <motion.path
        d="M88 72 L56 128 L88 184"
        stroke="#1F4E79"
        strokeWidth="20"
        strokeLinecap="round"
        fill="none"
        variants={{
          hidden: { x: -18, opacity: 0 },
          visible: {
            x: 0,
            opacity: 1,
            transition: { delay: 0.45, duration: 0.4 },
          },
        }}
      />

      {/* RIGHT BRACKET */}
      <motion.path
        d="M168 72 L200 128 L168 184"
        stroke="#1F4E79"
        strokeWidth="20"
        strokeLinecap="round"
        fill="none"
        variants={{
          hidden: { x: 18, opacity: 0 },
          visible: {
            x: 0,
            opacity: 1,
            transition: { delay: 0.45, duration: 0.4 },
          },
        }}
      />
    </motion.svg>
  );
}

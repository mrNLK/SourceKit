import type { Config } from "tailwindcss";

// AI Fund Craft palette: remap Tailwind accent scales onto the palette so legacy
// emerald/amber/purple/etc. utilities stay on-palette and AA-legible on light surfaces.
const scale = (w50: string, w100: string, w200: string, base: string, deep: string) => ({
  50: w50, 100: w100, 200: w200, 300: base, 400: base, 500: base, 600: base, 700: deep, 800: deep, 900: deep, 950: deep,
});
const craftGreen = scale("#EAF3EA", "#DCEBDD", "#C3DEC4", "#2E7D32", "#1F5F23");
const craftRed = scale("#FBEDEC", "#F6DAD8", "#EDB8B4", "#B42318", "#8C1B12");
const craftMuted = scale("#F2F4F7", "#EAECF0", "#D0D5DD", "#667085", "#475467");
const craftBlue = scale("#EEF3F8", "#DCE6F0", "#C2D3E5", "#1F4E79", "#163B63");

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['JetBrains Mono', 'monospace'],
        body: ['Inter', 'DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        emerald: craftGreen, green: craftGreen, lime: craftGreen, teal: craftGreen,
        red: craftRed, rose: craftRed, pink: craftRed,
        amber: craftMuted, yellow: craftMuted, orange: craftMuted,
        purple: craftBlue, violet: craftBlue, fuchsia: craftBlue, indigo: craftBlue, sky: craftBlue, cyan: craftBlue, blue: craftBlue,
        craft: { title: "#163B63", section: "#1F4E79", body: "#172A3A", muted: "#667085", line: "#D8DEE8", wash: "#EEF3F8", success: "#2E7D32", risk: "#B42318" },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: "hsl(var(--surface))",
        "surface-hover": "hsl(var(--surface-hover))",
        "text-dim": "hsl(var(--text-dim))",
        "text-secondary": "hsl(var(--text-secondary))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "ros-fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "ros-fade-in": "ros-fade-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

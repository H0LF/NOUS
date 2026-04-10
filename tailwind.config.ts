

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["var(--font-outfit)", "'Helvetica Neue'", "sans-serif"],
        display: ["var(--font-outfit)", "'Helvetica Neue'", "sans-serif"],
        mono:    ["var(--font-ibm-plex-mono)", "'Courier New'", "monospace"],
        inter:   ["var(--font-outfit)"],
      },
      colors: {
        nous: {
          bg:        "var(--nous-bg)",
          surface:   "var(--nous-surface)",
          card:      "var(--nous-card)",
          border:    "var(--nous-border)",
          accent:    "var(--nous-accent)",
          accent2:   "var(--nous-accent2)",
          primary:   "var(--nous-primary)",
          secondary: "var(--nous-secondary)",
          tertiary:  "var(--nous-tertiary)",
          success:   "var(--nous-success)",
          warning:   "var(--nous-warning)",
          error:     "var(--nous-error)",
          glass:     "var(--nous-glass)",
        },
      },
      animation: {
        fadeUp:    "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards",
        fadeIn:    "fadeIn 0.35s ease forwards",
        float:     "float 8s ease-in-out infinite",
        shimmer:   "shimmer 2s linear infinite",
        pulseGlow: "pulse-glow 3s ease-in-out infinite",
        slideUp:   "slideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 16px rgba(45,139,139,0.15)" },
          "50%":      { boxShadow: "0 0 32px rgba(45,139,139,0.35)" },
        },
      },
      backdropBlur: {
        xs: "4px",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
    },
  },
  plugins: [],
};

export default config;

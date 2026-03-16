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
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'sans-serif'],
        inter: ["var(--font-inter)"],
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
        fadeUp:     "fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards",
        fadeIn:     "fadeIn 0.4s ease forwards",
        float:      "float 6s ease-in-out infinite",
        shimmer:    "shimmer 2s linear infinite",
        pulseGlow:  "pulse-glow 3s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "33%":      { transform: "translateY(-8px) rotate(1deg)" },
          "66%":      { transform: "translateY(-4px) rotate(-1deg)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(124,122,255,0.3)" },
          "50%":      { boxShadow: "0 0 40px rgba(124,122,255,0.6)" },
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

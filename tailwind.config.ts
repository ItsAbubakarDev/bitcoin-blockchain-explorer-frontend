import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0e14",
        surface: "#131722",
        "surface-2": "#181d2a",
        "surface-3": "#1f2535",
        line: "#242b3b",
        fg: "#e6e9ef",
        muted: "#8b93a7",
        faint: "#5c6478",
        // Accent: cyan. Alternatives considered (see DECISIONS.md): violet #a78bfa, emerald #34d399.
        accent: {
          DEFAULT: "#22d3ee",
          strong: "#67e8f9",
          dim: "#0e7490",
        },
        ok: "#34d399",
        warn: "#fbbf24",
        bad: "#f87171",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        "row-in": {
          "0%": { transform: "translateY(-8px)", opacity: "0", backgroundColor: "rgba(34,211,238,0.22)" },
          "30%": { transform: "translateY(0)", opacity: "1", backgroundColor: "rgba(34,211,238,0.18)" },
          "100%": { backgroundColor: "rgba(34,211,238,0)" },
        },
        "live-ping": {
          "0%": { transform: "scale(1)", opacity: "0.75" },
          "75%, 100%": { transform: "scale(2.4)", opacity: "0" },
        },
      },
      animation: {
        "row-in": "row-in 1.6s ease-out",
        "live-ping": "live-ping 1.6s cubic-bezier(0,0,0.2,1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;

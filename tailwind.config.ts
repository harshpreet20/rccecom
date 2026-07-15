import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        rcc: {
          // RCC brand palette — premium dark "club showcase" theme.
          ink: "#0b2b2b",
          green: "#0e5a62", // deep teal
          leaf: "#2aa39b", // brighter teal accent (reads on dark)
          lime: "#8fe7db", // seafoam highlight
          sand: "#f1f6f4", // light text on dark
          clay: "#e0674a", // error
          // Dark surfaces + gold
          night: "#0a100f", // page background (near-black teal)
          panel: "#121c1a", // cards / surfaces
          panel2: "#0e1615", // deeper panel
          line: "#22302e", // borders on dark
          mist: "#aebcb9", // muted body text
          gold: "#c9a24b", // primary gold accent
          goldsoft: "#e0c074", // gold hover / gradient
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

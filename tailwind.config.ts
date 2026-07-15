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
          // RCC brand palette — deep teal + seafoam mint (from the kit design).
          // Token names kept stable; values tuned to the RCC identity.
          ink: "#0b2b2b", // near-black teal (headings)
          green: "#0e5a62", // primary deep teal (collar / shorts)
          leaf: "#14757e", // lighter teal for hovers
          lime: "#8fe7db", // bright seafoam accent (badges / highlights)
          sand: "#f1f6f4", // soft mint-tinted off-white (page bg / light text)
          clay: "#c2503a", // warm red for errors
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

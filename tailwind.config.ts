import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "primary-black": "#1A1A1A",
        "primary-white": "#FFFFFF",
        "secondary-white": "#DEE2DA",
        "primary-gray": "#808A9D",
        "red-error": "#F55C47",
        "green-success": "#7EE89F",
        neutralCream: "#FBFBF9",
        neutralLine: "#D9D9D9",
        neutralDark: "#363636",
        neutralLight: "#6D6D6D",
      },
    },
  },
  plugins: [],
} satisfies Config;

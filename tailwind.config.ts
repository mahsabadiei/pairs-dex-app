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
        "black-primary": "#1A1A1A",
        "white-primary": "#FFFFFF",
        "white-ivory": "#DEE2DA",
        "white-cream": "#f5f4f0",
        "red-primary": "#F55C47",
        "green-primary": "#7EE89F",
        "neutral-cream": "#FBFBF9",
        "neutral-line": "#D9D9D9",
        "neutral-dark": "#363636",
        "neutral-light": "#6D6D6D",
        "gray-primary": "#C3C7C0",
        "gray-soft": "#AFB4C0",
        "gray-secondary": "#D1D5DB",
        "gray-teritary": "#6F6D66",
        "gray-dark": "#2d2e2c",
      },
      // Add custom keyframe animations
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)" },
          "100%": { transform: "translateY(0)" },
        },
        scaleUp: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        scaleDown: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(0.95)", opacity: "0" },
        },
      },
      // Define animation classes
      animation: {
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "slide-up": "slideUp 0.3s ease-out forwards",
        "scale-up":
          "scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards",
        "scale-down": "scaleDown 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;

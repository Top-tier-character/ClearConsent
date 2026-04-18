import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
	],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        cream: "#FAF9F6",
        primary: {
          DEFAULT: "#1B2A4A",
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#10B981",
          foreground: "#FFFFFF",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#FFFFFF",
        },
        danger: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        border: "#E5E7EB",
        surface: "#FFFFFF",
        
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        popover: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        
        muted: {
          DEFAULT: "#F3F4F6",
          foreground: "#6B7280",
        },
        input: "#E5E7EB",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config

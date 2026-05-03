import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
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
        // Wranngle brand palette (raw scales — usable as e.g. bg-sunset-500).
        // Sourced from tokens/tokens.css (mirror of DESIGN.md).
        sunset: {
          50: "#fff3e7",
          100: "#ffe0bf",
          200: "#ffc179",
          300: "#ff9e33",
          400: "#ff7f00",
          500: "#ff5f00",
          600: "#ef4b00",
          700: "#c73a00",
          800: "#9f3000",
          900: "#7d2700",
          950: "#431300",
        },
        wviolet: {
          50: "#fdf1f5",
          100: "#f9dce5",
          200: "#f2b6c6",
          300: "#ea8aa6",
          400: "#dd6186",
          500: "#cf3c69",
          600: "#b92a56",
          700: "#972144",
          800: "#741a36",
          900: "#561329",
          950: "#2d0914",
        },
        sand: {
          50: "#fcfaf5",
          100: "#f6f1e7",
          200: "#ebdfc8",
          300: "#dac39f",
          400: "#c2a677",
          500: "#ab8c5b",
          600: "#957850",
          700: "#7a6343",
          800: "#625137",
          900: "#4f412d",
          950: "#292218",
        },
        night: {
          50: "#f2f0f3",
          100: "#e4e1e7",
          200: "#cbc7d3",
          300: "#aaa4b8",
          400: "#847d9a",
          500: "#6a6380",
          600: "#57516a",
          700: "#464055",
          800: "#393444",
          900: "#201e28",
          950: "#12111a",
        },
      },
      fontFamily: {
        display: ["'Bricolage Grotesque'", "Outfit", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: {
        // Canonical Wranngle radius scale (DESIGN.md): 4 / 8 / 12 / 16 / 24 / pill.
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        '2xl': "24px",
        pill: "9999px",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
}
export default config

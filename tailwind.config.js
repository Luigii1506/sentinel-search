/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Brand palette ────────────────────────────────────────────
        // Use directly: bg-brand-blue, text-electric-400, border-navy-700.
        // Mirrors src/lib/design-tokens.ts — keep both in sync.
        brand: {
          electric: "#00D4FF",
          blue:     "#1F6FEB",
          navy:     "#0A2540",
          blanco:   "#FFFFFF",
          carbon:   "#0B1220",
        },
        electric: {
          DEFAULT: "#00D4FF",
          50:  "#E6FAFF",
          100: "#B8F1FF",
          200: "#80E5FF",
          300: "#40D8FF",
          400: "#1ACFFF",
          500: "#00D4FF",
          600: "#00AECC",
          700: "#0089A6",
          800: "#006680",
          900: "#003D4D",
        },
        navy: {
          DEFAULT: "#0A2540",
          50:  "#E8EFF7",
          100: "#B7C9DD",
          200: "#7794B8",
          300: "#3F6594",
          400: "#274A7A",
          500: "#1B3760",
          600: "#142849",
          700: "#0F1C32",
          800: "#0A2540",
          900: "#06090F",
        },

        // ── Shadcn semantic tokens (resolved via CSS vars in index.css) ─
        // All carry `<alpha-value>` so opacity modifiers work on them
        // (e.g. bg-card/50, bg-foreground/5, border-foreground/10). Without
        // it Tailwind can't inject alpha into an hsl(var(--x)) color and the
        // /<opacity> suffix is silently dropped.
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary: "hsl(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        // Brand glow utilities — use sparingly for focus states and
        // hover on primary CTAs / featured cards.
        "electric-sm": "0 0 0 1px rgba(0, 212, 255, 0.3), 0 0 10px rgba(0, 212, 255, 0.15)",
        "electric": "0 0 0 1px rgba(0, 212, 255, 0.4), 0 0 24px rgba(0, 212, 255, 0.25)",
        "electric-lg": "0 0 0 1px rgba(0, 212, 255, 0.5), 0 0 48px rgba(0, 212, 255, 0.4)",
        "navy": "0 8px 32px rgba(10, 37, 64, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)",
        "navy-lg": "0 16px 64px rgba(10, 37, 64, 0.5), 0 4px 16px rgba(0, 0, 0, 0.3)",
      },
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #1F6FEB 0%, #00D4FF 100%)",
        "gradient-deep":    "linear-gradient(135deg, #0A2540 0%, #1F6FEB 100%)",
        "gradient-hero":    "linear-gradient(135deg, #0B1220 0%, #0A2540 60%, #1F6FEB 100%)",
        "gradient-electric":"linear-gradient(135deg, #00D4FF 0%, #1F6FEB 100%)",
      },
      fontFamily: {
        // Inter for product UI, JetBrains Mono for code/IDs/keys.
        // Loaded in index.css via Google Fonts. Override here once you
        // add a brand display font.
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
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
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
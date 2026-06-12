/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#b86a4e",
          hover: "#9e583d",
          muted: "#edd9cf",
        },
        background: "#e9e5de",
        surface: "#f3f1ec",
        border: "#d1d9e0",
        text: {
          DEFAULT: "#2a3140",
          secondary: "#5a6575",
          muted: "#8a939f",
        },
        error: {
          DEFAULT: "#a85a5a",
          muted: "#f0e0e0",
        },
        success: {
          DEFAULT: "#5a8f72",
          muted: "#e0ede7",
        },
        warning: {
          DEFAULT: "#b8925a",
          muted: "#f0e8d8",
        },
        ds: {
          base: "#e9e5de",
          "base-subtle": "#dfdbd4",
          surface: "#f3f1ec",
          "surface-raised": "#faf9f6",
          structure: "#b4bfc9",
          "structure-muted": "#d1d9e0",
          text: {
            DEFAULT: "#2a3140",
            secondary: "#5a6575",
            muted: "#8a939f",
          },
          accent: {
            DEFAULT: "#b86a4e",
            hover: "#9e583d",
            muted: "#edd9cf",
          },
          focus: {
            DEFAULT: "#6b8f9c",
            muted: "#d4e4e8",
          },
          success: {
            DEFAULT: "#5a8f72",
            muted: "#e0ede7",
          },
          warning: {
            DEFAULT: "#b8925a",
            muted: "#f0e8d8",
          },
          error: {
            DEFAULT: "#a85a5a",
            muted: "#f0e0e0",
          },
        },
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "ds-xs": "4px",
        "ds-sm": "6px",
        "ds-md": "10px",
        "ds-lg": "14px",
        "ds-xl": "18px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)",
        elevated: "0 4px 24px rgba(15, 23, 42, 0.1)",
        "ds-sm": "0 1px 2px rgba(42, 49, 64, 0.05)",
        "ds-card":
          "0 1px 0 rgba(42, 49, 64, 0.04), 0 4px 16px rgba(42, 49, 64, 0.06)",
        "ds-elevated": "0 8px 32px rgba(42, 49, 64, 0.1)",
        "ds-riso": "2px 2px 0 rgba(107, 143, 156, 0.22)",
        "ds-riso-accent": "2px 2px 0 rgba(184, 106, 78, 0.2)",
      },
      fontFamily: {
        display: ['"Sora"', "ui-sans-serif", "system-ui", "sans-serif"],
        body: ['"Source Sans 3"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563eb",
          hover: "#1d4ed8",
          muted: "#eff6ff",
        },
        background: "#f8fafc",
        surface: "#ffffff",
        border: "#e2e8f0",
        text: {
          DEFAULT: "#0f172a",
          secondary: "#64748b",
          muted: "#94a3b8",
        },
        error: {
          DEFAULT: "#dc2626",
          muted: "#fef2f2",
        },
        success: {
          DEFAULT: "#059669",
          muted: "#ecfdf5",
        },
        warning: {
          DEFAULT: "#d97706",
          muted: "#fffbeb",
        },
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04)",
        elevated: "0 4px 24px rgba(15, 23, 42, 0.1)",
      },
    },
  },
  plugins: [],
};

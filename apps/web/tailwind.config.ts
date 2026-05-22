import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        surface: "#f6f7f4",
        panel: "#ffffff",
        line: "#d9ded6",
        moss: "#5a6f54",
        steel: "#4d6a7a",
        coral: "#b95f4b",
        amber: "#b9872e",
      },
      boxShadow: {
        soft: "0 18px 45px rgba(28, 40, 31, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

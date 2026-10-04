/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: "#FFF9F0",
        ink: "#294A60",
        leaf: "#65A878",
        forest: "#173F30",
        sage: "#A9C5A9",
        muted: "#536B73",
        mist: "#557186",
        placeholder: "#718897",
        sprout: "#2C7A4B",
      },
      fontFamily: {
        display: ["Nunito_800ExtraBold"],
        brand: ["Nunito_700Bold"],
        soft: ["Nunito_500Medium"],
        body: ["Inter_400Regular"],
        strong: ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@/components": "./src/shared/components",
            "@/lib": "./src/shared/lib",
            "@assets": "./assets",
            "@": "./src",
          },
        },
      ],
    ],
  };
};

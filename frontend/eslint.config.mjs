import nextConfig from "eslint-config-next";

export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
      "android/**",
      "public/_next/**",
      "**/*.min.js",
    ],
  },
  ...nextConfig,
  {
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

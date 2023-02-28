module.exports = {
  extends: ["next", "turbo", "prettier"],
  ignorePatterns: ["**/coverage/*"],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "no-console": 2
  },
};

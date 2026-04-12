const path = require("node:path");

/** @type {import("next").NextConfig} */
const nextConfig = {
  // Parent repo has another package-lock (backend/). Pin Turbopack root to this app.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

module.exports = nextConfig;

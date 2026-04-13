import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const nextConfig = {
  // Parent repo has another package-lock (backend/). Pin Turbopack root to this app.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module; keep it external to the server bundle
  // so its prebuilt binary is loaded at runtime instead of being bundled.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;

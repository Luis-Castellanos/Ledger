import type { NextConfig } from "next";
import { getSecurityHeaders } from "@/lib/setup/security-headers";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: getSecurityHeaders(),
      },
    ];
  },
};

export default nextConfig;

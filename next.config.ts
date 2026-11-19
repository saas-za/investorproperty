import type { NextConfig } from "next";

const PORTAL = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://portal.parcello.co.za").replace(/\/$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    // Express interest on /frankendale is answered by Parcello, which sends the invitation.
    return [{ source: "/api/frankendale-interest", destination: `${PORTAL}/api/public/frankendale-access` }];
  },
};

export default nextConfig;

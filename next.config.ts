import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.18.77"],
  devIndicators: {
    position: "bottom-right",
  },
  outputFileTracingIncludes: {
    "/EscalaCOD": ["./app/database/Escala COD 2026.xlsx"],
  },
}

export default nextConfig

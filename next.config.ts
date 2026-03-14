import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "mineflayer",
    "minecraft-protocol",
    "minecraft-data",
    "prismarine-physics",
    "prismarine-world",
    "prismarine-chunk",
    "prismarine-block",
    "prismarine-entity",
    "prismarine-item",
    "prismarine-windows",
    "prismarine-recipe",
    "prismarine-biome",
    "prismarine-nbt",
    "prismarine-chat",
    "minecraft-assets",
  ],
};

export default nextConfig;

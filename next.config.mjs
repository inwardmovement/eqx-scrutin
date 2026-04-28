import { execSync } from "node:child_process"

const gitHash = (() => {
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
  } catch {
    return ""
  }
})()

/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  env: {
    GIT_HASH: gitHash,
  },
}

export default nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  /*
    Opt-in build directory, so a dev server can run beside a production one.

    `pnpm run build` and `next dev` share `.next` by default and corrupt each
    other's chunks -- the bundle stops parsing, React never hydrates, and the
    server-rendered spinner freezes on screen (LESSONS.md L-014). That is why a
    second server "could not" be started while Ali's was running. The port was
    never the constraint; this directory was.

    Unset, everything behaves exactly as before. Set, the dev server gets its
    own tree and leaves the running production build untouched:

      NEXT_DIST_DIR=.next-dev pnpm exec next dev --port 3005
  */
  distDir: process.env.NEXT_DIST_DIR || '.next',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable internet access for API routes
  serverExternalPackages: ['@google/generative-ai'],
  /*
    `/assessment` was renamed to `/analysis` on 2026-08-09. Deleting a route
    does not delete the tabs, bookmarks and browser history already pointing at
    it — they just start 404ing, which is exactly what happened here.

    307, not 308: a permanent redirect is cached by the browser and survives
    the config being changed back, which is a bad trade before a live demo.
  */
  async redirects() {
    return [
      { source: '/assessment', destination: '/analysis', permanent: false },
      { source: '/assessment/:path*', destination: '/analysis/:path*', permanent: false },
    ]
  },
  // Allow external API calls
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ]
  },
}

export default nextConfig

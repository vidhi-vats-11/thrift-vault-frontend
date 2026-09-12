import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  // loadEnv merges the .env files with the real process environment, which is how
  // the VITE_API_URL set in the Vercel project settings reaches us at build time.
  const env = loadEnv(mode, process.cwd(), '')

  // Vite inlines VITE_API_URL into the bundle when it builds. If it is missing,
  // the bundle would fall back to http://localhost:4000/api/v1 and the deployed
  // storefront would fail on every request with no obvious cause. Fail the build
  // instead: a red deploy leaves the previous (working) one live.
  if (command === 'build' && !env.VITE_API_URL) {
    throw new Error(
      'VITE_API_URL is not set, so this build would ship the localhost dev ' +
        'fallback to production. Set it to the backend base URL including the ' +
        '/api/v1 suffix (see .env.example) — in Vercel: Project Settings > ' +
        'Environment Variables.'
    )
  }

  return {
    plugins: [react()],
    server: {
      allowedHosts: true,
      // Deliberately no `proxy` here. The browser calls VITE_API_URL directly in
      // both dev and production, so the backend URL has a single source of truth.
      // Adding a dev proxy would create a second one that only works locally.
    },
  }
})

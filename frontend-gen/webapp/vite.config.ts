import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (env.MOBIMGR_WEB_ORIGIN) process.env.MOBIMGR_WEB_ORIGIN = env.MOBIMGR_WEB_ORIGIN
  if (env.MOBIMGR_INTEGRATE_BACKEND != null && env.MOBIMGR_INTEGRATE_BACKEND !== '')
    process.env.MOBIMGR_INTEGRATE_BACKEND = env.MOBIMGR_INTEGRATE_BACKEND

  return {
    plugins: [
      build(),
      devServer({
        adapter,
        entry: 'src/index.tsx',
      }),
    ],
  }
})

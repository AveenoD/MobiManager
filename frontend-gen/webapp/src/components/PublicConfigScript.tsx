type Props = {
  webOrigin: string
  integrateBackend: boolean
}

/** Injects `window.__MOBIMGR_CONFIG__` for `public/static/app.js` (cross-app auth). */
export const PublicConfigScript = ({ webOrigin, integrateBackend }: Props) => {
  const payload = JSON.stringify({ webOrigin, integrateBackend })
  return <script dangerouslySetInnerHTML={{ __html: `window.__MOBIMGR_CONFIG__=${payload};` }} />
}

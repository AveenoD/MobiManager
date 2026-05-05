import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MobiManager API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css">
  <style>
    body {
      margin: 0;
      padding: 0;
    }
    .topbar {
      display: none;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <p id="swagger-ui-error" style="display:none;padding:1rem;color:#b91c1c;font-family:system-ui,sans-serif;"></p>
  <script>
    (function () {
      var SWAGGER_VERSION = '5.11.0';
      var CDN = 'https://unpkg.com/swagger-ui-dist@' + SWAGGER_VERSION + '/';

      function fail(msg) {
        var el = document.getElementById('swagger-ui-error');
        if (el) { el.style.display = 'block'; el.textContent = msg; }
      }

      function inject(src, onload, onerror) {
        var s = document.createElement('script');
        s.src = src;
        s.charset = 'UTF-8';
        s.async = false;
        s.onload = onload;
        s.onerror = onerror || function () {
          fail('Failed to load script: ' + src);
        };
        document.body.appendChild(s);
      }

      // Single bundle is enough: standalone preset is optional and its CDN global is unreliable across builds.
      inject(CDN + 'swagger-ui-bundle.js', function () {
        var SB = window.SwaggerUIBundle;
        if (typeof SB !== 'function') {
          fail('Swagger UI bundle did not attach SwaggerUIBundle on window.');
          return;
        }
        SB({
          url: '/api/openapi-spec',
          dom_id: '#swagger-ui',
          presets: [SB.presets.apis],
          layout: 'BaseLayout',
          deepLinking: true,
          docExpansion: 'list',
          filter: true,
          showExtensions: true,
          showCommonExtensions: true,
        });
      });
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache',
    },
  });
}
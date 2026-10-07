const https = require('https');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, 'certs');
const tls = {
  key: fs.readFileSync(path.join(certDir, 'descope.internal+1-key.pem')),
  cert: fs.readFileSync(path.join(certDir, 'descope.internal+1.pem')),
};

const BACKEND = { host: 'descope.internal', port: 8443 };
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
};

// Returned as an object rather than set directly, so the proxy can stamp these
// onto its response after the upstream headers rather than hoping the merge
// goes the right way. The backend answers `*`, which a browser rejects outright
// on a credentialed request.
const corsHeaders = (req) => {
  const origin = req.headers.origin;
  if (!origin) return {};
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers':
      req.headers['access-control-request-headers'] ||
      'authorization,content-type',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    // Chrome remembers a preflight answer. One bad answer early on then sticks
    // around long after the server is fixed, which is a miserable thing to debug.
    'access-control-max-age': '0',
  };
};

const cors = (req, res) => {
  Object.entries(corsHeaders(req)).forEach(([k, v]) => res.setHeader(k, v));
};

// The local backend serves a certificate from Descope's own CA, which Chrome
// will not accept for cross-origin XHR. Proxying it through this origin - which
// has an mkcert certificate - sidesteps that, and incidentally mirrors
// production, where a custom domain serves the page and the API together.
const proxy = (req, res) => {
  const headers = { ...req.headers, host: `${BACKEND.host}:${BACKEND.port}` };
  delete headers['accept-encoding'];
  const up = https.request(
    {
      ...BACKEND,
      path: req.url,
      method: req.method,
      headers,
      rejectUnauthorized: false,
    },
    (upRes) => {
      // ours last, so the backend's `*` can never win
      const out = { ...upRes.headers, ...corsHeaders(req) };
      // The OIDC authorize endpoint sends the browser to the hosted login page
      // by absolute url on the backend's own port, which serves a certificate
      // Chrome does not trust. Keep the browser on this origin instead.
      if (out.location) {
        out.location = out.location.replace(
          `${BACKEND.host}:${BACKEND.port}`,
          `${BACKEND.host}:3100`,
        );
      }
      res.writeHead(upRes.statusCode, out);
      upRes.pipe(res);
    },
  );
  up.setTimeout(60000);
  up.on('error', (e) => {
    console.error('PROXY ERROR', req.method, req.url, '->', e.message);
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain' });
    res.end(`proxy error: ${e.message}`);
  });
  req.pipe(up);
};

const serve = (root, port, withProxy) => {
  https
    .createServer(tls, (req, res) => {
      cors(req, res);
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
      }

      const { pathname } = new URL(req.url, 'https://x');
      // /oauth2 is the OIDC authorize endpoint. /login is NOT proxied - the
      // backend has no page there, and we serve it ourselves below.
      if (withProxy && /^\/(v1|v2|oauth2)\//.test(pathname)) {
        return proxy(req, res);
      }

      // The OIDC authorize endpoint sends the browser to /login/<projectId>,
      // which is auth-hosting's url shape in production. The same page serves
      // it: the flow component picks the OIDC state off the query string by
      // itself, so a login page is just a page that runs the flow.
      const login =
        withProxy && /^\/login\/P[A-Za-z0-9]{26,30}$/.test(pathname);

      const file = login
        ? path.join(root, 'popup-flow.html')
        : path.join(root, pathname === '/' ? 'index.html' : pathname);
      if (
        !file.startsWith(root) ||
        !fs.existsSync(file) ||
        fs.statSync(file).isDirectory()
      ) {
        res.writeHead(404);
        return res.end('not found');
      }
      res.writeHead(200, {
        'content-type':
          types[path.extname(file)] || (login ? types['.html'] : 'text/plain'),
      });
      return fs.createReadStream(file).pipe(res);
    })
    .listen(port, '127.0.0.1', () =>
      console.log(`${root} on :${port}${withProxy ? ' (+api proxy)' : ''}`),
    );
};

serve(path.join(__dirname, 'auth'), 3100, true); // descope.internal - page + API
serve(path.join(__dirname, 'app'), 3101, false); // app.localtest.me - the app

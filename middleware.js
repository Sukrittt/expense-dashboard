const UNPROTECTED_PREFIXES = ['/__vercel', '/_vercel', '/.well-known'];

function decodeBasicAuth(headerValue = '') {
  const [scheme, encoded] = headerValue.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'basic' || !encoded) return null;

  try {
    const decoded = atob(encoded);
    const separator = decoded.indexOf(':');
    if (separator === -1) return null;

    return {
      user: decoded.slice(0, separator),
      pass: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

function unauthorized() {
  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Expense Dashboard", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  });
}

export default function middleware(request) {
  const { pathname } = new URL(request.url);

  if (UNPROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return;
  }

  const expectedUser = globalThis.process?.env?.BASIC_AUTH_USER;
  const expectedPass = globalThis.process?.env?.BASIC_AUTH_PASS;

  if (!expectedUser || !expectedPass) {
    return new Response('Server is not configured for authentication.', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const credentials = decodeBasicAuth(request.headers.get('authorization') || '');
  const isAuthorized =
    credentials && credentials.user === expectedUser && credentials.pass === expectedPass;

  if (!isAuthorized) {
    return unauthorized();
  }
}

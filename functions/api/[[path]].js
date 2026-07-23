export async function onRequest(context) {
  const origin = context.env.API_ORIGIN;

  if (!origin) {
    return Response.json(
      { success: false, error: 'API_ORIGIN is not configured' },
      { status: 500 },
    );
  }

  const incomingUrl = new URL(context.request.url);
  const path = Array.isArray(context.params.path)
    ? context.params.path.join('/')
    : (context.params.path || '');

  const targetUrl = new URL(`/api/${path}`, origin);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers(context.request.headers);
  headers.delete('host');

  return fetch(targetUrl, {
    method: context.request.method,
    headers,
    body: ['GET', 'HEAD'].includes(context.request.method)
      ? undefined
      : context.request.body,
    redirect: 'manual',
  });
}
export async function onRequest(context) {
  const { request, env, params } = context;
  const key = params.key;
  
  if (request.method === "GET") {
    const row = await env.DB.prepare("SELECT value FROM kv_store WHERE key = ?").bind(key).first();
    if (!row) return new Response(null, { status: 404 });
    return new Response(row.value, { headers: { "Content-Type": "application/json" } });
  }
  
  if (request.method === "PUT") {
    const body = await request.text();
    await env.DB.prepare("INSERT OR REPLACE INTO kv_store(key, value) VALUES(?,?)").bind(key, body).run();
    return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
  }
  
  return new Response("not found", { status: 404 });
}

// 聊天室 API - Cloudflare Pages Functions
// 对应 GitHub 仓库路径：functions/api/chat.js
// 自动建表，无需手动进 D1 后台执行 SQL

async function ensureTables(env){
  await env.DB.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      salt TEXT NOT NULL,
      hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tokens (
      token TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created INTEGER
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      text TEXT,
      media TEXT,
      time INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      time INTEGER NOT NULL
    );
  `);
}

function json(data, status){
  return Response.json(data, { status: status || 200 });
}

function randHex(n){
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function sha256hex(text){
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
}

async function tokenName(token, env){
  if(!token) return null;
  const row = await env.DB.prepare("SELECT name FROM tokens WHERE token = ?").bind(token).first();
  return row ? row.name : null;
}

async function apiRegister(env, body){
  const name = (body.name || "").trim();
  const password = body.password || "";
  if(!/^[\u4e00-\u9fa5a-zA-Z0-9_]{1,16}$/.test(name)){
    return json({ok:false, error:"名字只能用中文/字母/数字/下划线，1-16个字符"});
  }
  if(password.length < 4 || password.length > 32){
    return json({ok:false, error:"密码长度4-32位"});
  }
  const salt = randHex(16);
  const hash = await sha256hex(salt + password);
  try{
    await env.DB.prepare("INSERT INTO users (name, salt, hash) VALUES (?, ?, ?)")
      .bind(name, salt, hash).run();
  }catch(e){
    return json({ok:false, error:"这个名字已被注册"});
  }
  return json({ok:true});
}

async function apiLogin(env, body){
  const name = (body.name || "").trim();
  const password = body.password || "";
  const user = await env.DB.prepare("SELECT salt, hash FROM users WHERE name = ?").bind(name).first();
  if(!user) return json({ok:false, error:"用户不存在，先注册吧"});
  const hash = await sha256hex(user.salt + password);
  if(hash !== user.hash) return json({ok:false, error:"密码错误"});
  const token = randHex(32);
  await env.DB.prepare("DELETE FROM tokens WHERE name = ?").bind(name).run();
  await env.DB.prepare("INSERT INTO tokens (token, name, created) VALUES (?, ?, ?)")
    .bind(token, name, Date.now()).run();
  return json({ok:true, token, name});
}

async function apiSend(request, env, body){
  const nm = await tokenName(body.token, env);
  if(!nm) return json({ok:false, error:"登录已失效，请重新登录"});
  if(body.type === "text"){
    const text = (body.content || "").trim();
    if(!text) return json({ok:false, error:"不能发空消息"});
    if(text.length > 2000) return json({ok:false, error:"消息太长（最多2000字）"});
    const r = await env.DB.prepare("INSERT INTO messages (name, type, text, time) VALUES (?, 'text', ?, ?)")
      .bind(nm, text, Date.now()).run();
    return json({ok:true, id: Number(r.meta.last_row_id)});
  }
  if(body.type === "image" || body.type === "video"){
    const dataUrl = body.content || "";
    if(dataUrl.length > 8000000){
      return json({ok:false, error:"文件太大（图片/视频请控制在5MB以内）"});
    }
    if(dataUrl.indexOf("data:") !== 0){
      return json({ok:false, error:"文件格式不对"});
    }
    const mediaId = randHex(16);
    const now = Date.now();
    await env.DB.prepare("INSERT INTO media (id, data, time) VALUES (?, ?, ?)")
      .bind(mediaId, dataUrl, now).run();
    const r = await env.DB.prepare("INSERT INTO messages (name, type, media, time) VALUES (?, ?, ?, ?)")
      .bind(nm, body.type, mediaId, now).run();
    return json({ok:true, id: Number(r.meta.last_row_id)});
  }
  return json({ok:false, error:"消息类型不支持"});
}

async function apiMessages(env, body){
  const after = parseInt(body.after || "0", 10);
  const rows = await env.DB.prepare(
    "SELECT id, name, type, text, media, time FROM messages WHERE id > ? ORDER BY id ASC LIMIT 100"
  ).bind(after).all();
  return json({ok:true, msgs: rows.results});
}

async function apiMedia(env, body){
  const id = body.id || "";
  const row = await env.DB.prepare("SELECT data FROM media WHERE id = ?").bind(id).first();
  if(!row) return json({ok:false, error:"文件不存在或已过期"});
  return json({ok:true, dataUrl: row.data});
}

async function apiMe(env, body){
  const nm = await tokenName(body.token, env);
  return nm ? json({ok:true, name: nm}) : json({ok:false, error:"未登录"});
}

export async function onRequest(context){
  const { request, env } = context;
  if(request.method !== "POST"){
    return json({ok:false, error:"仅支持POST"}, 405);
  }
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/chat/, "");
  try{
    await ensureTables(env);
    const body = await request.json().catch(() => ({}));
    if(path === "/register") return await apiRegister(env, body);
    if(path === "/login") return await apiLogin(env, body);
    if(path === "/send") return await apiSend(request, env, body);
    if(path === "/messages") return await apiMessages(env, body);
    if(path === "/media") return await apiMedia(env, body);
    if(path === "/me") return await apiMe(env, body);
    return json({ok:false, error:"接口不存在"}, 404);
  }catch(e){
    return json({ok:false, error:"服务器错误: " + e.message}, 500);
  }
}

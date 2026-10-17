// ============================================================
// 聊天室 - Cloudflare Worker（D1 数据库版，免费额度高）
// 一个文件搞定：网页 + 服务器
// 部署方法见文件末尾注释
// ============================================================

const PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>聊天室</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;background:#ededed;height:100vh;overflow:hidden;}

/* ---------- 登录页 ---------- */
#authPage{position:fixed;inset:0;background:linear-gradient(135deg,#07c160 0%,#06ad56 100%);display:flex;align-items:center;justify-content:center;z-index:10;}
.auth-card{background:#fff;border-radius:16px;padding:32px 28px;width:min(92vw,360px);box-shadow:0 8px 32px rgba(0,0,0,.18);}
.auth-card h1{font-size:22px;text-align:center;color:#1a1a1a;margin-bottom:4px;}
.auth-card .sub{font-size:13px;text-align:center;color:#999;margin-bottom:24px;}
.auth-tabs{display:flex;margin-bottom:20px;background:#f2f2f2;border-radius:10px;overflow:hidden;}
.auth-tabs div{flex:1;text-align:center;padding:9px 0;font-size:14px;cursor:pointer;color:#666;transition:.2s;}
.auth-tabs div.on{background:#07c160;color:#fff;font-weight:600;}
.field{margin-bottom:14px;}
.field input{width:100%;padding:12px 14px;border:1px solid #e0e0e0;border-radius:10px;font-size:15px;outline:none;transition:.2s;}
.field input:focus{border-color:#07c160;}
.auth-btn{width:100%;padding:13px 0;background:#07c160;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;transition:.2s;}
.auth-btn:hover{background:#06ad56;}
.auth-btn:disabled{background:#9be3bf;cursor:not-allowed;}
.auth-msg{font-size:13px;color:#e64340;text-align:center;margin-top:12px;min-height:18px;}

/* ---------- 聊天页 ---------- */
#chatPage{display:none;height:100vh;flex-direction:column;max-width:720px;margin:0 auto;background:#ededed;}
#chatPage.show{display:flex;}
.chat-head{background:#2e2e2e;color:#fff;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;}
.chat-head .title{font-size:17px;font-weight:600;}
.chat-head .right{display:flex;align-items:center;gap:12px;font-size:13px;color:#ccc;}
.chat-head .logout{color:#ff9b9b;cursor:pointer;padding:4px 8px;}
.chat-head .logout:hover{background:rgba(255,255,255,.1);border-radius:6px;}
#msgList{flex:1;overflow-y:auto;padding:16px 12px 20px;display:flex;flex-direction:column;gap:12px;}
.msg{max-width:78%;display:flex;flex-direction:column;}
.msg .bubble{padding:10px 14px;border-radius:14px;font-size:15px;line-height:1.5;word-break:break-word;box-shadow:0 1px 2px rgba(0,0,0,.06);}
.msg .meta{font-size:11px;color:#999;margin:2px 4px 0;}
.msg .bubble img{max-width:100%;max-height:260px;border-radius:8px;display:block;}
.msg .bubble video{max-width:100%;max-height:260px;border-radius:8px;display:block;background:#000;}
.msg.mine{align-self:flex-end;align-items:flex-end;}
.msg.mine .bubble{background:#95ec69;}
.msg.theirs{align-self:flex-start;align-items:flex-start;}
.msg.theirs .bubble{background:#fff;}
.msg.theirs .meta{color:#888;}

.chat-input{background:#f7f7f7;border-top:1px solid #e2e2e2;padding:10px 12px;display:flex;align-items:flex-end;gap:8px;flex-shrink:0;}
.chat-input .attach{display:flex;gap:6px;flex-shrink:0;}
.chat-input .icon-btn{width:38px;height:38px;border:none;border-radius:8px;background:#fff;font-size:18px;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;transition:.15s;}
.chat-input .icon-btn:active{transform:scale(.92);}
.chat-input textarea{flex:1;border:1px solid #ddd;border-radius:10px;padding:9px 12px;font-size:15px;resize:none;outline:none;max-height:90px;background:#fff;}
.chat-input textarea:focus{border-color:#07c160;}
.send-btn{flex-shrink:0;background:#07c160;color:#fff;border:none;border-radius:8px;padding:9px 18px;font-size:15px;font-weight:600;cursor:pointer;transition:.2s;}
.send-btn:hover{background:#06ad56;}
.send-btn:disabled{background:#9be3bf;cursor:not-allowed;}

.tip{text-align:center;color:#aaa;font-size:12px;padding:4px 0;}
</style>
</head>
<body>

<!-- 登录页 -->
<div id="authPage">
  <div class="auth-card">
    <h1>聊天室</h1>
    <div class="sub">注册一个名字，拉上朋友一起聊</div>
    <div class="auth-tabs">
      <div id="tabLogin" class="on" onclick="switchTab('login')">登录</div>
      <div id="tabReg" onclick="switchTab('reg')">注册</div>
    </div>
    <div class="field"><input id="inName" placeholder="名字（中文/字母/数字/下划线）" maxlength="16"></div>
    <div class="field"><input id="inPass" type="password" placeholder="密码（4-32位）" maxlength="32"></div>
    <button class="auth-btn" id="authBtn" onclick="doAuth()">登 录</button>
    <div class="auth-msg" id="authMsg"></div>
  </div>
</div>

<!-- 聊天页 -->
<div id="chatPage">
  <div class="chat-head">
    <div class="title">聊天室</div>
    <div class="right">
      <span id="meName"></span>
      <span class="logout" onclick="logout()">退出</span>
    </div>
  </div>
  <div id="msgList">
    <div class="tip">—— 欢迎来到聊天室 ——</div>
  </div>
  <div class="chat-input">
    <div class="attach">
      <button class="icon-btn" title="发图片" onclick="document.getElementById('fileImg').click()">🖼</button>
      <button class="icon-btn" title="发视频" onclick="document.getElementById('fileVideo').click()">🎬</button>
    </div>
    <textarea id="inText" rows="1" placeholder="说点什么..." onkeydown="onKey(event)"></textarea>
    <button class="send-btn" id="sendBtn" onclick="sendText()">发送</button>
    <input type="file" id="fileImg" accept="image/*" style="display:none" onchange="sendImage(this)">
    <input type="file" id="fileVideo" accept="video/*" style="display:none" onchange="sendVideo(this)">
  </div>
</div>

<script>
var token = "";
var name = "";
var lastId = 0;
var pollTimer = null;

function switchTab(m){
  var isLogin = m === "login";
  document.getElementById("tabLogin").className = isLogin ? "on" : "";
  document.getElementById("tabReg").className = isLogin ? "" : "on";
  document.getElementById("authBtn").textContent = isLogin ? "登 录" : "注 册";
  document.getElementById("authMsg").textContent = "";
  window.__loginMode = isLogin;
}
window.__loginMode = true;

function setAuthMsg(s){ document.getElementById("authMsg").textContent = s; }

async function doAuth(){
  var n = document.getElementById("inName").value.trim();
  var p = document.getElementById("inPass").value;
  if(!n){ setAuthMsg("请输入名字"); return; }
  if(p.length < 4){ setAuthMsg("密码至少4位"); return; }
  var btn = document.getElementById("authBtn");
  btn.disabled = true;
  try{
    var url = window.__loginMode ? "/api/login" : "/api/register";
    var r = await fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({name: n, password: p})
    });
    var d = await r.json();
    if(d.ok){
      if(window.__loginMode){
        token = d.token; name = d.name;
        localStorage.setItem("chat_token", token);
        localStorage.setItem("chat_name", name);
        enterChat();
      }else{
        setAuthMsg("注册成功，请登录");
        switchTab("login");
        document.getElementById("inPass").value = "";
      }
    }else{
      setAuthMsg(d.error || "出错了");
    }
  }catch(e){
    setAuthMsg("网络错误，请稍后再试");
  }
  btn.disabled = false;
}

function enterChat(){
  document.getElementById("authPage").style.display = "none";
  var page = document.getElementById("chatPage");
  page.classList.add("show");
  document.getElementById("meName").textContent = name;
  lastId = 0;
  document.getElementById("msgList").innerHTML = '<div class="tip">—— 欢迎来到聊天室 ——</div>';
  pollMessages(true);
  if(pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(function(){ pollMessages(false); }, 3000);
}

function logout(){
  if(pollTimer){ clearInterval(pollTimer); pollTimer = null; }
  localStorage.removeItem("chat_token");
  localStorage.removeItem("chat_name");
  document.getElementById("chatPage").classList.remove("show");
  document.getElementById("authPage").style.display = "flex";
}

function onKey(e){
  if(e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    sendText();
  }
}

async function sendText(){
  var inp = document.getElementById("inText");
  var text = inp.value.trim();
  if(!text) return;
  inp.value = "";
  autoGrow();
  try{
    await fetch("/api/send", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({token: token, type: "text", content: text})
    });
    pollMessages(true);
  }catch(e){}
}

function autoGrow(){
  var t = document.getElementById("inText");
  t.style.height = "auto";
  t.style.height = Math.min(t.scrollHeight, 90) + "px";
}
document.getElementById("inText").addEventListener("input", autoGrow);

function compressImage(file, cb){
  var reader = new FileReader();
  reader.onload = function(ev){
    var img = new Image();
    img.onload = function(){
      var maxW = 1280, maxH = 1280;
      var w = img.width, h = img.height;
      if(w > maxW){ h = h * maxW / w; w = maxW; }
      if(h > maxH){ w = w * maxH / h; h = maxH; }
      var c = document.createElement("canvas");
      c.width = Math.round(w); c.height = Math.round(h);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      cb(c.toDataURL("image/jpeg", 0.8));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function sendImage(input){
  var file = input.files[0];
  input.value = "";
  if(!file) return;
  compressImage(file, async function(dataUrl){
    if(dataUrl.length > 8000000){ alert("图片压缩后仍太大，换张更小的吧"); return; }
    try{
      await fetch("/api/send", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({token: token, type: "image", content: dataUrl})
      });
      pollMessages(true);
    }catch(e){}
  });
}

function sendVideo(input){
  var file = input.files[0];
  input.value = "";
  if(!file) return;
  if(file.size > 5*1024*1024){ alert("视频不能超过5MB，先压缩一下吧"); return; }
  var reader = new FileReader();
  reader.onload = async function(ev){
    try{
      await fetch("/api/send", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({token: token, type: "video", content: ev.target.result})
      });
      pollMessages(true);
    }catch(e){}
  };
  reader.readAsDataURL(file);
}

async function pollMessages(forceScroll){
  try{
    var r = await fetch("/api/messages?after=" + lastId);
    var d = await r.json();
    if(d.ok && d.msgs && d.msgs.length){
      var list = document.getElementById("msgList");
      var wasBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 60;
      for(var i = 0; i < d.msgs.length; i++){
        renderMsg(d.msgs[i]);
      }
      if(forceScroll || wasBottom) list.scrollTop = list.scrollHeight;
    }
  }catch(e){}
}

function renderMsg(m){
  lastId = m.id;
  var box = document.createElement("div");
  box.className = "msg " + (m.name === name ? "mine" : "theirs");
  var meta = document.createElement("div");
  meta.className = "meta";
  var t = new Date(m.time);
  var hh = ("0"+t.getHours()).slice(-2);
  var mm = ("0"+t.getMinutes()).slice(-2);
  meta.textContent = (m.name === name ? "我" : m.name) + "  " + hh + ":" + mm;
  var bubble = document.createElement("div");
  bubble.className = "bubble";
  if(m.type === "text"){
    bubble.textContent = m.text || "";
  }else if(m.type === "image"){
    var img = document.createElement("img");
    bubble.appendChild(img);
    loadMedia(m.media, function(dataUrl){
      img.src = dataUrl;
    });
  }else if(m.type === "video"){
    var video = document.createElement("video");
    video.controls = true;
    bubble.appendChild(video);
    loadMedia(m.media, function(dataUrl){
      video.src = dataUrl;
    });
  }
  box.appendChild(meta);
  box.appendChild(bubble);
  document.getElementById("msgList").appendChild(box);
}

async function loadMedia(mediaId, cb){
  try{
    var r = await fetch("/api/media?id=" + mediaId);
    var d = await r.json();
    if(d.ok) cb(d.dataUrl);
  }catch(e){}
}

// 恢复登录状态
(function(){
  var tk = localStorage.getItem("chat_token");
  var nm = localStorage.getItem("chat_name");
  if(tk && nm){
    fetch("/api/me?token=" + tk).then(function(r){ return r.json(); }).then(function(d){
      if(d.ok){ token = tk; name = d.name; enterChat(); }
    }).catch(function(){});
  }
})();
</script>
</body>
</html>`;

// ============================================================
// 工具函数
// ============================================================
function json(data, status){
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {"Content-Type": "application/json;charset=utf-8", "Cache-Control": "no-store"}
  });
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

// 建表（幂等，每次请求前确保表存在）
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

// ============================================================
// API
// ============================================================
async function apiRegister(request, env){
  const body = await request.json();
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

async function apiLogin(request, env){
  const body = await request.json();
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

async function apiSend(request, env){
  const body = await request.json();
  const nm = await tokenName(body.token, env);
  if(!nm) return json({ok:false, error:"登录已失效，请重新登录"});
  if(body.type === "text"){
    const text = (body.content || "").trim();
    if(!text) return json({ok:false, error:"不能发空消息"});
    if(text.length > 2000) return json({ok:false, error:"消息太长（最多2000字）"});
    const r = await env.DB.prepare("INSERT INTO messages (name, type, text, time) VALUES (?, 'text', ?, ?)")
      .bind(nm, text, Date.now()).run();
    return json({ok:true, id: r.meta.last_row_id});
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
    return json({ok:true, id: r.meta.last_row_id});
  }
  return json({ok:false, error:"消息类型不支持"});
}

async function apiMessages(url, env){
  const after = parseInt(url.searchParams.get("after") || "0", 10);
  const rows = await env.DB.prepare(
    "SELECT id, name, type, text, media, time FROM messages WHERE id > ? ORDER BY id ASC LIMIT 100"
  ).bind(after).all();
  return json({ok:true, msgs: rows.results});
}

async function apiMedia(url, env){
  const id = url.searchParams.get("id") || "";
  const row = await env.DB.prepare("SELECT data FROM media WHERE id = ?").bind(id).first();
  if(!row) return json({ok:false, error:"文件不存在或已过期"});
  return json({ok:true, dataUrl: row.data});
}

async function apiMe(url, env){
  const nm = await tokenName(url.searchParams.get("token"), env);
  return nm ? json({ok:true, name: nm}) : json({ok:false, error:"未登录"});
}

// ============================================================
// 入口
// ============================================================
export default {
  async fetch(request, env){
    const url = new URL(request.url);
    const path = url.pathname;

    if(request.method === "GET" && path === "/"){
      return new Response(PAGE, {
        headers: {"Content-Type": "text/html;charset=utf-8"}
      });
    }

    try{
      await ensureTables(env);
      if(path === "/api/register" && request.method === "POST") return await apiRegister(request, env);
      if(path === "/api/login" && request.method === "POST") return await apiLogin(request, env);
      if(path === "/api/send" && request.method === "POST") return await apiSend(request, env);
      if(path === "/api/messages" && request.method === "GET") return await apiMessages(url, env);
      if(path === "/api/media" && request.method === "GET") return await apiMedia(url, env);
      if(path === "/api/me" && request.method === "GET") return await apiMe(url, env);
    }catch(e){
      return json({ok:false, error:"服务器错误: " + e.message}, 500);
    }
    return json({ok:false, error:"接口不存在"}, 404);
  }
};

// ============================================================
// 部署方法：
// 1. 打开 https://dash.cloudflare.com → Workers & Pages → 创建 → Worker
//    名称填 chat，点部署
// 2. 点「编辑代码」，全选删除，把本文件全部内容粘贴进去 → 部署
// 3. 创建数据库：左侧菜单 Workers & Pages → D1 → 创建数据库，名称 chat_db
// 4. 回到 Worker → 设置 → 绑定 → D1 数据库 → 添加绑定：
//    变量名称填 DB，选 chat_db → 保存（绑定后会自动建表，无需手动建表）
// 5. 打开 https://chat.你的子域.workers.dev 就能用
// 免费额度：每天 10 万条消息、500 万次读取，小圈子随便聊不会爆
// ============================================================

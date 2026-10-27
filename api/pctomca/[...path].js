export const config = { api: { bodyParser: false } };

const UPSTREAM = "https://iot.clb4u.com";
const SKIP_REQ = new Set(["host", "connection", "content-length", "accept-encoding"]);
const SKIP_RES = new Set(["content-encoding", "transfer-encoding", "content-length"]);

function collect(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function rewriteCookies(cookies) {
  return cookies.map((cookie) => {
    const next = cookie
      .replace(/;\s*Domain=[^;]*/gi, "")
      .replace(/;\s*SameSite=[^;]*/gi, "")
      .replace(/;\s*Secure/gi, "");
    return `${next}; SameSite=None; Secure`;
  });
}

export default async function handler(req, res) {
  const pathRaw = req.query?.path;
  const extra = Array.isArray(pathRaw) ? pathRaw.join("/") : pathRaw ?? "";
  const search = req.url?.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const target = `${UPSTREAM}/${extra}${search}`;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || SKIP_REQ.has(key.toLowerCase())) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }
  headers.set("host", "iot.clb4u.com");

  const method = (req.method ?? "GET").toUpperCase();
  const body = method === "GET" || method === "HEAD" ? undefined : await collect(req);

  const upstream = await fetch(target, { method, headers, body, redirect: "manual" });
  res.statusCode = upstream.status;

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "set-cookie" || SKIP_RES.has(lower)) return;
    if (lower === "location") {
      res.setHeader("location", value.replace(/https?:\/\/iot\.clb4u\.com/gi, "/pctomca"));
      return;
    }
    res.setHeader(key, value);
  });

  const cookies = typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : [];
  if (cookies.length) res.setHeader("set-cookie", rewriteCookies(cookies));

  res.end(Buffer.from(await upstream.arrayBuffer()));
}

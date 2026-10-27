import type { ProxyOptions } from "vite";

function rewriteCookies(cookies: string[]): string[] {
  return cookies.map((cookie) =>
    cookie
      .replace(/;\s*Domain=[^;]*/gi, "")
      .replace(/;\s*Secure/gi, "")
      .replace(/;\s*SameSite=[^;]*/gi, "; SameSite=Lax")
      .replace(/;\s*HttpOnly/gi, "; HttpOnly")
  );
}

export const pctomcaProxy: ProxyOptions = {
  target: "https://iot.clb4u.com",
  changeOrigin: true,
  secure: true,
  rewrite: (path) => path.replace(/^\/pctomca/, ""),
  cookieDomainRewrite: "",
  configure(proxy) {
    proxy.on("proxyRes", (proxyRes) => {
      const cookies = proxyRes.headers["set-cookie"];
      if (cookies?.length) {
        proxyRes.headers["set-cookie"] = rewriteCookies(cookies);
      }
    });
  },
};

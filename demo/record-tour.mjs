import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { writeFileSync, writeSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const rawDir = path.join(root, "raw");
const frameDir = path.join(root, "screencast");
await mkdir(rawDir, { recursive: true });
await mkdir(frameDir, { recursive: true });

const log = (msg) => writeSync(1, msg + "\n");
const wait = (page, ms) => page.waitForTimeout(ms);

let browser;
setTimeout(() => {
  log("HARD_TIMEOUT");
  try {
    browser?.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
}, 175000);

const CURSOR_BOOT = `(() => {
  if (document.getElementById("demo-cursor")) return;
  const c = document.createElement("div");
  c.id = "demo-cursor";
  c.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M4 3.2 22.4 14.1l-7.3 1.5 3.1 7.6-3.8 1.6-3.1-7.5-6 5.2L4 3.2Z" fill="#fff" stroke="#0f172a" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  Object.assign(c.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "28px",
    height: "28px",
    zIndex: "2147483647",
    pointerEvents: "none",
    transform: "translate(-40px,-40px)",
    filter: "drop-shadow(0 2px 4px rgba(15,23,42,.45))",
  });
  document.documentElement.appendChild(c);
  window.addEventListener(
    "mousemove",
    (event) => {
      c.style.transform = "translate(" + event.clientX + "px," + event.clientY + "px)";
    },
    true,
  );
})()`;

async function ensureCursor(page) {
  await page.evaluate(CURSOR_BOOT).catch(() => {});
}

async function findButton(page, substr) {
  return page.evaluate((s) => {
    const buttons = [...document.querySelectorAll("button")];
    const b = buttons.find((el) => {
      const t = ((el.getAttribute("aria-label") || "") + " " + (el.innerText || "")).replace(/\s+/g, " ");
      return t.includes(s);
    });
    if (!b) return null;
    b.scrollIntoView({ block: "center", inline: "nearest" });
    const r = b.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 20) };
  }, substr);
}

async function hoverHoldText(page, substr, ms = 750) {
  const point = await findButton(page, substr);
  if (!point) {
    log("miss-hover " + substr);
    return false;
  }
  await page.mouse.move(point.x, point.y, { steps: 14 });
  await wait(page, ms);
  return true;
}

async function hoverClickText(page, substr, after = 1000, hoverMs = 750) {
  const point = await findButton(page, substr);
  if (!point) {
    log("miss-click " + substr);
    return false;
  }
  await page.mouse.move(point.x, point.y, { steps: 14 });
  await wait(page, hoverMs);
  await page.mouse.click(point.x, point.y);
  await wait(page, after);
  return true;
}

async function hoverClickSel(page, selector, after = 1000, hoverMs = 700) {
  const point = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 20) };
  }, selector);
  if (!point) {
    log("miss-sel " + selector);
    return false;
  }
  await page.mouse.move(point.x, point.y, { steps: 14 });
  await wait(page, hoverMs);
  await page.mouse.click(point.x, point.y);
  await wait(page, after);
  return true;
}

async function scrollDetail(page) {
  const moved = await page.evaluate(() => {
    const nodes = [...document.querySelectorAll(".dashboard-body.scroll-fade, .panel-body.scroll-fade, .info-panel-body.scroll-fade")];
    const el = nodes.find((n) => n.scrollHeight > n.clientHeight + 24);
    if (!el) return false;
    el.scrollTo({ top: el.scrollHeight * 0.72, behavior: "smooth" });
    return true;
  });
  if (!moved) return;
  await wait(page, 1200);
  await page.evaluate(() => {
    const nodes = [...document.querySelectorAll(".dashboard-body.scroll-fade, .panel-body.scroll-fade, .info-panel-body.scroll-fade")];
    const el = nodes.find((n) => n.scrollHeight > n.clientHeight + 24);
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight * 0.28, behavior: "smooth" });
  });
  await wait(page, 800);
}

log("launch");
try {
  browser = await chromium.launch({ headless: true, timeout: 20000 });
} catch (err) {
  log("launch-retry-edge " + (err?.message || err));
  browser = await chromium.launch({ headless: true, timeout: 20000, channel: "msedge" });
}
const context = await browser.newContext({
  viewport: { width: 1600, height: 900 },
});
const page = await context.newPage();
page.setDefaultTimeout(4000);
page.setDefaultNavigationTimeout(20000);
await page.addInitScript(CURSOR_BOOT);
const session = await context.newCDPSession(page);
let frameIndex = 0;
session.on("Page.screencastFrame", async ({ data, sessionId }) => {
  try {
    const name = String(frameIndex).padStart(5, "0") + ".jpg";
    frameIndex += 1;
    writeFileSync(path.join(frameDir, name), Buffer.from(data, "base64"));
  } catch {
    /* ignore */
  }
  await session.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
log("goto");
await page.goto("https://ao-tom.vercel.app/", { waitUntil: "domcontentloaded", timeout: 20000 });
await session.send("Page.startScreencast", { format: "jpeg", quality: 55, everyNthFrame: 2 });
await ensureCursor(page);
await wait(page, 600);

log("login");
await hoverClickText(page, "Xem bản đồ với dữ liệu đã lưu", 2600, 650);
log("wait-map");
await page.getByRole("button", { name: /ao đang quản trị/ }).waitFor({ timeout: 20000 });
await ensureCursor(page);
await wait(page, 900);
log("map-ready");

log("kpi-hover");
await hoverHoldText(page, "ao đang quản trị", 800);
await hoverHoldText(page, "ao nguy hiểm", 700);
await hoverHoldText(page, "xe chạy", 700);

log("region");
await hoverClickText(page, "ao đang quản trị", 1200);
await hoverClickText(page, "Trại Vĩnh Châu", 1300);
await hoverClickText(page, "Ao Vĩnh Châu 1", 1400);
await scrollDetail(page);
await hoverClickText(page, "Quay lại", 600, 350);
await hoverClickText(page, "Quay lại", 600, 350);
await hoverClickText(page, "Quay lại", 700, 350);

log("danger");
await hoverClickSel(page, ".dash-stat.danger", 1100);
await hoverClickSel(page, ".dashboard-pane .warn-drop button", 1300);
await scrollDetail(page);
await hoverClickText(page, "Quay lại", 600, 350);
await hoverClickText(page, "Quay lại", 700, 350);

log("collapse");
await hoverClickText(page, "Thu tổng quan", 900);

log("bell");
await hoverHoldText(page, "Cảnh báo nguy hiểm", 750);
await hoverClickText(page, "Cảnh báo nguy hiểm", 1000);
await hoverClickSel(page, ".alert-bell-drop .warn-drop button", 1600);
await scrollDetail(page);
await hoverClickText(page, "Đóng", 700, 350);

log("filters");
await hoverHoldText(page, "Tìm ao", 700);
await hoverHoldText(page, "Phạm vi", 650);
await hoverHoldText(page, "Trạng thái ao", 650);
await hoverHoldText(page, "Lớp bản đồ", 650);
await hoverClickText(page, "Tìm ao", 650);
const search = page.getByLabel("Tìm theo tên hoặc mã ao");
if (await search.count()) {
  const box = await search.boundingBox();
  if (box) {
    await page.mouse.move(box.x + 40, box.y + box.height / 2, { steps: 10 });
    await page.mouse.click(box.x + 40, box.y + box.height / 2);
    await page.keyboard.type("Vĩnh", { delay: 80 });
    await wait(page, 500);
    await page.keyboard.press("Enter");
    await wait(page, 1100);
  }
}

await hoverClickText(page, "Trạng thái ao", 700);
await hoverClickText(page, "Nguy hiểm", 850);
await hoverClickText(page, "Lớp bản đồ", 700);
await hoverClickText(page, "Lớp xe / tuyến", 900);
await hoverClickText(page, "Lớp xe / tuyến", 900);

log("map-pins");
await hoverClickText(page, "51C-123.45", 1500);
await scrollDetail(page);
await hoverClickText(page, "Đóng", 600, 300);
await hoverClickSel(page, ".pond-pin", 1500);
await scrollDetail(page);
await hoverClickText(page, "Đóng", 600, 300);

log("reopen");
await hoverClickText(page, "Mở tổng quan", 1200);
await wait(page, 700);

log("close");
await session.send("Page.stopScreencast").catch(() => {});
await wait(page, 400);
log("frames " + frameIndex);
try {
  await Promise.race([browser.close(), new Promise((resolve) => setTimeout(resolve, 8000))]);
} catch {
  log("close-err");
}
log("DONE");
process.exit(0);

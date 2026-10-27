import devicesFallback from "../data/devices.json";
import parametersFallback from "../data/parameters.json";
import pondsFallback from "../data/ponds.json";
import reportFallback from "../data/pond-aoahung01-report.json";
import sampleCatalogJson from "../data/sample-ponds.json";
import { isRegionDevice, regionCatalog } from "./catalog";
import type {
  AlertRow,
  Device,
  HistoryPoint,
  Measurement,
  Parameter,
  Pond,
  PondReport,
  TaskRow,
} from "./types";

type SampleCatalog = {
  ponds: Pond[];
  devices: Device[];
  realtime: Record<string, Measurement[]>;
};

export function sampleCatalog(): SampleCatalog {
  return sampleCatalogJson as SampleCatalog;
}

export function withSamples(
  ponds: Pond[],
  devices: Device[],
  realtime: Record<string, Measurement[]>,
): { ponds: Pond[]; devices: Device[]; realtime: Record<string, Measurement[]> } {
  const sample = sampleCatalog();
  const region = regionCatalog();
  const farmByPond = new Map<string, string>();
  for (const farm of region.farms) {
    for (const pondId of farm.pond_ids) farmByPond.set(pondId, farm.id);
  }
  const extraPonds = [...sample.ponds, ...region.ponds].map((pond) => ({
    ...pond,
    sample: true,
    farm_id: pond.farm_id ?? farmByPond.get(pond.id),
  }));
  return {
    ponds: [...ponds, ...extraPonds],
    devices: [...devices, ...sample.devices, ...region.devices],
    realtime: { ...realtime, ...sample.realtime, ...region.realtime },
  };
}

export function isSampleDevice(code: string): boolean {
  const sample = sampleCatalog();
  return (
    Boolean(sample.realtime[code]) ||
    sample.devices.some((device) => device.device_code === code) ||
    isRegionDevice(code)
  );
}

export function sampleTasks(): TaskRow[] {
  return regionCatalog().tasks;
}

const BASE = "/pctomca";

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || value === "-") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asText(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

export async function login(username: string, password: string): Promise<boolean> {
  const body = new URLSearchParams({ username, password });
  const res = await fetch(`${BASE}/users/login/index.html`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    redirect: "follow",
  });
  const html = await res.text();
  return /Xin chào/i.test(html) && !/name="password"/i.test(html);
}

export type AccountProfile = {
  fullname: string;
  email: string;
};

export type PasswordField = {
  name: string;
  label: string;
};

export type PasswordForm = {
  action: string;
  fields: PasswordField[];
  hidden: { name: string; value: string }[];
};

const FORM_HEADERS = { "Content-Type": "application/x-www-form-urlencoded" };

function parseDocument(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function isLoginWall(html: string): boolean {
  const doc = parseDocument(html);
  const loginForm = [...doc.querySelectorAll("form")].some(
    (form) =>
      Boolean(form.querySelector('input[name="username"]')) &&
      form.querySelectorAll('input[type="password"]').length === 1 &&
      !form.querySelector('input[name="fullname"]'),
  );
  return loginForm && /forgot_password|Đăng nhập/i.test(html);
}

function pageMessage(doc: Document): string {
  const node = doc.querySelector(".alert, .text-danger, .text-success, .error, .success");
  return node?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function proxyPath(action: string | null, pagePath: string): string {
  if (!action || action === "#") return pagePath;
  const url = new URL(action, `https://iot.clb4u.com${pagePath}`);
  return url.pathname;
}

async function readPage(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`, { credentials: "include" });
  return res.text();
}

export async function fetchAccountProfile(): Promise<AccountProfile | "expired"> {
  const html = await readPage("/users/profile/index.html");
  if (isLoginWall(html)) return "expired";
  const doc = parseDocument(html);
  const valueOf = (name: string) =>
    (doc.querySelector(`input[name="${name}"]`) as HTMLInputElement | null)?.value.trim() ?? "";
  return { fullname: valueOf("fullname"), email: valueOf("email") };
}

function fieldLabel(input: Element): string {
  const id = input.getAttribute("id");
  const explicit = id ? input.ownerDocument.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent : "";
  const wrapping = input.closest("label")?.textContent ?? "";
  const previous = input.previousElementSibling?.textContent ?? "";
  return `${explicit ?? ""} ${wrapping} ${previous}`.replace(/\s+/g, " ").trim();
}

function passwordFormFrom(html: string, pagePath: string): PasswordForm | "expired" | null {
  if (isLoginWall(html)) return "expired";
  const doc = parseDocument(html);
  const forms = [...doc.querySelectorAll("form")].filter((item) => item.querySelectorAll('input[type="password"]').length > 0);
  const form = forms.sort(
    (a, b) => b.querySelectorAll('input[type="password"]').length - a.querySelectorAll('input[type="password"]').length,
  )[0];
  if (!form || form.querySelector('input[name="username"]') && form.querySelectorAll('input[type="password"]').length < 2) return null;
  const fields = [...form.querySelectorAll('input[type="password"]')]
    .map((input) => ({ name: input.getAttribute("name") ?? "", label: fieldLabel(input) }))
    .filter((field) => field.name);
  if (!fields.length) return null;
  const hidden = [...form.querySelectorAll('input[type="hidden"]')]
    .map((input) => ({ name: input.getAttribute("name") ?? "", value: (input as HTMLInputElement).value }))
    .filter((item) => item.name);
  return { action: proxyPath(form.getAttribute("action"), pagePath), fields, hidden };
}

export async function fetchPasswordForm(): Promise<PasswordForm | "expired" | null> {
  const pagePath = "/users/change_password/index.html";
  return passwordFormFrom(await readPage(pagePath), pagePath);
}

export async function submitPasswordForm(
  form: PasswordForm,
  values: string[],
): Promise<{ ok: boolean; message: string }> {
  const body = new URLSearchParams();
  for (const field of form.hidden) body.append(field.name, field.value);
  form.fields.forEach((field, index) => body.append(field.name, values[index] ?? ""));
  const res = await fetch(`${BASE}${form.action}`, {
    method: "POST",
    credentials: "include",
    headers: FORM_HEADERS,
    body,
    redirect: "follow",
  });
  const html = await res.text();
  if (isLoginWall(html)) return { ok: false, message: "Phiên đăng nhập đã hết. Hãy đăng nhập lại." };
  const message = pageMessage(parseDocument(html));
  const stillThere = passwordFormFrom(html, form.action);
  if (stillThere && stillThere !== "expired") {
    return { ok: false, message: message || "Chưa đổi được mật khẩu. Kiểm tra mật khẩu hiện tại." };
  }
  return { ok: true, message: message || "Đã đổi mật khẩu." };
}

export async function fetchPondsLive(): Promise<Pond[]> {
  const res = await fetch(`${BASE}/api/ponds/index.html`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "action=list",
  });
  const json = await res.json();
  if (json?.status !== "success" || !Array.isArray(json.data)) {
    throw new Error("Không lấy được danh sách ao");
  }
  return json.data.map((row: Record<string, string>) => ({
    id: asText(row.id),
    pond_code: asText(row.pond_code),
    pond_name: asText(row.pond_name),
    area: asText(row.area),
    volume: asText(row.volume),
    location: asText(row.location),
    description: asText(row.description),
    created_at: asText(row.created_at),
  }));
}

export function parseDeviceTable(html: string): Device[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = [...doc.querySelectorAll("table tbody tr")];
  return rows
    .map((row) => {
      const cells = [...row.querySelectorAll("td")].map((td) => td.textContent?.replace(/\s+/g, " ").trim() ?? "");
      if (cells.length < 8) return null;
      const pondField = cells[3];
      const assigned = pondField && !/chưa gán/i.test(pondField);
      const [pond_code, ...nameParts] = assigned ? pondField.split(" - ") : [null];
      return {
        id: cells[0],
        device_code: cells[1],
        device_name: cells[2],
        pond_code: assigned ? asText(pond_code) : null,
        pond_name: assigned ? nameParts.join(" - ").trim() : "Chưa gán",
        location: cells[5],
        latitude: Number(cells[6]),
        longitude: Number(cells[7]),
        description: cells[8] ?? "",
      } satisfies Device;
    })
    .filter((row): row is Device => Boolean(row && Number.isFinite(row.latitude) && Number.isFinite(row.longitude)));
}

export async function fetchDevicesLive(): Promise<Device[]> {
  const res = await fetch(`${BASE}/iot/viewdevice/index.html`, { credentials: "include" });
  const html = await res.text();
  const devices = parseDeviceTable(html);
  if (!devices.length) throw new Error("Không lấy được danh sách thiết bị");
  return devices;
}

export async function fetchParametersLive(): Promise<Parameter[]> {
  const res = await fetch(`${BASE}/iot/viewparam/index.html`, { credentials: "include" });
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = [...doc.querySelectorAll("table tbody tr")];
  const parsed = rows
    .map((row) => {
      const cells = [...row.querySelectorAll("td")].map((td) => td.textContent?.trim() ?? "");
      const start = cells[0] && /^\d+$/.test(cells[0]) ? 1 : 0;
      const code = cells[start];
      if (!code) return null;
      return {
        param_code: code,
        param_name: cells[start + 1],
        unit: cells[start + 2],
        ref_min: num(cells[start + 3]),
        ref_max: num(cells[start + 4]),
        description: cells[start + 5] ?? "",
      } satisfies Parameter;
    })
    .filter((row): row is Parameter => Boolean(row));
  if (!parsed.length) throw new Error("Không lấy được tham số");
  return parsed;
}

export async function fetchRealtime(deviceCode: string): Promise<Measurement[]> {
  const res = await fetch(`${BASE}/api/realtime/${encodeURIComponent(deviceCode)}/index.html`, {
    credentials: "include",
  });
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error("Realtime không hợp lệ");
  return json
    .filter((row: Record<string, string>) => row.param_code)
    .map((row: Record<string, string>) => ({
      param_code: asText(row.param_code),
      measured_value: Number(row.measured_value),
      unit: asText(row.unit).replace(/^°/, ""),
      measured_at: asText(row.measured_at),
      status: (row.status as Measurement["status"]) || "NONE",
    }));
}

export async function fetchHistory(input: {
  param_code: string;
  device_code: string;
  date_from: string;
  date_to: string;
}): Promise<HistoryPoint[]> {
  const res = await fetch(`${BASE}/api/report/index.html`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!Array.isArray(json)) throw new Error("Không lấy được lịch sử đo");
  return json;
}

export async function fetchTasksLive(): Promise<TaskRow[]> {
  const res = await fetch(`${BASE}/api/tasks/index.html`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "action=list",
  });
  const json = await res.json();
  if (!Array.isArray(json?.data)) throw new Error("Không lấy được công việc");
  return json.data.map((row: Record<string, string>) => ({
    id: asText(row.id),
    pond_id: asText(row.pond_id),
    pond_name: asText(row.pond_name),
    user_fullname: asText(row.user_fullname),
    task_type_name: asText(row.task_type_name),
    quantity: asText(row.quantity),
    unit: asText(row.unit),
    notes: asText(row.notes),
    image_url: row.image_url ? asText(row.image_url) : null,
    performed_at: asText(row.performed_at),
  }));
}

export function parseAlerts(html: string): AlertRow[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const rows = [...doc.querySelectorAll("table tbody tr")];
  return rows
    .map((row) => {
      const cells = [...row.querySelectorAll("td")].map((td) => td.textContent?.replace(/\s+/g, " ").trim() ?? "");
      if (cells.length < 7) return null;
      const offset = cells[0] && /^\d+$/.test(cells[0]) && cells.length >= 8 ? 1 : 0;
      return {
        id: cells[offset],
        device_code: cells[offset + 1],
        param_code: cells[offset + 2],
        measured_value: cells[offset + 3],
        alert_level: cells[offset + 4],
        message: cells[offset + 5],
        alert_time: cells[offset + 6],
      } satisfies AlertRow;
    })
    .filter((row): row is AlertRow => Boolean(row?.device_code));
}

export async function fetchAlertsLive(): Promise<AlertRow[]> {
  const res = await fetch(`${BASE}/iot/alerts/index.html`, { credentials: "include" });
  return parseAlerts(await res.text());
}

function parseMoney(value: string): number {
  return Number(value.replace(/[^\d]/g, "")) || 0;
}

export function parsePondReport(html: string, pondId: string): PondReport | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const text = doc.body.innerText.replace(/\r/g, "");
  if (!/Thông tin ao/.test(text)) return null;

  const grab = (label: string) => {
    const match = text.match(new RegExp(`${label}:\\s*(.*)`));
    return match?.[1]?.trim() ?? "";
  };

  const tables = [...doc.querySelectorAll("table")];
  const materials: PondReport["materials"] = [];
  const water_quality: PondReport["water_quality"] = [];

  for (const table of tables) {
    const headers = [...table.querySelectorAll("th")].map((th) => th.textContent?.trim() ?? "");
    const rows = [...table.querySelectorAll("tbody tr, tr")].filter((tr) => tr.querySelectorAll("td").length);
    if (headers.some((h) => /Loại vật tư/i.test(h))) {
      for (const row of rows) {
        const cells = [...row.querySelectorAll("td")].map((td) => td.textContent?.replace(/\s+/g, " ").trim() ?? "");
        if (cells.length < 5 || /tổng chi phí/i.test(cells[0])) continue;
        materials.push({
          kind: cells[0],
          name: cells[1],
          quantity: Number(cells[2]) || 0,
          unit: cells[3],
          cost: parseMoney(cells[4]),
        });
      }
    }
    if (headers.some((h) => /Giá trị TB/i.test(h))) {
      for (const row of rows) {
        const cells = [...row.querySelectorAll("td")].map((td) => td.textContent?.replace(/\s+/g, " ").trim() ?? "");
        if (cells.length < 5) continue;
        water_quality.push({
          param_code: cells[0],
          param_name: cells[0],
          avg: Number(cells[1].replace(",", ".")) || 0,
          unit: cells[2],
          range: cells[3],
          verdict: cells[4],
        });
      }
    }
  }

  const feed = Number(text.match(/Số lần cho ăn[\s\S]*?(\d+)/)?.[1] ?? 0);
  const waterChange = Number(text.match(/Tần suất thay nước[\s\S]*?(\d+)/)?.[1] ?? 0);
  const total = parseMoney(text.match(/Tổng chi phí:\s*([\d.\s]+)/)?.[1] ?? "0");

  return {
    pond_id: pondId,
    pond_code: grab("Mã ao"),
    pond_name: grab("Tên ao"),
    area: Number(grab("Diện tích").replace(/[^\d.]/g, "")) || 0,
    volume: Number(grab("Thể tích").replace(/[^\d.]/g, "")) || 0,
    location: grab("Vị trí"),
    description: grab("Mô tả"),
    feed_count_this_week: feed,
    water_change_this_week: waterChange,
    materials,
    total_cost: total,
    water_quality,
  };
}

export async function fetchPondReportLive(pondId: string): Promise<PondReport | null> {
  const res = await fetch(`${BASE}/ponds/report/index.html`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `pond_id=${encodeURIComponent(pondId)}`,
  });
  return parsePondReport(await res.text(), pondId);
}

export function fallbackPonds(): Pond[] {
  return pondsFallback as Pond[];
}

export function fallbackDevices(): Device[] {
  return devicesFallback as Device[];
}

export function fallbackParameters(): Parameter[] {
  return parametersFallback as Parameter[];
}

export function fallbackReport(pondId: string): PondReport | null {
  if (pondId !== "5") return null;
  return reportFallback as PondReport;
}

export function fallbackRealtime(deviceCode: string): Measurement[] {
  const sample = sampleCatalog().realtime[deviceCode];
  if (sample) return sample;
  const region = regionCatalog().realtime[deviceCode];
  if (region) return region;
  if (deviceCode !== "ESP001") return [];
  return (reportFallback.realtime_esp001 as Measurement[]) ?? [];
}

export function fallbackTasks(pondId: string): TaskRow[] {
  if (pondId !== "5") return [];
  return (reportFallback.tasks as TaskRow[]) ?? [];
}

export function fallbackAlerts(deviceCodes: string[]): AlertRow[] {
  const rows: AlertRow[] = [];
  for (const code of deviceCodes) {
    for (const item of fallbackRealtime(code)) {
      if (item.status === "OK") continue;
      rows.push({
        id: `${code}-${item.param_code}`,
        device_code: code,
        param_code: item.param_code,
        measured_value: String(item.measured_value),
        alert_level: item.status,
        message: `Thông số ${item.param_code} ${item.status === "HIGH" ? "vượt" : "thấp hơn"} ngưỡng`,
        alert_time: item.measured_at,
      });
    }
  }
  return rows;
}

export async function fetchRealtimeMap(
  deviceCodes: string[],
  live: boolean,
): Promise<Record<string, Measurement[]>> {
  const entries = await Promise.all(
    deviceCodes.map(async (code) => {
      if (!live || isSampleDevice(code)) return [code, fallbackRealtime(code)] as const;
      try {
        return [code, await fetchRealtime(code)] as const;
      } catch {
        return [code, fallbackRealtime(code)] as const;
      }
    }),
  );
  return { ...sampleCatalog().realtime, ...regionCatalog().realtime, ...Object.fromEntries(entries) };
}

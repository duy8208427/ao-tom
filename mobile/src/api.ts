// Client VSG Aqua cho mobile: dùng lại các hàm JSON của bản web (../../src/api.ts),
// chỉ thay phần đọc trang HTML vì React Native không có DOMParser.
import {
  fallbackAlerts,
  fallbackDevices,
  fallbackParameters,
  fallbackPonds,
  fallbackReport,
  fallbackTasks,
  fetchHistory,
  fetchPondsLive,
  fetchRealtimeMap,
  fetchTasksLive,
  login as webLogin,
  sampleCatalog,
  sampleTasks,
  setApiBase,
  withSamples,
} from "../../src/api";
import type { AlertRow, Device, Parameter } from "../../src/types";
import { isLoginWall, tableRows, textOf } from "./html";

export const SERVER = "https://iot.clb4u.com";
setApiBase(SERVER);

export {
  fallbackAlerts,
  fallbackDevices,
  fallbackParameters,
  fallbackPonds,
  fallbackReport,
  fallbackTasks,
  fetchHistory,
  fetchPondsLive,
  fetchRealtimeMap,
  fetchTasksLive,
  sampleCatalog,
  sampleTasks,
  withSamples,
};

export class SessionExpired extends Error {
  constructor() {
    super("Phiên đăng nhập đã hết. Hãy đăng nhập lại.");
  }
}

function num(value: string | undefined): number | null {
  if (value == null || value === "" || value === "-") return null;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

async function readPage(path: string, init?: RequestInit): Promise<string> {
  const res = await fetch(`${SERVER}${path}`, { credentials: "include", ...init });
  const html = await res.text();
  if (isLoginWall(html)) throw new SessionExpired();
  return html;
}

export async function login(username: string, password: string): Promise<boolean> {
  return webLogin(username, password);
}

export async function logoutServer(): Promise<void> {
  try {
    await fetch(`${SERVER}/users/logout/index.html`, { credentials: "include" });
  } catch {
    // Không có mạng thì bỏ qua — cookie phiên sẽ tự hết hạn.
  }
}

/** Giống parseDeviceTable của web: ID, mã, tên, ao, ..., vị trí, lat, lng, mô tả. */
export async function fetchDevicesLive(): Promise<Device[]> {
  const rows = tableRows(await readPage("/iot/viewdevice/index.html"));
  const devices = rows
    .map((cells): Device | null => {
      if (cells.length < 8) return null;
      const pondField = cells[3];
      const assigned = Boolean(pondField) && !/chưa gán/i.test(pondField);
      const [pondCode, ...nameParts] = assigned ? pondField.split(" - ") : [""];
      return {
        id: cells[0],
        device_code: cells[1],
        device_name: cells[2],
        pond_code: assigned ? pondCode.trim() : null,
        pond_name: assigned ? nameParts.join(" - ").trim() : "Chưa gán",
        location: cells[5],
        latitude: Number(cells[6]),
        longitude: Number(cells[7]),
        description: cells[8] ?? "",
      };
    })
    .filter((row): row is Device => Boolean(row && Number.isFinite(row.latitude) && Number.isFinite(row.longitude)));
  if (!devices.length) throw new Error("Không lấy được danh sách thiết bị");
  return devices;
}

export async function fetchParametersLive(): Promise<Parameter[]> {
  const rows = tableRows(await readPage("/iot/viewparam/index.html"));
  const parsed = rows
    .map((cells): Parameter | null => {
      const start = cells[0] && /^\d+$/.test(cells[0]) ? 1 : 0;
      const code = cells[start];
      if (!code) return null;
      return {
        param_code: code,
        param_name: cells[start + 1] ?? code,
        unit: cells[start + 2] ?? "",
        ref_min: num(cells[start + 3]),
        ref_max: num(cells[start + 4]),
        description: cells[start + 5] ?? "",
      };
    })
    .filter((row): row is Parameter => Boolean(row));
  if (!parsed.length) throw new Error("Không lấy được tham số");
  return parsed;
}

export async function fetchAlertsLive(): Promise<AlertRow[]> {
  const rows = tableRows(await readPage("/iot/alerts/index.html"));
  return rows
    .map((cells): AlertRow | null => {
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
      };
    })
    .filter((row): row is AlertRow => Boolean(row?.device_code));
}

export type PondSummary = {
  feedCount: number;
  waterChange: number;
  totalCost: number;
};

/** Bản rút gọn của báo cáo ao: chỉ lấy số lần cho ăn, thay nước và tổng chi phí trong tuần. */
export async function fetchPondSummaryLive(pondId: string): Promise<PondSummary | null> {
  const html = await readPage("/ponds/report/index.html", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `pond_id=${encodeURIComponent(pondId)}`,
  });
  const text = textOf(html);
  if (!/Thông tin ao/.test(text)) return null;
  return {
    feedCount: Number(text.match(/Số lần cho ăn[\s\S]*?(\d+)/)?.[1] ?? 0),
    waterChange: Number(text.match(/Tần suất thay nước[\s\S]*?(\d+)/)?.[1] ?? 0),
    totalCost: Number((text.match(/Tổng chi phí:\s*([\d.\s]+)/)?.[1] ?? "0").replace(/[^\d]/g, "")) || 0,
  };
}

export function fallbackSummary(pondId: string): PondSummary | null {
  const report = fallbackReport(pondId);
  if (!report) return null;
  return {
    feedCount: report.feed_count_this_week,
    waterChange: report.water_change_this_week,
    totalCost: report.total_cost,
  };
}

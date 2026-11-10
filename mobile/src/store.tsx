// Trạng thái dữ liệu của app: nạp dữ liệu, tự làm mới và lọc theo vai trò — cùng logic với src/App.tsx của web.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { DEMO_FARM_ID, DEMO_RESIDENT, regionCatalog } from "../../src/catalog";
import { buildPins, buildVehicleViews, buildWarnings } from "../../src/geo";
import type { AlertRow, AppRole, Device, Measurement, Parameter, Pond, PondPin, TaskRow, WarningItem } from "../../src/types";
import {
  SessionExpired,
  fallbackAlerts,
  fallbackDevices,
  fallbackParameters,
  fallbackPonds,
  fetchAlertsLive,
  fetchDevicesLive,
  fetchParametersLive,
  fetchPondsLive,
  fetchRealtimeMap,
  fetchTasksLive,
  login,
  logoutServer,
  sampleCatalog,
  sampleTasks,
  withSamples,
} from "./api";

const REFRESH_MS = 15000;
const PREFS_KEY = "aotom.prefs";

export const ROLE_LABEL: Record<AppRole, string> = { resident: "Người dân", farmer: "Chủ trại", admin: "Admin" };

type Session = { live: boolean; account: string | null; role: AppRole };

type Catalog = {
  ponds: Pond[];
  devices: Device[];
  parameters: Parameter[];
  realtime: Record<string, Measurement[]>;
  alerts: AlertRow[];
  tasks: TaskRow[];
};

export type Prefs = { username: string; role: AppRole };

type Store = {
  session: Session | null;
  pins: PondPin[];
  warnings: WarningItem[];
  parameters: Parameter[];
  alerts: AlertRow[];
  tasks: TaskRow[];
  updatedAt: number | null;
  refreshing: boolean;
  notice: string;
  prefs: Prefs;
  signIn: (username: string, password: string, role: AppRole) => Promise<void>;
  openSaved: (role: AppRole) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => void;
};

const Ctx = createContext<Store | null>(null);

async function loadCatalog(live: boolean): Promise<Catalog> {
  const region = regionCatalog();
  const livePonds = live ? await fetchPondsLive() : fallbackPonds();
  const liveDevices = live ? await fetchDevicesLive() : fallbackDevices();
  const parameters = live ? await fetchParametersLive().catch(() => fallbackParameters()) : fallbackParameters();
  const sampleCodes = sampleCatalog().devices.map((d) => d.device_code);
  const regionCodes = region.devices.map((d) => d.device_code);
  const liveCodes = liveDevices.map((d) => d.device_code);
  const merged = withSamples(
    livePonds,
    liveDevices,
    await fetchRealtimeMap([...liveCodes, ...sampleCodes, ...regionCodes], live),
  );
  const sourceAlerts = live ? await fetchAlertsLive().catch(() => fallbackAlerts(liveCodes)) : fallbackAlerts(liveCodes);
  const liveTasks = live ? await fetchTasksLive().catch(() => [] as TaskRow[]) : [];
  return {
    ponds: merged.ponds,
    devices: merged.devices,
    parameters,
    realtime: merged.realtime,
    alerts: [...sourceAlerts, ...fallbackAlerts([...sampleCodes, ...regionCodes])],
    tasks: [...liveTasks, ...sampleTasks()],
  };
}

function connectionMessage(reason: unknown): string {
  if (reason instanceof SessionExpired) return reason.message;
  return "Không kết nối được máy chủ. Có thể xem dữ liệu đã lưu.";
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const region = useMemo(() => regionCatalog(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [prefs, setPrefs] = useState<Prefs>({ username: "", role: "resident" });
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => {
        if (raw) setPrefs((current) => ({ ...current, ...(JSON.parse(raw) as Partial<Prefs>) }));
      })
      .catch(() => undefined);
  }, []);

  const savePrefs = useCallback((next: Prefs) => {
    setPrefs(next);
    AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);

  const open = useCallback(async (next: Session) => {
    const data = await loadCatalog(next.live);
    setCatalog(data);
    setSession(next);
    setUpdatedAt(Date.now());
    setNotice("");
  }, []);

  const signIn = useCallback(
    async (username: string, password: string, role: AppRole) => {
      if (!username || !password) throw new Error("Nhập username và mật khẩu.");
      let ok = false;
      try {
        ok = await login(username, password);
      } catch {
        throw new Error("Không kết nối được máy chủ. Có thể xem dữ liệu đã lưu.");
      }
      if (!ok) throw new Error("Đăng nhập không thành công. Kiểm tra tài khoản hoặc dùng dữ liệu đã lưu.");
      savePrefs({ username, role });
      try {
        await open({ live: true, account: username, role });
      } catch (reason) {
        throw new Error(connectionMessage(reason));
      }
    },
    [open, savePrefs],
  );

  const openSaved = useCallback(
    async (role: AppRole) => {
      savePrefs({ ...prefs, role });
      await open({ live: false, account: null, role });
    },
    [open, prefs, savePrefs],
  );

  /** Làm mới số đo realtime (giống vòng polling của web); kéo xuống để nạp lại toàn bộ. */
  const pollRealtime = useCallback(async () => {
    const current = sessionRef.current;
    if (!current || !catalog) return;
    const codes = catalog.devices.map((d) => d.device_code);
    const realtime = await fetchRealtimeMap(codes, current.live);
    setCatalog((prev) => (prev ? { ...prev, realtime } : prev));
    setUpdatedAt(Date.now());
  }, [catalog]);

  const refresh = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    setRefreshing(true);
    try {
      setCatalog(await loadCatalog(current.live));
      setUpdatedAt(Date.now());
      setNotice("");
    } catch (reason) {
      setNotice(connectionMessage(reason));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!timer) timer = setInterval(() => void pollRealtime().catch(() => undefined), REFRESH_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    start();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void pollRealtime().catch(() => undefined);
        start();
      } else {
        stop();
      }
    });
    return () => {
      stop();
      sub.remove();
    };
  }, [session, pollRealtime]);

  const signOut = useCallback(() => {
    if (sessionRef.current?.live) void logoutServer();
    setSession(null);
    setCatalog(null);
    setUpdatedAt(null);
    setNotice("");
  }, []);

  const pins = useMemo(() => {
    if (!catalog || !session) return [];
    const all = buildPins(catalog.ponds, catalog.devices, catalog.realtime, {
      assets: region.assets,
      crops: region.crops,
      farms: region.farms,
    });
    if (session.role === "farmer") return all.filter((pin) => pin.farm_id === DEMO_FARM_ID);
    if (session.role === "resident") return all.filter((pin) => pin.pond.resident_name === DEMO_RESIDENT);
    return all;
  }, [catalog, session, region]);

  const warnings = useMemo(() => {
    if (!session) return [];
    const vehicles =
      session.role === "admin"
        ? buildVehicleViews(region.vehicles, region.trips, pins, region.plants, region.routes, updatedAt ?? Date.now())
        : [];
    return buildWarnings(pins, vehicles);
  }, [pins, session, region, updatedAt]);

  const value = useMemo<Store>(
    () => ({
      session,
      pins,
      warnings,
      parameters: catalog?.parameters ?? [],
      alerts: catalog?.alerts ?? [],
      tasks: catalog?.tasks ?? [],
      updatedAt,
      refreshing,
      notice,
      prefs,
      signIn,
      openSaved,
      refresh,
      signOut,
    }),
    [session, pins, warnings, catalog, updatedAt, refreshing, notice, prefs, signIn, openSaved, refresh, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useStore phải nằm trong StoreProvider");
  return store;
}

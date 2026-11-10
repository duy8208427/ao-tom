import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { assetKindLabel, assetStatusLabel, formatMoney, formatNumber, pickMetric, statusRank } from "../../../src/geo";
import type { AlertStatus, HistoryPoint, Measurement, Parameter } from "../../../src/types";
import { fallbackSummary, fallbackTasks, fetchHistory, fetchPondSummaryLive, type PondSummary } from "../api";
import { HistoryChart } from "../HistoryChart";
import type { RootStack } from "../nav";
import { pondPhoto } from "../photos";
import { useStore } from "../store";
import { C, refRange, statusColor, unitText } from "../theme";
import { Card, Empty, SectionTitle, Segmented, StatusPill } from "../ui";

type Props = NativeStackScreenProps<RootStack, "Pond">;
type RangeKey = "1d" | "7d" | "30d";

const FEATURED = [
  { code: "DO", label: "Oxy (DO)" },
  { code: "PH", label: "pH" },
  { code: "TEMP", label: "Nhiệt độ" },
  { code: "SAL", label: "Độ mặn" },
] as const;

const RANGES: { value: RangeKey; label: string }[] = [
  { value: "1d", label: "1 ngày" },
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
];

function dateRange(key: RangeKey) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (key === "1d" ? 1 : key === "7d" ? 7 : 30));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { date_from: iso(from), date_to: iso(to) };
}

/** Chuỗi mô phỏng cho chế độ dữ liệu đã lưu — cùng cách làm với DetailPanel của web. */
function savedHistory(deviceCode: string, current: Measurement | undefined, parameter: Parameter | undefined): HistoryPoint[] {
  if (!current) return [];
  const base = current.measured_value ?? parameter?.ref_min ?? 0;
  return Array.from({ length: 12 }, (_, i) => {
    const wave = Math.sin(i / 2.2) * (base * 0.18 || 1);
    const dip = i === 8 || i === 9 ? -(parameter?.ref_min ?? base) * 0.35 : 0;
    return {
      device_code: deviceCode,
      alert_time: `2026-10-${String(9 + i).padStart(2, "0")}`,
      measured_value: Number(Math.max(0, base + wave + dip).toFixed(2)),
    };
  });
}

export function PondDetailScreen({ route }: Props) {
  const { pins, parameters, alerts, tasks, session } = useStore();
  const pin = pins.find((item) => item.pond.id === route.params.pondId);
  const live = Boolean(session?.live);
  const paramMap = useMemo(() => Object.fromEntries(parameters.map((p) => [p.param_code, p])), [parameters]);

  const cameras = pin?.assets.filter((a) => a.kind === "camera") ?? [];
  const [cameraId, setCameraId] = useState(cameras[0]?.id ?? "");
  const camera = cameras.find((c) => c.id === cameraId) ?? cameras[0];
  const [showAll, setShowAll] = useState(false);
  const [showTasks, setShowTasks] = useState(false);
  const [paramCode, setParamCode] = useState<string>("DO");
  const [range, setRange] = useState<RangeKey>("7d");
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [summary, setSummary] = useState<PondSummary | null>(null);
  const deviceCode = pin?.devices[0]?.device_code ?? "";
  const firstFeatured = FEATURED.find((f) => pin && pickMetric(pin.measurements, f.code))?.code;

  useEffect(() => {
    if (firstFeatured && pin && !pickMetric(pin.measurements, paramCode)) setParamCode(firstFeatured);
  }, [firstFeatured, pin?.pond.id]);

  useEffect(() => {
    if (!pin) return;
    setSummary(fallbackSummary(pin.pond.id));
    if (!live || pin.pond.sample) return;
    let cancelled = false;
    fetchPondSummaryLive(pin.pond.id)
      .then((row) => {
        if (!cancelled && row) setSummary(row);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pin?.pond.id, live]);

  useEffect(() => {
    if (!pin || !deviceCode) {
      setHistory([]);
      return;
    }
    const current = pickMetric(pin.byDevice[deviceCode] ?? pin.measurements, paramCode);
    if (!live || pin.pond.sample) {
      setHistory(savedHistory(deviceCode, current, paramMap[paramCode]));
      return;
    }
    let cancelled = false;
    setLoadingHistory(true);
    fetchHistory({ param_code: paramCode, device_code: deviceCode, ...dateRange(range) })
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
    };
    // Không phụ thuộc vào số đo realtime để biểu đồ không nạp lại mỗi 15 giây.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.pond.id, deviceCode, paramCode, range, live, paramMap]);

  if (!pin) return <Empty title="Không tìm thấy ao" hint="Ao này không còn trong danh sách." />;

  const deviceCodes = pin.devices.map((d) => d.device_code);
  const pondAlerts = alerts.filter((row) => deviceCodes.includes(row.device_code));
  const issues = pin.assets.filter((a) => a.status === "offline" || a.status === "fault");
  const pondTasks = (tasks.length ? tasks : fallbackTasks(pin.pond.id)).filter(
    (row) => row.pond_id === pin.pond.id || row.pond_name === pin.pond.pond_name,
  );
  const gear = pin.assets.filter((a) => a.kind !== "camera");
  const running = gear.filter((a) => a.status === "running").length;
  const allMetrics = [...pin.measurements].sort(
    (a, b) => statusRank(b.status) - statusRank(a.status) || a.param_code.localeCompare(b.param_code),
  );
  const lost = camera && (camera.status === "offline" || camera.status === "fault");
  const featuredCodes = FEATURED.filter((f) => pickMetric(pin.measurements, f.code));

  return (
    <ScrollView style={st.page} contentContainerStyle={st.content}>
      <View style={st.photoWrap}>
        <Image source={pondPhoto(pin.pond.pond_code)} style={[st.photo, lost && { opacity: 0.25 }]} resizeMode="cover" />
        {lost ? (
          <View style={st.lost}>
            <Text style={st.lostText}>MẤT HÌNH</Text>
            <Text style={st.lostSub}>{camera?.name}</Text>
          </View>
        ) : camera ? (
          <View style={st.camTag}>
            <View style={st.rec} />
            <Text style={st.camText}>{camera.name}</Text>
          </View>
        ) : null}
      </View>
      {cameras.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.camTabs}>
          {cameras.map((cam) => {
            const on = cam.id === camera?.id;
            const bad = cam.status === "offline" || cam.status === "fault";
            return (
              <Pressable key={cam.id} onPress={() => setCameraId(cam.id)} style={[st.camTab, on && st.camTabOn]}>
                <Text style={[st.camTabText, on && st.camTabTextOn]}>
                  {cam.location_label || cam.name}
                  {bad ? " · mất" : ""}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={st.titleRow}>
        <View style={{ flex: 1 }}>
          <Text style={st.code}>
            {pin.pond.pond_code}
            {pin.farm_name ? ` · ${pin.farm_name}` : ""}
          </Text>
          <Text style={st.muted}>{pin.latestAt ? `Đo lúc ${pin.latestAt}` : "Chưa có số đo"}</Text>
        </View>
        <StatusPill status={pin.status} />
      </View>

      {featuredCodes.length ? (
        <View style={st.grid}>
          {featuredCodes.map((f) => (
            <MetricTile key={f.code} label={f.label} m={pickMetric(pin.measurements, f.code)!} p={paramMap[f.code]} />
          ))}
        </View>
      ) : (
        <Card>
          <Text style={st.muted}>Ao chưa gắn tủ đo nên chưa có chỉ số.</Text>
        </Card>
      )}

      {allMetrics.length > featuredCodes.length ? (
        <Card style={{ paddingVertical: 4 }}>
          <Pressable onPress={() => setShowAll((v) => !v)} style={st.toggle}>
            <Text style={st.toggleText}>Tất cả chỉ số ({allMetrics.length})</Text>
            <Text style={st.toggleText}>{showAll ? "▴" : "▾"}</Text>
          </Pressable>
          {showAll
            ? allMetrics.map((m) => {
                const p = paramMap[m.param_code];
                return (
                  <View key={m.param_code} style={st.metricRow}>
                    <Text style={st.metricName} numberOfLines={1}>
                      {p?.param_name ?? m.param_code}
                    </Text>
                    <Text style={[st.metricVal, { color: statusColor(m.status === "NONE" ? "OK" : m.status).fg }]}>
                      {formatNumber(m.measured_value)} {unitText(m.unit)}
                    </Text>
                  </View>
                );
              })
            : null}
        </Card>
      ) : null}

      {deviceCode && featuredCodes.length ? (
        <>
          <SectionTitle right={loadingHistory ? <Text style={st.muted}>Đang tải…</Text> : null}>Lịch sử</SectionTitle>
          <Card style={{ gap: 10 }}>
            <Segmented
              items={featuredCodes.map((f) => ({ value: f.code, label: f.code === "TEMP" ? "Nhiệt" : f.code === "SAL" ? "Mặn" : f.label.replace("Oxy (DO)", "DO") }))}
              value={paramCode}
              onChange={setParamCode}
            />
            {live && !pin.pond.sample ? <Segmented items={RANGES} value={range} onChange={setRange} /> : null}
            <HistoryChart points={history} parameter={paramMap[paramCode]} unit={unitText(paramMap[paramCode]?.unit)} />
          </Card>
        </>
      ) : null}

      <SectionTitle>Cảnh báo ({issues.length + pondAlerts.length})</SectionTitle>
      {issues.length + pondAlerts.length === 0 ? (
        <Card>
          <Text style={st.muted}>Không có cảnh báo.</Text>
        </Card>
      ) : (
        <Card style={{ gap: 10 }}>
          {issues.map((a) => (
            <AlertLine key={a.id} level={a.status === "fault" ? "HIGH" : "LOW"} title={`${a.name} ${assetStatusLabel(a.status).toLowerCase()}`} detail={`${assetKindLabel(a.kind)} · ${a.last_seen ?? ""}`} />
          ))}
          {pondAlerts.slice(0, 6).map((a) => (
            <AlertLine
              key={a.id}
              level={a.alert_level === "HIGH" ? "HIGH" : "LOW"}
              title={a.message || `${a.param_code} ${a.measured_value}`}
              detail={`${a.device_code} · ${a.alert_time}`}
            />
          ))}
        </Card>
      )}

      {gear.length || summary ? (
        <>
          <SectionTitle>Vận hành</SectionTitle>
          <Card style={{ gap: 6 }}>
            {gear.length ? (
              <Text style={st.line}>
                Thiết bị: <Text style={st.bold}>{running}</Text>/{gear.length} đang chạy
                {issues.length ? <Text style={{ color: C.high }}> · {issues.length} lỗi/mất tín hiệu</Text> : null}
              </Text>
            ) : null}
            {pin.crop ? (
              <Text style={st.line}>
                Vụ nuôi: {pin.crop.species} · ngày {pin.crop.days_old} · cỡ {pin.crop.shrimp_size} · sống {pin.crop.survival_pct}%
              </Text>
            ) : null}
            {summary ? (
              <Text style={st.line}>
                Tuần này: {summary.feedCount} lần cho ăn · {summary.waterChange} lần thay nước
                {summary.totalCost ? ` · ${formatMoney(summary.totalCost)}` : ""}
              </Text>
            ) : null}
          </Card>
        </>
      ) : null}

      {pondTasks.length ? (
        <Card style={{ paddingVertical: 4 }}>
          <Pressable onPress={() => setShowTasks((v) => !v)} style={st.toggle}>
            <Text style={st.toggleText}>Công việc gần đây ({pondTasks.length})</Text>
            <Text style={st.toggleText}>{showTasks ? "▴" : "▾"}</Text>
          </Pressable>
          {showTasks
            ? pondTasks.slice(0, 8).map((t) => (
                <View key={t.id} style={st.taskRow}>
                  <Text style={st.bold}>
                    {t.task_type_name}
                    {t.quantity && t.quantity !== "0" ? ` · ${t.quantity} ${t.unit}` : ""}
                  </Text>
                  <Text style={st.muted}>
                    {t.performed_at} · {t.user_fullname}
                    {t.notes ? ` · ${t.notes}` : ""}
                  </Text>
                </View>
              ))
            : null}
        </Card>
      ) : null}
    </ScrollView>
  );
}

function MetricTile({ label, m, p }: { label: string; m: Measurement; p?: Parameter }) {
  const tone = statusColor(m.status === "NONE" ? "OK" : m.status);
  const range = refRange(p?.ref_min, p?.ref_max);
  return (
    <View style={[st.tile, { backgroundColor: tone.bg }]}>
      <Text style={st.tileLabel}>{label}</Text>
      <Text style={[st.tileVal, { color: tone.fg }]}>
        {formatNumber(m.measured_value, 1)}
        {unitText(m.unit) ? <Text style={st.tileUnit}> {unitText(m.unit)}</Text> : null}
      </Text>
      {range ? <Text style={st.tileRange}>Chuẩn {range}</Text> : null}
    </View>
  );
}

function AlertLine({ level, title, detail }: { level: AlertStatus; title: string; detail: string }) {
  return (
    <View style={st.alert}>
      <View style={[st.alertDot, { backgroundColor: statusColor(level).fg }]} />
      <View style={{ flex: 1 }}>
        <Text style={st.bold}>{title}</Text>
        <Text style={st.muted}>{detail}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  photoWrap: { borderRadius: 14, overflow: "hidden", backgroundColor: "#0b1510" },
  photo: { width: "100%", height: 200 },
  lost: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
  lostText: { color: "#fff", fontWeight: "900", fontSize: 20, letterSpacing: 2 },
  lostSub: { color: "#cbd5e1", marginTop: 4 },
  camTag: { position: "absolute", left: 10, top: 10, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  rec: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
  camText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  camTabs: { gap: 8 },
  camTab: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  camTabOn: { backgroundColor: C.brand, borderColor: C.brand },
  camTabText: { color: C.text, fontWeight: "600", fontSize: 13 },
  camTabTextOn: { color: "#fff" },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  code: { fontWeight: "800", color: C.text, fontSize: 15 },
  muted: { color: C.muted, fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "48%", flexGrow: 1, borderRadius: 14, padding: 12, gap: 2 },
  tileLabel: { color: C.muted, fontWeight: "700", fontSize: 13 },
  tileVal: { fontSize: 28, fontWeight: "900" },
  tileUnit: { fontSize: 13, fontWeight: "600", color: C.muted },
  tileRange: { color: C.muted, fontSize: 12 },
  toggle: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10 },
  toggleText: { fontWeight: "800", color: C.brand },
  metricRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  metricName: { flex: 1, color: C.text },
  metricVal: { fontWeight: "800" },
  alert: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  alertDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  bold: { fontWeight: "700", color: C.text },
  line: { color: C.text, lineHeight: 20 },
  taskRow: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line, gap: 2 },
});

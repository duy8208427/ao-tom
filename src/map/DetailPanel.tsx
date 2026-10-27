import { useEffect, useMemo, useState } from "react";
import { CameraBubbles } from "../components/CameraBubbles";
import { fetchHistory, fetchPondReportLive, fallbackReport, fallbackTasks } from "../api";
import { Gauge } from "../components/Gauge";
import { HistoryChart } from "../components/HistoryChart";
import { SelectMenu } from "../components/SelectMenu";
import {
  assetKindLabel,
  assetStatusLabel,
  formatMoney,
  formatNumber,
  pickMetric,
  pondImage,
  offendingMetrics,
  statusLabel,
  statusRank,
} from "../geo";
import type { AlertRow, Asset, HistoryPoint, Parameter, PondPin, PondReport, TaskRow } from "../types";

type RangeKey = "1d" | "7d" | "30d";

const FEATURED_CODES = ["DO", "PH", "TEMP", "SAL"];
const FEATURED = new Set(FEATURED_CODES);

type Props = {
  pin: PondPin;
  live: boolean;
  parameters: Parameter[];
  alerts: AlertRow[];
  tasks: TaskRow[];
  onClose: () => void;
  onBackFarm?: () => void;
  onCamera: (cameraId?: string) => void;
  embedded?: boolean;
  brief?: boolean;
};

function EmptyNote({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="empty-note">
      <b>{title}</b>
      <span>{hint}</span>
    </div>
  );
}

function dateRange(key: RangeKey): { date_from: string; date_to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (key === "1d" ? 1 : key === "7d" ? 7 : 30));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { date_from: iso(from), date_to: iso(to) };
}

function AssetList({ items }: { items: Asset[] }) {
  if (!items.length) return <p className="muted">Chưa gắn thiết bị loại này.</p>;
  return (
    <ul className="card-list">
      {items.map((item) => (
        <li key={item.id} className={`asset-row ${item.status}`}>
          <div>
            <b>{item.name}</b>
            <span>
              {assetKindLabel(item.kind)} · {item.location_label}
              {item.device_code ? ` · ${item.device_code}` : ""}
            </span>
            <small>{item.last_seen ? `Cập nhật ${item.last_seen}` : "—"}</small>
          </div>
          <em className={item.status === "running" ? "ok" : item.status === "idle" ? "idle-tag" : "high"}>
            {assetStatusLabel(item.status)}
          </em>
        </li>
      ))}
    </ul>
  );
}

export function DetailPanel({ pin, live, parameters, alerts, tasks, onClose, onBackFarm, onCamera, embedded, brief }: Props) {
  const paramMap = useMemo(
    () => Object.fromEntries(parameters.map((item) => [item.param_code, item])),
    [parameters],
  );
  const deviceCodes = pin.devices.map((d) => d.device_code);
  const pondAlerts = alerts.filter((row) => deviceCodes.includes(row.device_code)).slice(0, 12);
  const pondTasks = (tasks.length ? tasks : fallbackTasks(pin.pond.id)).filter(
    (row) => row.pond_id === pin.pond.id || row.pond_name === pin.pond.pond_name,
  );
  const [deviceCode, setDeviceCode] = useState(pin.devices[0]?.device_code ?? "");
  const [paramCode, setParamCode] = useState("PH");
  const [range, setRange] = useState<RangeKey>("7d");
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [report, setReport] = useState<PondReport | null>(fallbackReport(pin.pond.id));

  useEffect(() => {
    setDeviceCode(pin.devices[0]?.device_code ?? "");
    setReport(fallbackReport(pin.pond.id));
  }, [pin.pond.id, pin.devices]);

  useEffect(() => {
    let cancelled = false;
    if (live) {
      fetchPondReportLive(pin.pond.id)
        .then((row) => {
          if (!cancelled && row) setReport(row);
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [live, pin.pond.id]);

  useEffect(() => {
    let cancelled = false;
    if (!deviceCode) {
      setHistory([]);
      return;
    }
    if (!live) {
      const current = pickMetric(pin.byDevice[deviceCode] ?? pin.measurements, paramCode);
      const parameter = paramMap[paramCode];
      const base = current?.measured_value ?? parameter?.ref_min ?? 0;
      setHistory(
        current
          ? Array.from({ length: 12 }, (_, i) => {
              const wave = Math.sin(i / 2.2) * (base * 0.18 || 1);
              const dip = i === 8 || i === 9 ? -(parameter?.ref_min ?? base) * 0.35 : 0;
              return {
                device_code: deviceCode,
                alert_time: `2026-10-${String(9 + i).padStart(2, "0")}`,
                measured_value: Number(Math.max(0, base + wave + dip).toFixed(2)),
              };
            })
          : [],
      );
      return;
    }
    const span = dateRange(range);
    fetchHistory({ param_code: paramCode, device_code: deviceCode, ...span })
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, [live, deviceCode, paramCode, range, pin.measurements, pin.byDevice, paramMap]);

  const unit = paramMap[paramCode]?.unit ?? "";
  const sensors = pin.assets.filter((item) => item.kind === "sensor");
  const cameras = pin.assets.filter((item) => item.kind === "camera");
  const gear = pin.assets.filter((item) => item.kind !== "sensor" && item.kind !== "camera");
  const crop = pin.crop;
  const assetAlerts = pin.assets
    .filter((item) => item.status === "offline" || item.status === "fault")
    .map((item) => ({
      id: `asset-${item.id}`,
      device_code: item.device_code ?? item.name,
      param_code: item.kind,
      measured_value: "",
      alert_level: item.status === "fault" ? "HIGH" : "LOW",
      message: `${item.name} ${assetStatusLabel(item.status)}`,
      alert_time: item.last_seen ?? "",
    }));
  const mixedAlerts = [...assetAlerts, ...pondAlerts].slice(0, 12);
  const worst = [...offendingMetrics(pin.measurements)].sort(
    (a, b) => statusRank(b.status ?? "NONE") - statusRank(a.status ?? "NONE"),
  )[0];

  return (
    <aside className={`detail-panel${embedded ? " embedded" : ""}${brief ? " brief" : ""}`}>
      <header className="detail-hero" style={{ backgroundImage: `url(${pondImage(pin.pond.pond_code)})` }}>
        <button type="button" className="cam-btn" onClick={() => onCamera(cameras[0]?.id)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M9 4.5h6l1.2 1.8H19a2 2 0 0 1 2 2v9.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.3a2 2 0 0 1 2-2h2.8L9 4.5Zm3 4.2a4.1 4.1 0 1 0 0 8.2 4.1 4.1 0 0 0 0-8.2Zm0 1.8a2.3 2.3 0 1 1 0 4.6 2.3 2.3 0 0 1 0-4.6Z"
            />
          </svg>
          Camera
        </button>
        {embedded ? null : (
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        )}
        <div>
          {pin.farm_name && onBackFarm && !embedded ? (
            <button type="button" className="farm-link" onClick={onBackFarm}>
              ← {pin.farm_name}
            </button>
          ) : null}
          <h2>{pin.pond.pond_name}</h2>
          <p>
            {pin.pond.pond_code} · {pin.pond.location || "Chưa có vị trí"}
            {pin.estimated ? " · tọa độ ước lượng" : ""}
          </p>
        </div>
      </header>

      <div className="panel-body scroll-fade">
      {brief ? (
        <section className="brief-keep">
          <h3>Chỉ số cần xem</h3>
          <p className="brief-metric">
            {worst
              ? `${worst.param_code} ${worst.measured_value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ${worst.unit}`
              : "Các chỉ số đang ổn"}
          </p>
          <p className="brief-metric">{mixedAlerts.length} cảnh báo</p>
        </section>
      ) : null}
      <section>
        <h3>Hồ sơ ao</h3>
        <div className="stat-row">
          <div>
            <small>Diện tích</small>
            <b>{formatNumber(pin.pond.area)}</b>
            <em>m²</em>
          </div>
          <div>
            <small>Thể tích</small>
            <b>{formatNumber(pin.pond.volume)}</b>
            <em>m³</em>
          </div>
        </div>
        <div className="soft-card">
          <span>Ngày tạo</span>
          <b>{pin.pond.created_at || "—"}</b>
          <span>Mô tả</span>
          <b>{pin.pond.description || "Không có"}</b>
        </div>
      </section>

      {crop ? (
        <section>
          <h3>Vụ nuôi</h3>
          <div className="stat-row">
            <div>
              <small>Ngày tuổi</small>
              <b>{crop.days_old}</b>
              <em>{crop.species}</em>
            </div>
            <div>
              <small>Sống</small>
              <b>{crop.survival_pct}%</b>
              <em>{crop.shrimp_size}</em>
            </div>
          </div>
          <div className="soft-card">
            <span>Thả</span>
            <b>{crop.stocked_at}</b>
            <span>Mật độ</span>
            <b>{crop.density}</b>
            <span>Thu dự kiến</span>
            <b>{crop.harvest_eta}</b>
            <span>Cho ăn hôm nay</span>
            <b>
              {formatNumber(crop.feed_ration_kg)} kg · thừa {formatNumber(crop.leftover_feed_kg)} kg
            </b>
            <span>Nước / siphon</span>
            <b>
              {crop.water_change_today} thay nước · {crop.siphon_today} siphon
            </b>
          </div>
        </section>
      ) : null}

      <section>
        <h3>Cảm biến</h3>
        {sensors.length ? (
          <ul className="card-list">
            {sensors.map((item) => {
              const rows = item.device_code ? (pin.byDevice[item.device_code] ?? []) : [];
              const doValue = pickMetric(rows, "DO");
              const ph = pickMetric(rows, "PH");
              return (
                <li key={item.id} className={`asset-row ${item.status}`}>
                  <div>
                    <b>{item.name}</b>
                    <span>
                      {item.location_label}
                      {item.device_code ? ` · ${item.device_code}` : ""}
                    </span>
                    <small>
                      DO {doValue ? doValue.measured_value : "—"} · pH {ph ? ph.measured_value : "—"}
                    </small>
                  </div>
                  <em className={item.status === "running" ? "ok" : "high"}>{assetStatusLabel(item.status)}</em>
                </li>
              );
            })}
          </ul>
        ) : pin.devices.length ? (
          <ul className="card-list">
            {pin.devices.map((device) => (
              <li key={device.id}>
                <div>
                  <b>{device.device_code}</b>
                  <span>{device.device_name}</span>
                  <small>{device.location}</small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Ao chưa được gán cảm biến.</p>
        )}
      </section>

      <section className="brief-keep">
        <h3>Camera</h3>
        {cameras.length ? (
          <CameraBubbles cameras={cameras} onOpen={(cameraId) => onCamera(cameraId)} />
        ) : (
          <p className="muted">Ao chưa gắn camera.</p>
        )}
      </section>

      <section>
        <h3>Thiết bị</h3>
        <AssetList items={gear} />
      </section>

      <section>
        <h3>Chỉ số hiện tại</h3>
        <div className="gauge-grid">
          {FEATURED_CODES.map((code) => {
            const parameter = paramMap[code];
            const item = pickMetric(pin.measurements, code);
            return (
              <Gauge
                key={code}
                label={code}
                value={item?.measured_value}
                unit={item?.unit || parameter?.unit || ""}
                status={item?.status ?? "NONE"}
                parameter={parameter}
              />
            );
          })}
        </div>
        <div className="metric-rows">
          {parameters
            .filter((parameter) => !FEATURED.has(parameter.param_code))
            .map((parameter) => {
              const item = pickMetric(pin.measurements, parameter.param_code);
              const status = item?.status ?? "NONE";
              return (
                <div key={parameter.param_code} className={`metric-row ${status.toLowerCase()}`}>
                  <span>{parameter.param_name}</span>
                  <b>
                    {item == null ? "—" : item.measured_value.toLocaleString("vi-VN", { maximumFractionDigits: 2 })}
                    <small>{item?.unit || parameter.unit}</small>
                  </b>
                  <em>{statusLabel(status)}</em>
                </div>
              );
            })}
        </div>
      </section>

      <section className="brief-keep">
        <h3>Cảnh báo</h3>
        {mixedAlerts.length ? (
          <ul className="card-list alerts">
            {mixedAlerts.map((row) => (
              <li key={row.id} className={row.alert_level.toLowerCase()}>
                <div>
                  <b>
                    {row.device_code} · {row.param_code} {row.measured_value}
                  </b>
                  <span>{row.message}</span>
                  <small>{row.alert_time}</small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Không có cảnh báo gần đây.</p>
        )}
      </section>

      <section>
        <h3>Lịch sử đo</h3>
        <div className="panel-card">
          <div className="history-toolbar">
            <label>
              Tủ đo
              <SelectMenu
                value={deviceCode}
                onChange={setDeviceCode}
                ariaLabel="Tủ đo"
                disabled={!pin.devices.length}
                placeholder="Chưa có tủ đo"
                options={
                  pin.devices.length
                    ? pin.devices.map((device) => ({ value: device.device_code, label: device.device_code }))
                    : [{ value: "", label: "Chưa có tủ đo" }]
                }
              />
            </label>
            <label>
              Chỉ số
              <SelectMenu
                value={paramCode}
                onChange={setParamCode}
                ariaLabel="Chỉ số"
                options={parameters.map((parameter) => ({
                  value: parameter.param_code,
                  label: parameter.param_code,
                }))}
              />
            </label>
          </div>
          <div className="segmented">
            {(["1d", "7d", "30d"] as RangeKey[]).map((key) => (
              <button key={key} className={range === key ? "chip on" : "chip"} onClick={() => setRange(key)}>
                {key === "1d" ? "1 ngày" : key === "7d" ? "1 tuần" : "1 tháng"}
              </button>
            ))}
          </div>
          <HistoryChart points={history} unit={unit} parameter={paramMap[paramCode]} />
          {!live ? <p className="card-hint">Biểu đồ từ số liệu đã lưu.</p> : null}
        </div>
      </section>

      <section>
        <h3>Chất lượng nước trung bình</h3>
        <div className="panel-card">
          <div className="stat-row">
            <div>
              <small>Cho ăn tuần này</small>
              <b>{report?.feed_count_this_week ?? 0}</b>
            </div>
            <div>
              <small>Thay nước tuần này</small>
              <b>{report?.water_change_this_week ?? 0}</b>
            </div>
          </div>
          {report?.water_quality.length ? (
            <ul className="card-list compact">
              {report.water_quality.map((row) => (
                <li key={row.param_name}>
                  <div>
                    <b>{row.param_name}</b>
                    <span>
                      {row.avg} {row.unit}
                    </span>
                  </div>
                  <em className={row.verdict === "Đạt" ? "ok" : "high"}>{row.verdict}</em>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote title="Chưa có báo cáo tổng hợp" hint="Ao này chưa có số liệu trung bình tuần." />
          )}
        </div>
      </section>

      <section>
        <h3>Chi phí vật tư</h3>
        <div className="panel-card">
          {report?.materials.length ? (
            <>
              <ul className="card-list compact">
                {report.materials.map((row, index) => (
                  <li key={`${row.name}-${index}`}>
                    <div>
                      <b>{row.name}</b>
                      <span>
                        {row.kind} · {formatNumber(row.quantity)} {row.unit}
                      </span>
                    </div>
                    <em>{formatMoney(row.cost)}</em>
                  </li>
                ))}
              </ul>
              <div className="total">Tổng {formatMoney(report.total_cost)}</div>
            </>
          ) : (
            <EmptyNote title="Chưa có lịch sử vật tư" hint="Khi có phiếu xuất kho, chi phí sẽ hiện tại đây." />
          )}
        </div>
      </section>

      <section>
        <h3>Công việc</h3>
        <div className="panel-card">
          {pondTasks.length ? (
            <ul className="card-list">
              {pondTasks.map((row) => (
                <li key={row.id}>
                  <div>
                    <b>{row.task_type_name}</b>
                    <span>
                      {row.user_fullname} · {row.quantity} {row.unit}
                    </span>
                    <small>
                      {row.performed_at}
                      {row.notes ? ` · ${row.notes}` : ""}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyNote title="Chưa có công việc ghi nhận" hint="Cho ăn, thay nước hoặc vệ sinh ao sẽ xuất hiện tại đây." />
          )}
        </div>
      </section>
      </div>
    </aside>
  );
}

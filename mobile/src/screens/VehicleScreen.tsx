import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatClock, formatNumber, formatRemaining, tripStatusLabel } from "../../../src/geo";
import type { AlertStatus, Trip } from "../../../src/types";
import { useRootNav, type RootStack } from "../nav";
import { useStore } from "../store";
import { C, statusColor } from "../theme";
import { Button, Card, Empty, SectionTitle, StatusPill } from "../ui";

type Props = NativeStackScreenProps<RootStack, "Vehicle">;

/** Ngưỡng nhiệt thùng mặc định của cảnh báo xe (buildWarnings trong src/geo.ts). */
const HOT_BIN = 12;

function tripTone(status: Trip["status"]): AlertStatus {
  if (status === "late") return "HIGH";
  if (status === "waiting") return "NONE";
  return "OK";
}

export function VehicleScreen({ route }: Props) {
  const { vehicles, plants, pins } = useStore();
  const nav = useRootNav();
  const vehicle = vehicles.find((v) => v.id === route.params.vehicleId);

  if (!vehicle) return <Empty title="Không tìm thấy xe" hint="Xe này không còn trong danh sách." />;

  const trip = vehicle.trip;
  const plant = trip ? plants.find((p) => p.id === trip.plant_id) : undefined;
  const pin = trip ? pins.find((p) => p.pond.id === trip.pond_id) : undefined;
  const limit = plant?.max_bin_temp ?? HOT_BIN;
  const hot = trip ? trip.bin_temp >= HOT_BIN || trip.bin_temp > limit : false;
  const late = trip?.status === "late";
  const percent = Math.round(vehicle.progress * 100);

  const issues: string[] = [];
  if (late) issues.push(`Trễ so với giờ dự kiến ${trip ? formatClock(trip.eta) : ""}`);
  if (hot && trip) issues.push(`Nhiệt thùng ${formatNumber(trip.bin_temp, 1)}°C, nhà máy yêu cầu ≤ ${limit}°C`);

  const rows: [string, string, string?][] = trip
    ? [
        ["Tài xế", vehicle.driver],
        ["Lấy tôm tại", vehicle.pond_name ?? trip.pond_id],
        ["Giao tới", vehicle.plant_name ?? trip.plant_id],
        ["Tuyến", vehicle.route_name ?? "—"],
        ["Khối lượng", `${formatNumber(trip.weight_kg, 0)} kg`],
        ["Nhiệt thùng", `${formatNumber(trip.bin_temp, 1)}°C`, hot ? C.high : C.ok],
        ["Xuất phát", formatClock(trip.departed_at)],
        ["Dự kiến tới", formatClock(trip.eta)],
        ["Còn lại", trip.status === "received" ? "Đã giao" : formatRemaining(vehicle.remaining_min), late ? C.high : undefined],
      ]
    : [["Tài xế", vehicle.driver]];

  return (
    <ScrollView style={st.page} contentContainerStyle={st.content}>
      <View style={st.head}>
        <View style={{ flex: 1 }}>
          <Text style={st.plate}>{vehicle.plate}</Text>
          <Text style={st.muted}>{trip ? `${vehicle.pond_name ?? ""} → ${vehicle.plant_name ?? ""}` : "Chưa có chuyến"}</Text>
        </View>
        {trip ? <StatusPill status={tripTone(trip.status)} label={tripStatusLabel(trip.status)} /> : null}
      </View>

      {issues.length ? (
        <View style={st.issueBox}>
          {issues.map((text) => (
            <Text key={text} style={st.issue}>
              • {text}
            </Text>
          ))}
        </View>
      ) : null}

      {trip ? (
        <Card style={{ gap: 8 }}>
          <View style={st.progressRow}>
            <Text style={st.bold}>Tiến độ chuyến</Text>
            <Text style={st.bold}>{percent}%</Text>
          </View>
          <View style={st.track}>
            <View style={[st.fill, { width: `${percent}%`, backgroundColor: statusColor(late ? "HIGH" : "OK").fg }]} />
          </View>
          <View style={st.progressRow}>
            <Text style={st.muted}>{vehicle.pond_name}</Text>
            <Text style={st.muted}>{vehicle.plant_name}</Text>
          </View>
        </Card>
      ) : null}

      <Card style={{ paddingVertical: 4 }}>
        {rows.map(([label, value, color], i) => (
          <View key={label} style={[st.row, i > 0 && st.rowLine]}>
            <Text style={st.muted}>{label}</Text>
            <Text style={[st.value, color ? { color } : null]}>{value}</Text>
          </View>
        ))}
      </Card>

      {plant ? (
        <>
          <SectionTitle>Nhà máy nhận</SectionTitle>
          <Card style={{ gap: 6 }}>
            <Text style={st.bold}>{plant.name}</Text>
            <Text style={st.line}>
              {plant.dock} · nhận {plant.receiving_hours}, chốt {plant.cutoff_time}
            </Text>
            <Text style={st.line}>
              Quy cách {plant.size_spec} · {plant.grade} · thùng ≤ {plant.max_bin_temp}°C
            </Text>
            <Pressable onPress={() => void Linking.openURL(`tel:${plant.phone.replace(/\s+/g, "")}`)} accessibilityRole="link">
              <Text style={st.link}>Gọi nhà máy {plant.phone}</Text>
            </Pressable>
          </Card>
        </>
      ) : null}

      {pin ? (
        <Button label={`Xem ao ${pin.pond.pond_name}`} kind="ghost" onPress={() => nav.navigate("Pond", { pondId: pin.pond.id, title: pin.pond.pond_name })} />
      ) : null}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  plate: { fontSize: 26, fontWeight: "900", color: C.text },
  muted: { color: C.muted, fontSize: 13 },
  bold: { fontWeight: "700", color: C.text },
  line: { color: C.text, lineHeight: 20 },
  link: { color: C.brand, fontWeight: "800", marginTop: 2 },
  issueBox: { backgroundColor: C.highSoft, borderRadius: 12, padding: 12, gap: 4 },
  issue: { color: C.high, fontWeight: "700" },
  progressRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  track: { height: 8, borderRadius: 4, backgroundColor: C.noneSoft, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 11 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  value: { color: C.text, fontWeight: "700", flexShrink: 1, textAlign: "right" },
});

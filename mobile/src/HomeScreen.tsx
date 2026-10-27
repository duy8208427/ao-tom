import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { FARMS, LATE_TRUCKS, ROLES, pondsFor, sessionName, type Pond, type Role } from "./data";

type ListKind = "danger" | "late" | "warnings" | null;

type Props = {
  role: Role;
  account: string | null;
  onOpenPond: (pond: Pond) => void;
  onLogout: () => void;
};

export function HomeScreen({ role, account, onOpenPond, onLogout }: Props) {
  const ponds = pondsFor(role);
  const danger = ponds.filter((pond) => pond.status === "Nguy hiểm");
  const warnings = ponds.flatMap((pond) => pond.alerts.map((alert) => ({ ...alert, pond })));
  const [list, setList] = useState<ListKind>(null);
  const farmName = FARMS.find((farm) => farm.id === "farm-vc")?.name ?? "Trại Vĩnh Châu";

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>Ao tôm</Text>
          <Text style={styles.who}>
            {sessionName(role, account)} · {ROLES.find((item) => item.value === role)?.label}
          </Text>
        </View>
        <Pressable onPress={onLogout} style={styles.logout}>
          <Text style={styles.logoutText}>{account ? "Đăng xuất" : "Đăng nhập"}</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {role === "resident"
          ? ponds.map((pond) => (
              <Pressable key={pond.id} style={styles.card} onPress={() => onOpenPond(pond)}>
                <Text style={styles.cardTitle}>{pond.name}</Text>
                <Text style={styles.meta}>
                  {pond.status} · {pond.worst}
                </Text>
                <Text style={styles.camera}>Mở camera</Text>
              </Pressable>
            ))
          : null}

        {role === "farmer" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{farmName}</Text>
            <Text style={styles.meta}>{danger.length} ao nguy hiểm</Text>
            {ponds.map((pond) => (
              <Pressable key={pond.id} style={styles.row} onPress={() => onOpenPond(pond)}>
                <Text style={styles.rowTitle}>{pond.name}</Text>
                <Text style={tone(pond.status)}>{pond.status}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {role === "admin" ? (
          list ? (
            <View style={styles.card}>
              <Pressable onPress={() => setList(null)}>
                <Text style={styles.back}>← Quay lại</Text>
              </Pressable>
              {list === "danger"
                ? danger.map((pond) => (
                    <Pressable key={pond.id} style={styles.row} onPress={() => onOpenPond(pond)}>
                      <Text style={styles.rowTitle}>{pond.name}</Text>
                      <Text style={styles.meta}>{pond.worst}</Text>
                    </Pressable>
                  ))
                : null}
              {list === "late"
                ? LATE_TRUCKS.map((truck) => (
                    <View key={truck.id} style={styles.row}>
                      <Text style={styles.rowTitle}>{truck.plate}</Text>
                      <Text style={styles.meta}>{truck.pond}</Text>
                    </View>
                  ))
                : null}
              {list === "warnings"
                ? warnings.map((item) => (
                    <Pressable key={item.id} style={styles.row} onPress={() => onOpenPond(item.pond)}>
                      <Text style={styles.rowTitle}>{item.title}</Text>
                      <Text style={styles.meta}>
                        {item.pond.name} · {item.detail}
                      </Text>
                    </Pressable>
                  ))
                : null}
            </View>
          ) : (
            <View style={styles.metrics}>
              <Pressable style={styles.metric} onPress={() => setList("danger")}>
                <Text style={styles.number}>{danger.length}</Text>
                <Text style={styles.meta}>Ao nguy hiểm</Text>
              </Pressable>
              <Pressable style={styles.metric} onPress={() => setList("late")}>
                <Text style={styles.number}>{LATE_TRUCKS.length}</Text>
                <Text style={styles.meta}>Xe trễ</Text>
              </Pressable>
              <Pressable style={styles.metric} onPress={() => setList("warnings")}>
                <Text style={styles.number}>{warnings.length}</Text>
                <Text style={styles.meta}>Cảnh báo</Text>
              </Pressable>
            </View>
          )
        ) : null}
      </ScrollView>
    </View>
  );
}

function tone(status: Pond["status"]) {
  if (status === "Nguy hiểm") return styles.bad;
  if (status === "Cảnh báo") return styles.warn;
  return styles.ok;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f8fafc" },
  header: { paddingTop: 54, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#fff", flexDirection: "row", alignItems: "center", gap: 12 },
  brand: { fontSize: 20, fontWeight: "800", color: "#14532d" },
  who: { color: "#64748b", marginTop: 2 },
  logout: { backgroundColor: "#ecfdf5", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  logoutText: { color: "#14532d", fontWeight: "800" },
  body: { padding: 16, gap: 12 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  meta: { color: "#475569" },
  camera: { color: "#14532d", fontWeight: "800" },
  row: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9", gap: 2 },
  rowTitle: { fontWeight: "800", color: "#0f172a" },
  back: { color: "#14532d", fontWeight: "800", marginBottom: 6 },
  metrics: { flexDirection: "row", gap: 8 },
  metric: { flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 12, alignItems: "center" },
  number: { fontSize: 28, fontWeight: "800", color: "#0f172a" },
  bad: { color: "#be123c", fontWeight: "800" },
  warn: { color: "#b45309", fontWeight: "800" },
  ok: { color: "#047857", fontWeight: "800" },
});

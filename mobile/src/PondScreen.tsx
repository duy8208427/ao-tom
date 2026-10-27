import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { Pond } from "./data";
import { POND_PHOTO } from "./photos";

type Props = {
  pond: Pond;
  onBack: () => void;
};

export function PondScreen({ pond, onBack }: Props) {
  const [cameraId, setCameraId] = useState(pond.cameras[0]?.id ?? "");
  const camera = pond.cameras.find((item) => item.id === cameraId) ?? pond.cameras[0];

  return (
    <View style={styles.page}>
      <ScrollView>
        <Image source={POND_PHOTO[pond.photo]} style={styles.photo} />
        <View style={styles.body}>
          <Pressable onPress={onBack}>
            <Text style={styles.back}>← Quay lại</Text>
          </Pressable>
          <Text style={styles.title}>{pond.name}</Text>
          <Text style={styles.meta}>
            {pond.code} · {pond.status} · {pond.worst}
          </Text>
          {camera?.lost ? <Text style={styles.lost}>Camera này đang mất hình</Text> : null}
          {pond.cameras.length > 1 ? (
            <View style={styles.tabs}>
              {pond.cameras.map((item) => (
                <Pressable key={item.id} style={item.id === camera?.id ? styles.tabOn : styles.tab} onPress={() => setCameraId(item.id)}>
                  <Text style={item.id === camera?.id ? styles.tabOnText : styles.tabText}>
                    {item.name}
                    {item.lost ? " · Mất" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.meta}>{camera?.name}</Text>
          )}
          <Text style={styles.section}>{pond.alerts.length} cảnh báo</Text>
          {pond.alerts.map((alert) => (
            <View key={alert.id} style={styles.alert}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.meta}>{alert.detail}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#fff" },
  photo: { width: "100%", height: 240, backgroundColor: "#e2e8f0" },
  body: { padding: 16, gap: 8 },
  back: { color: "#14532d", fontWeight: "800" },
  title: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  meta: { color: "#475569" },
  lost: { color: "#be123c", fontWeight: "800" },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tab: { borderWidth: 1, borderColor: "#dbe4dc", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  tabOn: { backgroundColor: "#ecfdf5", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  tabText: { color: "#334155", fontWeight: "700" },
  tabOnText: { color: "#14532d", fontWeight: "800" },
  section: { marginTop: 8, fontWeight: "800", color: "#0f172a" },
  alert: { backgroundColor: "#fff1f2", borderRadius: 12, padding: 10, gap: 2 },
  alertTitle: { fontWeight: "800", color: "#9f1239" },
});

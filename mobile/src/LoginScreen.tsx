import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ROLES, type Role } from "./data";

type Props = {
  onLogin: (username: string, password: string, role: Role) => Promise<void>;
  onSaved: (role: Role) => void;
};

export function LoginScreen({ onLogin, onSaved }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("resident");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const roleLabel = ROLES.find((item) => item.value === role)?.label ?? "Người dân";

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      await onLogin(username.trim(), password, role);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không đăng nhập được.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <Text style={styles.mark}>VSG</Text>
        <Text style={styles.title}>Ao tôm</Text>
        <Text style={styles.sub}>Visual Sense Group</Text>
        <Text style={styles.label}>Username</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Nhập username"
          style={styles.input}
        />
        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Nhập mật khẩu"
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.submit}>
          <Pressable style={styles.login} disabled={loading} onPress={() => void submit()}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginText}>Đăng nhập</Text>}
          </Pressable>
          <Pressable style={styles.role} disabled={loading} onPress={() => setOpen((value) => !value)}>
            <Text style={styles.roleText}>{roleLabel}</Text>
            <Text style={styles.roleText}>▾</Text>
          </Pressable>
        </View>
        {open ? (
          <View style={styles.menu}>
            {ROLES.map((item) => (
              <Pressable
                key={item.value}
                style={styles.option}
                onPress={() => {
                  setRole(item.value);
                  setOpen(false);
                }}
              >
                <Text style={item.value === role ? styles.optionOn : styles.optionText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Pressable
          style={styles.saved}
          disabled={loading}
          onPress={() => {
            setOpen(false);
            onSaved(role);
          }}
        >
          <Text style={styles.savedText}>Xem dữ liệu đã lưu</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0f2419", justifyContent: "center", padding: 20 },
  card: { backgroundColor: "rgba(255,255,255,0.96)", borderRadius: 24, padding: 22, gap: 8 },
  mark: { textAlign: "center", color: "#1d4ed8", fontWeight: "800", fontSize: 18 },
  title: { textAlign: "center", fontSize: 32, fontWeight: "800", color: "#14532d" },
  sub: { textAlign: "center", color: "#64748b", marginBottom: 8 },
  label: { fontWeight: "700", color: "#0f172a" },
  input: { borderWidth: 1, borderColor: "#dbe4dc", backgroundColor: "#f8faf8", borderRadius: 12, padding: 12 },
  error: { backgroundColor: "#ffe4e6", color: "#9f1239", padding: 8, borderRadius: 10 },
  submit: { flexDirection: "row", marginTop: 6 },
  login: { flex: 1, backgroundColor: "#15803d", borderTopLeftRadius: 12, borderBottomLeftRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 48 },
  loginText: { color: "#fff", fontWeight: "800" },
  role: { width: 132, backgroundColor: "#166534", borderTopRightRadius: 12, borderBottomRightRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12 },
  roleText: { color: "#fff", fontWeight: "700" },
  menu: { backgroundColor: "#fff", borderRadius: 14, padding: 6, borderWidth: 1, borderColor: "#e2e8f0" },
  option: { padding: 10, borderRadius: 10 },
  optionText: { fontWeight: "700", color: "#0f172a" },
  optionOn: { fontWeight: "700", color: "#0f766e" },
  saved: { backgroundColor: "#ecfdf5", borderRadius: 12, padding: 12, alignItems: "center" },
  savedText: { color: "#14532d", fontWeight: "800" },
});

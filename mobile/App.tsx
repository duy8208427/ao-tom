import { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { HomeScreen } from "./src/HomeScreen";
import { LoginScreen } from "./src/LoginScreen";
import { PondScreen } from "./src/PondScreen";
import type { Pond, Role } from "./src/data";

type Session = { role: Role; account: string | null };

const LOGIN_URL = "https://iot.clb4u.com/users/login/index.html";

async function loginAccount(username: string, password: string): Promise<void> {
  if (!username || !password) throw new Error("Nhập username và mật khẩu.");
  const body = new URLSearchParams({ username, password });
  let html = "";
  try {
    const response = await fetch(LOGIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    html = await response.text();
  } catch {
    throw new Error("Không kết nối được máy chủ. Có thể xem dữ liệu đã lưu.");
  }
  const ok = /Xin chào/i.test(html) && !/name="password"/i.test(html);
  if (!ok) throw new Error("Đăng nhập không thành công. Kiểm tra tài khoản hoặc dùng dữ liệu đã lưu.");
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [pond, setPond] = useState<Pond | null>(null);

  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen
          onLogin={async (username, password, role) => {
            await loginAccount(username, password);
            setSession({ role, account: username });
          }}
          onSaved={(role) => setSession({ role, account: null })}
        />
      </>
    );
  }

  if (pond) {
    return (
      <>
        <StatusBar style="dark" />
        <PondScreen pond={pond} onBack={() => setPond(null)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <HomeScreen
        role={session.role}
        account={session.account}
        onOpenPond={setPond}
        onLogout={() => {
          setPond(null);
          setSession(null);
        }}
      />
    </>
  );
}

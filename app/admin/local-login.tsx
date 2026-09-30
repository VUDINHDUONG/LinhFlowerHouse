"use client";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
const subscribe = () => () => {};

export default function LocalLogin() {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = import.meta.env.DEV ? { token: form.get("password") } : { username: form.get("username"), password: form.get("password") };
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/local-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Không thể đăng nhập.");
      // A full navigation refreshes server authentication after setting the cookie.
      window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Kiểm tra kết nối và thử lại."); }
    finally { setBusy(false); }
  }
  const local = import.meta.env.DEV;
  return <main className="cms-denied"><p className="eyebrow rose">LINH FLOWER HOUSE</p><h1>Quản trị cửa hàng</h1><p>{local ? "Nhập mã truy cập local được cung cấp trên máy tính để quản lý cửa hàng từ điện thoại." : "Đăng nhập bằng tài khoản quản trị đã được cấp quyền."}</p><form className="cms-form local-login" method="post" action="/api/admin/local-login" onSubmit={submit}>{!local && <label>Tên đăng nhập<input name="username" autoComplete="username" required minLength={3} maxLength={64} /></label>}<label>{local ? "Mã truy cập" : "Mật khẩu"}<input name="password" type="password" autoComplete="current-password" required maxLength={128} /></label>{error && <p role="alert" className="cms-error">{error}</p>}<button className="button dark" disabled={busy || !ready}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button><Link href="/">← Xem cửa hàng</Link></form></main>;
}

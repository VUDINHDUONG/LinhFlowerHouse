"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Products from "./products-tab";
import Orders from "./orders-tab";
import Categories from "./categories-tab";
import { type Data, type Settings, type Action, request, messageOf, money, Heading, Empty, SaveBar, AdminErrorContext } from "./admin-shared";
type Tab = "overview" | "products" | "orders" | "categories" | "content";
const tabs = [["overview", "Tổng quan", "◫"], ["products", "Sản phẩm", "✦"], ["orders", "Đơn hàng", "□"], ["categories", "Danh mục", "⌘"], ["content", "Nội dung", "✎"]] as const;

export default function CmsClient() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const load = useCallback(async () => {
    try { setData(await request<Data>("/api/admin/bootstrap")); return true; }
    catch (e) { setNotice({ text: messageOf(e), error: true }); return false; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let cancelled = false;
    request<Data>("/api/admin/bootstrap")
      .then(value => { if (!cancelled) setData(value); })
      .catch(e => { if (!cancelled) setNotice({ text: messageOf(e), error: true }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const action: Action = async (path, method, body, message) => {
    if (pending.current) return false;
    pending.current = true; setBusy(true); setNotice(null);
    try {
      await request(path, method, body);
      const refreshed = await load();
      setNotice({ text: refreshed ? message : message + " Chưa tải lại được danh sách; hãy bấm Làm mới.", error: !refreshed });
      return true;
    } catch (e) { setNotice({ text: messageOf(e), error: true }); return false; }
    finally { pending.current = false; setBusy(false); }
  };
  return <AdminErrorContext.Provider value={notice?.error ? notice.text : ""}><main className="cms-shell admin-v2">
    <aside className="cms-sidebar"><Link href="/" className="cms-brand"><span>✦</span> Linh <em>CMS</em></Link><p>QUẢN TRỊ CỬA HÀNG</p>
      <nav aria-label="Quản trị">{tabs.map(([id, label, icon]) => <button key={id} disabled={busy || !data} aria-current={tab === id ? "page" : undefined} className={tab === id ? "active" : ""} onClick={() => { setNotice(null); setTab(id); }}><span aria-hidden="true">{icon}</span>{label}{id === "orders" && !!data?.orders.filter(o => o.status === "Mới").length && <b className="nav-count">{data.orders.filter(o => o.status === "Mới").length}</b>}</button>)}</nav>
      <a className="visit-site" href="/" target="_blank" rel="noreferrer">↗ Xem cửa hàng</a>
    </aside>
    <section className="cms-main"><header className="cms-header"><div><p className="eyebrow rose">LINH FLOWER HOUSE</p><h1>{tabs.find(t => t[0] === tab)?.[1]}</h1><p className="admin-subtitle">Chăm chút cửa hàng, từ những điều nhỏ nhất.</p></div><button className="admin-button" disabled={loading || busy} onClick={() => void load()}>{loading ? "Đang tải…" : "↻ Làm mới"}</button></header>
      {notice && <div className={notice.error ? "admin-notice error" : "admin-notice"} role={notice.error ? "alert" : "status"}><span>{notice.text}</span><button aria-label="Đóng thông báo" onClick={() => setNotice(null)}>×</button></div>}
      {!data ? <div className="cms-loading">{loading ? "Đang tải cửa hàng…" : <><p>Chưa tải được dữ liệu.</p><button className="admin-button" onClick={() => void load()}>Thử lại</button></>}</div> : <>
        {tab === "overview" && <Overview data={data} open={setTab} />}
        {tab === "products" && <Products products={data.products} categories={data.categories} action={action} busy={busy} />}
        {tab === "orders" && <Orders orders={data.orders} products={data.products} action={action} busy={busy} />}
        {tab === "categories" && <Categories categories={data.categories} products={data.products} action={action} busy={busy} />}
        {tab === "content" && <Content initial={data.settings} action={action} busy={busy} />}
      </>}
    </section>
  </main></AdminErrorContext.Provider>;
}
function Overview({ data, open }: { data: Data; open: (tab: Tab) => void }) {
  const metrics = [
    ["Đơn mới", data.orders.filter(o => o.status === "Mới").length, "Chờ bạn xác nhận"],
    ["Đơn hoàn tất", data.orders.filter(o => o.status === "Hoàn tất").length, "Đã hoàn thành"],
    ["Sản phẩm đang bán", data.products.filter(p => p.active).length, "Hiển thị trên cửa hàng"],
    ["Doanh thu hoàn tất", money.format(data.orders.filter(o => o.status === "Hoàn tất").reduce((n, o) => n + o.total, 0)), "Từ các đơn đã hoàn tất"],
  ];
  return <div className="cms-content"><div className="metric-grid">{metrics.map(([label, value, note]) => <article className="metric" key={label}><p>{label}</p><strong>{value}</strong><small>{note}</small></article>)}</div>
    <div className="admin-quick"><button className="admin-button primary" onClick={() => open("products")}>Quản lý sản phẩm →</button><button className="admin-button" onClick={() => open("orders")}>Xử lý đơn hàng →</button><span>{data.products.filter(p => p.active && p.stock < 5).length} sản phẩm sắp hết hàng</span></div>
    <section className="cms-panel"><Heading title="Đơn hoa gần đây" subtitle="HÔM NAY BẠN CẦN LÀM GÌ?" />
      {data.orders.length ? <div className="admin-recent">{data.orders.slice(0, 6).map(o => <button key={o.id} onClick={() => open("orders")}><div><b>{o.customerName}</b><small>{o.id} · {o.deliveryDate}</small></div><strong>{money.format(o.total)}</strong><span className="admin-badge">{o.status}</span></button>)}</div> : <Empty text="Chưa có đơn hàng. Bạn có thể tạo đơn cho khách mua qua điện thoại hoặc Zalo." />}
    </section>
  </div>;
}
function Content({ initial, action, busy }: { initial: Settings; action: Action; busy: boolean }) {
  const [settings, setSettings] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", prevent); return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  async function save(e: FormEvent) { e.preventDefault(); if (await action("/api/admin/settings", "PATCH", settings, "Đã lưu nội dung website.")) setSaved(settings); }
  const field = (key: string, title: string, multiline = false) => <label key={key}>{title}{multiline ? <textarea maxLength={key === "heroSubtitle" ? 500 : 200} value={settings[key] ?? ""} onChange={e => setSettings({ ...settings, [key]: e.target.value })} /> : <input type={key === "contactPhone" ? "tel" : key.startsWith("contact") ? "url" : "text"} maxLength={200} value={settings[key] ?? ""} onChange={e => setSettings({ ...settings, [key]: e.target.value })} />}</label>;
  return <div className="cms-content"><section className="cms-panel content-panel"><Heading title="Nội dung & liên hệ" subtitle="TIẾNG NÓI CỦA CỬA HÀNG" /><form className="cms-form" onSubmit={save}><fieldset disabled={busy}>{field("announcement", "Thông báo đầu trang")}{field("heroTitle", "Tiêu đề trang chủ", true)}{field("heroSubtitle", "Lời giới thiệu", true)}{field("contactPhone", "Số điện thoại")}{field("contactZalo", "Liên kết Zalo")}{field("contactInstagram", "Liên kết Instagram")}{dirty && <small>Bạn có thay đổi chưa lưu.</small>}<SaveBar busy={busy} text="Lưu nội dung" /></fieldset></form></section></div>;
}



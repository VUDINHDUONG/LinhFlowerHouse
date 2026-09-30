"use client";
import { useState, type FormEvent } from "react";
import { orderStatuses } from "../../lib/admin-validation";
import { type Order, type Product, type Line, type Action, normalize, money, linesOf, usePage, Heading, Empty, Pagination, Editor, SaveBar } from "./admin-shared";
type Draft = Omit<Order, "id" | "createdAt" | "itemsJson" | "total"> & { items: Line[] };

export default function Orders({ orders, products, action, busy }: { orders: Order[]; products: Product[]; action: Action; busy: boolean }) {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState(""); const [date, setDate] = useState("");
  const [editor, setEditor] = useState<{ id?: string; draft: Draft } | null>(null);
  const filtered = orders.filter(o => normalize(o.id + " " + o.customerName + " " + o.phone + " " + o.recipientName).includes(normalize(query)) && (!status || o.status === status) && (!date || o.deliveryDate === date));
  const { page, pages, rows, go } = usePage(filtered, [query, status, date].join("|"));
  function create() {
    const today = new Date(); const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    setEditor({ draft: { customerName: "", phone: "", email: "", recipientName: "", address: "", deliveryDate: localDate, deliverySlot: "Trong ngày", cardMessage: "", note: "", status: "Mới", items: [] } });
  }
  async function remove(o: Order) {
    if (!confirm("Xóa vĩnh viễn đơn " + o.id + " của " + o.customerName + "? Nếu khách hủy đơn, hãy chọn trạng thái Đã hủy để giữ lịch sử.")) return;
    await action("/api/admin/orders?id=" + encodeURIComponent(o.id), "DELETE", undefined, "Đã xóa đơn hàng.");
  }
  return <div className="cms-content"><Heading title={orders.length + " đơn hàng"} subtitle="MỖI ĐƠN HOA, MỘT CÂU CHUYỆN" action={<button className="admin-button primary" onClick={create}>＋ Tạo đơn hàng</button>} />
    <div className="admin-filters"><label className="admin-search">Tìm đơn hàng<input type="search" placeholder="Mã đơn, tên, số điện thoại…" value={query} onChange={e => setQuery(e.target.value)} /></label><label>Trạng thái<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả trạng thái</option>{orderStatuses.map(s => <option key={s}>{s}</option>)}</select></label><label>Ngày giao<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>{date && <button className="admin-button" onClick={() => setDate("")}>Bỏ lọc ngày</button>}</div><p className="admin-result">{filtered.length} kết quả</p>
    <div className="admin-orders">{rows.map(o => <article className="cms-panel admin-order" key={o.id}><div className="admin-order-heading"><div><b>{o.id}</b><small>{new Date(o.createdAt).toLocaleString("vi-VN")}</small></div><span className="admin-badge">{o.status}</span></div><h3>{o.customerName}</h3><a href={"tel:" + o.phone.replace(/[^+0-9]/g, "")}>{o.phone}</a><p>Giao <b>{o.deliveryDate}</b> · {o.deliverySlot}</p><p><b>Người nhận:</b> {o.recipientName}</p><p>{o.address}</p><details><summary>Chi tiết sản phẩm & lời nhắn</summary><ul>{linesOf(o).map((line, i) => <li key={i}>{line.name} × {line.quantity} — {money.format(line.price * line.quantity)}</li>)}</ul>{o.email && <p>Email: {o.email}</p>}{o.cardMessage && <p><b>Thiệp:</b> {o.cardMessage}</p>}{o.note && <p><b>Ghi chú:</b> {o.note}</p>}</details><div className="admin-order-total"><span>Tổng tiền</span><strong>{money.format(o.total)}</strong></div><label className="admin-status-label">Trạng thái đơn<select aria-label={"Trạng thái " + o.id} disabled={busy} value={o.status} onChange={e => void action("/api/admin/orders", "PATCH", { id: o.id, status: e.target.value }, "Đã cập nhật trạng thái đơn.")}>{orderStatuses.map(s => <option key={s}>{s}</option>)}</select></label><div className="admin-card-actions"><button disabled={busy} onClick={() => setEditor({ id: o.id, draft: { ...o, items: linesOf(o) } })}>Sửa đơn</button><button className="danger" disabled={busy} onClick={() => void remove(o)}>Xóa đơn</button></div></article>)}</div>
    {!rows.length && <Empty text="Không có đơn hàng phù hợp. Bạn có thể tạo đơn thủ công cho khách." />}<Pagination page={page} pages={pages} go={go} />
    {editor && <OrderEditor initial={editor.draft} id={editor.id} products={products} action={action} busy={busy} close={() => setEditor(null)} />}
  </div>;
}
function OrderEditor({ initial, id, products, action, busy, close }: { initial: Draft; id?: string; products: Product[]; action: Action; busy: boolean; close: () => void }) {
  const [draft, setDraft] = useState(initial);
  const set = (key: keyof Omit<Draft, "items">, value: string) => setDraft(d => ({ ...d, [key]: value }));
  const total = draft.items.reduce((n, l) => n + l.quantity * l.price, 0);
  function add(productId: string) {
    const p = products.find(p => p.id === productId); if (!p) return;
    setDraft(d => ({ ...d, items: d.items.some(l => l.productId === p.id) ? d.items.map(l => l.productId === p.id ? { ...l, quantity: l.quantity + 1 } : l) : [...d.items, { productId: p.id, name: p.name, image: p.image, price: p.price, quantity: 1 }] }));
  }
  async function save(e: FormEvent) {
    e.preventDefault();
    if (await action("/api/admin/orders", id ? "PATCH" : "POST", { ...draft, ...(id ? { id } : {}) }, id ? "Đã cập nhật đơn hàng." : "Đã tạo đơn hàng.")) close();
  }
  return <Editor title={id ? "Sửa đơn " + id : "Tạo đơn hàng"} busy={busy} close={close}><form className="cms-form" onSubmit={save}><fieldset disabled={busy}><div className="form-two"><label>Tên khách hàng<input required maxLength={80} value={draft.customerName} onChange={e => set("customerName", e.target.value)} /></label><label>Số điện thoại<input required type="tel" minLength={5} maxLength={30} value={draft.phone} onChange={e => set("phone", e.target.value)} /></label></div><label>Email (không bắt buộc)<input type="email" maxLength={120} value={draft.email} onChange={e => set("email", e.target.value)} /></label><label>Người nhận<input required maxLength={80} value={draft.recipientName} onChange={e => set("recipientName", e.target.value)} /></label><label>Địa chỉ giao<input required maxLength={300} value={draft.address} onChange={e => set("address", e.target.value)} /></label><div className="form-two"><label>Ngày giao<input required type="date" value={draft.deliveryDate} onChange={e => set("deliveryDate", e.target.value)} /></label><label>Khung giờ<input required maxLength={80} value={draft.deliverySlot} onChange={e => set("deliverySlot", e.target.value)} /></label></div>
    <label>Thêm sản phẩm vào đơn<select aria-label="Thêm sản phẩm vào đơn" value="" onChange={e => add(e.target.value)}><option value="">Chọn sản phẩm…</option>{products.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name} · {money.format(p.price)}</option>)}</select></label>
    <div className="admin-order-lines">{draft.items.map((line, i) => <div key={i}><b>{line.name}</b><label>Đơn giá<input aria-label={"Đơn giá " + line.name} type="number" inputMode="numeric" required min={1} max={1000000000} value={line.price} onChange={e => setDraft(d => ({ ...d, items: d.items.map((l, index) => index === i ? { ...l, price: Number(e.target.value) } : l) }))} /></label><label>Số lượng<input aria-label={"Số lượng " + line.name} type="number" inputMode="numeric" required min={1} max={1000} value={line.quantity} onChange={e => setDraft(d => ({ ...d, items: d.items.map((l, index) => index === i ? { ...l, quantity: Number(e.target.value) } : l) }))} /></label><button type="button" className="admin-button danger" aria-label={"Bỏ " + line.name} onClick={() => setDraft(d => ({ ...d, items: d.items.filter((_, index) => index !== i) }))}>Bỏ</button></div>)}</div>
    {!draft.items.length && <p className="cms-error">Chọn ít nhất một sản phẩm cho đơn hàng.</p>}<div className="admin-order-total"><span>Tổng đơn</span><strong>{money.format(total)}</strong></div>
    <label>Lời nhắn trên thiệp<textarea maxLength={400} value={draft.cardMessage} onChange={e => set("cardMessage", e.target.value)} /></label><label>Ghi chú<textarea maxLength={400} value={draft.note} onChange={e => set("note", e.target.value)} /></label><label>Trạng thái<select value={draft.status} onChange={e => set("status", e.target.value)}>{orderStatuses.map(s => <option key={s}>{s}</option>)}</select></label><SaveBar busy={busy} disabled={!draft.items.length} text="Lưu đơn hàng" /></fieldset></form></Editor>;
}


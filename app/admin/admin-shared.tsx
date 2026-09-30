"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
export const AdminErrorContext = createContext("");

export type Category = { id: string; name: string; slug: string; sortOrder: number; active: boolean };
export type Product = { id: string; name: string; categoryId: string; occasion: string; price: number; description: string; image: string; images: string[]; badge: string; stock: number; active: boolean; featured: boolean; createdAt: string; updatedAt: string };
export type Line = { productId: string; name: string; image: string; price: number; quantity: number };
export type Order = { id: string; customerName: string; phone: string; email: string; recipientName: string; address: string; deliveryDate: string; deliverySlot: string; cardMessage: string; note: string; itemsJson: string; total: number; status: string; createdAt: string };
export type ProductDraft = Omit<Product, "id" | "createdAt" | "updatedAt">;
export type Settings = Record<string, string>;
export type Data = { products: Product[]; categories: Category[]; orders: Order[]; settings: Settings };
export type Action = (path: string, method: string, body: unknown, message: string) => Promise<boolean>;
export const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
export const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
export const slugify = (s: string) => normalize(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function linesOf(order: Order): Line[] { try { const value = JSON.parse(order.itemsJson); return Array.isArray(value) ? value : []; } catch { return []; } }
export async function request<T = Record<string, unknown>>(path: string, method = "GET", body?: unknown): Promise<T> {
  const response = await fetch(path, { method, cache: "no-store", ...(body !== undefined ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? (response.status === 403 ? "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại." : "Không thể xử lý yêu cầu."));
  return data;
}
export function messageOf(error: unknown) { return error instanceof Error ? error.message : "Mất kết nối. Vui lòng thử lại."; }
export function Editor({ title, busy, close, children }: { title: string; busy: boolean; close: () => void; children: ReactNode }) {
  const error = useContext(AdminErrorContext);
  const ref = useRef<HTMLDialogElement>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const dialog = ref.current; dialog?.showModal();
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { dialog?.close(); document.body.style.overflow = previous; };
  }, []);
  useEffect(() => {
    const prevent = (e: BeforeUnloadEvent) => { if (dirty || busy) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", prevent); return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, busy]);
  function dismiss() { if (!busy && (!dirty || confirm("Bạn có thay đổi chưa lưu. Đóng và bỏ các thay đổi?"))) close(); }
  return <dialog ref={ref} className="admin-dialog admin-v2" aria-labelledby="editor-title" onCancel={e => { e.preventDefault(); dismiss(); }} onClick={e => { if (e.target === e.currentTarget) dismiss(); }}><div onChange={() => setDirty(true)}><header><div><p className="eyebrow rose">LINH FLOWER HOUSE</p><h2 id="editor-title">{title}</h2></div><button className="admin-button" type="button" aria-label="Đóng biểu mẫu" disabled={busy} onClick={dismiss}>×</button></header>{error && <p className="admin-notice error" role="alert">{error}</p>}<div className="admin-dialog-body">{children}</div></div></dialog>;
}
export function Heading({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) { return <div className="panel-heading"><div><p className="eyebrow rose">{subtitle}</p><h2>{title}</h2></div>{action}</div>; }
export function SaveBar({ busy, text, disabled = false }: { busy: boolean; text: string; disabled?: boolean }) { return <div className="admin-save"><button className="admin-button primary" type="submit" disabled={busy || disabled}>{busy ? "Đang xử lý…" : text}</button></div>; }
export function Empty({ text }: { text: string }) { return <div className="cms-empty"><span>✦</span><p>{text}</p></div>; }
export function usePage<T>(items: T[], filter: string) {
  const [state, setState] = useState({ filter, page: 1 });
  const pages = Math.max(1, Math.ceil(items.length / 12));
  const page = Math.min(state.filter === filter ? state.page : 1, pages);
  return { page, pages, rows: items.slice((page - 1) * 12, page * 12), go: (p: number) => setState({ filter, page: Math.max(1, Math.min(p, pages)) }) };
}
export function Pagination({ page, pages, go }: { page: number; pages: number; go: (p: number) => void }) {
  if (pages <= 1) return null;
  return <nav className="admin-pagination" aria-label="Phân trang"><button className="admin-button" disabled={page <= 1} onClick={() => go(page - 1)}>← Trước</button><span>Trang {page} / {pages}</span><button className="admin-button" disabled={page >= pages} onClick={() => go(page + 1)}>Sau →</button></nav>;
}

const MAX_SOURCE_IMAGE = 25 * 1024 * 1024;
const MAX_UPLOAD_IMAGE = 8 * 1024 * 1024;
const acceptedImageTypes = "image/jpeg,image/png,image/webp,image/heic,image/heif";

async function prepareImage(file: File) {
  if (file.size > MAX_SOURCE_IMAGE) throw new Error("Ảnh gốc tối đa 25 MB. Hãy chọn ảnh nhỏ hơn.");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    const loaded = new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("Không đọc được ảnh.")); });
    img.src = url;
    await loaded;
    if ("decode" in img) await img.decode();
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Không thể xử lý ảnh.")), "image/webp", 0.86));
    if (blob.size > MAX_UPLOAD_IMAGE) throw new Error("Ảnh sau xử lý vẫn vượt 8 MB. Hãy chọn ảnh nhỏ hơn.");
    return new File([blob], blob.type === "image/webp" ? "product.webp" : "product.png", { type: blob.type });
  } catch (error) {
    // Safari 17+ normally converts HEIC through canvas. Older phones can still
    // upload a small original HEIC instead of failing before it reaches the server.
    if (["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", ""].includes(file.type) && file.size <= MAX_UPLOAD_IMAGE) return file;
    if (file.type === "image/heic" || file.type === "image/heif") throw new Error("Không xử lý được ảnh HEIC này. Hãy dùng nút Chụp ảnh để tạo JPG hoặc chọn ảnh nhỏ hơn 8 MB.");
    throw error instanceof Error ? error : new Error("Không thể xử lý ảnh.");
  } finally { URL.revokeObjectURL(url); }
}

async function uploadProductImage(file: File) {
  const form = new FormData();
  form.append("file", await prepareImage(file));
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch("/api/admin/uploads", { method: "POST", body: form, signal: controller.signal });
    const result = await response.json().catch(() => ({})) as { url?: string; error?: string };
    if (!response.ok || !result.url) throw new Error(result.error ?? "Không thể tải ảnh.");
    return result.url;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("Tải ảnh quá lâu. Kiểm tra mạng rồi thử lại.");
    throw error;
  } finally { window.clearTimeout(timeout); }
}
export function ImagePicker({ value, setValue, onBusy }: { value: string; setValue: (s: string) => void; onBusy: (b: boolean) => void }) {
  const library = useRef<HTMLInputElement>(null); const camera = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false); const [feedback, setFeedback] = useState(""); const [failed, setFailed] = useState(false);
  async function upload(file?: File) {
    if (!file || busy) return;
    setBusy(true); onBusy(true); setFailed(false); setFeedback("Đang tối ưu và tải ảnh…");
    try {
      setValue(await uploadProductImage(file)); setFeedback("Ảnh đã tải lên. Bấm Lưu sản phẩm để hoàn tất.");
    } catch (e) { setFailed(true); setFeedback(messageOf(e)); }
    finally { setBusy(false); onBusy(false); if (library.current) library.current.value = ""; if (camera.current) camera.current.value = ""; }
  }
  return <section className="admin-upload" aria-label="Ảnh sản phẩm"><img src={value || "/assets/blush-bouquet.png"} alt="Xem trước ảnh sản phẩm" /><div><b>Ảnh sản phẩm</b><p>Chọn ảnh từ thư viện hoặc chụp trực tiếp. Ảnh được thu nhỏ tự động để tải nhanh hơn.</p><div className="upload-actions"><button type="button" className="admin-button primary" disabled={busy} onClick={() => library.current?.click()}>Chọn ảnh</button><button type="button" className="admin-button" disabled={busy} onClick={() => camera.current?.click()}>Chụp ảnh</button></div><input ref={library} type="file" accept={acceptedImageTypes} hidden aria-label="Chọn tệp ảnh" onChange={e => void upload(e.target.files?.[0])} /><input ref={camera} type="file" accept={acceptedImageTypes} capture="environment" hidden aria-label="Chụp ảnh sản phẩm" onChange={e => void upload(e.target.files?.[0])} /><small>JPG, PNG, WebP, HEIC · Ảnh gốc tối đa 25 MB</small></div>{feedback && <p className={failed ? "upload-feedback cms-error" : "upload-feedback"} role={failed ? "alert" : "status"}>{feedback}</p>}<details className="upload-url"><summary>Hoặc dùng đường dẫn ảnh có sẵn</summary><label>Đường dẫn ảnh<input maxLength={500} value={value} disabled={busy} onChange={e => setValue(e.target.value)} /></label></details></section>;
}

export function GalleryPicker({ images, setImages, onBusy }: { images: string[]; setImages: (images: string[]) => void; onBusy: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false); const [feedback, setFeedback] = useState(""); const [failed, setFailed] = useState(false);
  async function upload(files?: FileList | null) {
    const selections = Array.from(files ?? []).slice(0, Math.max(0, 12 - images.length));
    if (!selections.length || busy) return;
    setBusy(true); onBusy(true); setFailed(false); setFeedback(`Đang tối ưu ${selections.length} ảnh…`);
    try {
      const uploaded: string[] = []; const errors: string[] = [];
      for (const file of selections) {
        try { uploaded.push(await uploadProductImage(file)); }
        catch (error) { errors.push(messageOf(error)); }
      }
      if (uploaded.length) setImages([...images, ...uploaded].slice(0, 12));
      if (errors.length) { setFailed(true); setFeedback(uploaded.length ? `Đã thêm ${uploaded.length} ảnh, ${errors.length} ảnh chưa tải được: ${errors[0]}` : errors[0]); }
      else setFeedback(`Đã thêm ${uploaded.length} ảnh. Bấm Lưu sản phẩm để hoàn tất.`);
    } catch (e) { setFailed(true); setFeedback(messageOf(e)); }
    finally { setBusy(false); onBusy(false); if (input.current) input.current.value = ""; if (camera.current) camera.current.value = ""; }
  }
  function remove(index: number) { setImages(images.filter((_, current) => current !== index)); }
  return <section className="admin-gallery" aria-label="Thư viện ảnh sản phẩm"><div><b>Thư viện ảnh sản phẩm</b><p>Đăng tối đa 12 ảnh. Ảnh đầu tiên là ảnh đại diện; trên điện thoại, dùng nút Chụp ảnh để thêm nhanh.</p><div className="upload-actions"><button type="button" className="admin-button primary" disabled={busy || images.length >= 12} onClick={() => input.current?.click()}>Thêm ảnh</button><button type="button" className="admin-button" disabled={busy || images.length >= 12} onClick={() => camera.current?.click()}>Chụp ảnh</button></div><input ref={input} type="file" accept={acceptedImageTypes} multiple hidden aria-label="Thêm nhiều ảnh" onChange={e => void upload(e.target.files)} /><input ref={camera} type="file" accept={acceptedImageTypes} capture="environment" hidden aria-label="Chụp ảnh sản phẩm" onChange={e => void upload(e.target.files)} /></div><small>{images.length}/12 ảnh · JPG, PNG, WebP, HEIC · Ảnh đầu tiên là ảnh bìa.</small><div className="gallery-grid">{images.map((image, index) => <figure key={image} draggable={!busy} onDragStart={event => event.dataTransfer.setData("text/plain", String(index))} onDragOver={event => event.preventDefault()} onDrop={event => { const from = Number(event.dataTransfer.getData("text/plain")); if (Number.isInteger(from) && from !== index) { const next = [...images]; const [moved] = next.splice(from, 1); next.splice(index, 0, moved); setImages(next); } }}><img src={image} alt={index === 0 ? "Ảnh đại diện" : `Ảnh sản phẩm ${index + 1}`} /><span>{index === 0 ? "Ảnh bìa" : `Ảnh ${index + 1}`}</span><button type="button" aria-label={`Xóa ảnh ${index + 1}`} disabled={busy} onClick={() => remove(index)}>×</button></figure>)}</div>{feedback && <p className={failed ? "upload-feedback cms-error" : "upload-feedback"} role={failed ? "alert" : "status"}>{feedback}</p>}</section>;
}

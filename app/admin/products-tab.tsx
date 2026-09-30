"use client";
import { useState, type FormEvent } from "react";
import { type Product, type ProductDraft, type Category, type Action, money, normalize, usePage, Heading, Empty, Pagination, Editor, GalleryPicker, SaveBar } from "./admin-shared";

const emptyProduct: ProductDraft = { name: "", categoryId: "", occasion: "Dịp đặc biệt", price: 0, description: "", image: "", images: [], badge: "", stock: 10, active: true, featured: false };
export default function Products({ products, categories, action, busy }: { products: Product[]; categories: Category[]; action: Action; busy: boolean }) {
  const [query, setQuery] = useState(""); const [category, setCategory] = useState("");
  const [visibility, setVisibility] = useState(""); const [sort, setSort] = useState("new");
  const [editor, setEditor] = useState<{ id?: string; draft: ProductDraft } | null>(null);
  const filtered = products.filter(p => normalize(p.name + " " + p.occasion).includes(normalize(query)) && (!category || p.categoryId === category) && (!visibility || (visibility === "active" ? p.active : visibility === "hidden" ? !p.active : p.stock < 5))).sort((a, b) => sort === "price" ? a.price - b.price : sort === "name" ? a.name.localeCompare(b.name, "vi") : b.createdAt.localeCompare(a.createdAt));
  const { page, pages, rows, go } = usePage(filtered, [query, category, visibility, sort].join("|"));
  async function remove(p: Product) {
    if (!confirm('Xóa sản phẩm "' + p.name + '"? Đơn hàng đã có vẫn giữ thông tin cũ.')) return;
    await action("/api/admin/products?id=" + encodeURIComponent(p.id), "DELETE", undefined, "Đã xóa sản phẩm.");
  }
  return <div className="cms-content"><Heading title={products.length + " sản phẩm"} subtitle="BỘ SƯU TẬP CỦA BẠN" action={<button className="admin-button primary" onClick={() => setEditor({ draft: { ...emptyProduct, categoryId: categories[0]?.id ?? "" } })}>＋ Thêm sản phẩm</button>} />
    <div className="admin-filters"><label className="admin-search">Tìm sản phẩm<input type="search" placeholder="Tên hoa, dịp tặng…" value={query} onChange={e => setQuery(e.target.value)} /></label><label>Danh mục<select value={category} onChange={e => setCategory(e.target.value)}><option value="">Tất cả danh mục</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Trạng thái<select value={visibility} onChange={e => setVisibility(e.target.value)}><option value="">Tất cả trạng thái</option><option value="active">Đang bán</option><option value="hidden">Đang ẩn</option><option value="low">Sắp hết hàng (&lt; 5)</option></select></label><label>Sắp xếp<select value={sort} onChange={e => setSort(e.target.value)}><option value="new">Mới nhất</option><option value="name">Tên A–Z</option><option value="price">Giá tăng dần</option></select></label></div>
    <p className="admin-result">{filtered.length} kết quả</p>
    <div className="admin-products">{rows.map(p => <article className="admin-product" key={p.id}><div className="admin-product-image"><img src={p.image} alt={p.name} loading="lazy" /><span className={"admin-badge " + (p.active ? "" : "muted")}>{p.active ? "Đang bán" : "Đang ẩn"}</span></div><div className="admin-product-body"><small>{categories.find(c => c.id === p.categoryId)?.name ?? "Chưa phân loại"}{p.featured ? " · Nổi bật" : ""}</small><h3>{p.name}</h3><div className="admin-product-price"><strong>{money.format(p.price)}</strong><span className={p.stock < 5 ? "low-stock" : ""}>Tồn {p.stock}</span></div><div className="admin-card-actions"><button disabled={busy} onClick={() => setEditor({ id: p.id, draft: { ...p } })}>Sửa</button><button disabled={busy} onClick={() => void action("/api/admin/products", "PATCH", { ...p, active: !p.active }, p.active ? "Đã ẩn sản phẩm." : "Đã hiển thị sản phẩm.")}>{p.active ? "Ẩn" : "Hiện"}</button><button className="danger" disabled={busy} onClick={() => void remove(p)}>Xóa</button></div></div></article>)}</div>
    {!rows.length && <Empty text="Chưa có sản phẩm phù hợp. Thử đổi bộ lọc hoặc thêm mẫu hoa mới." />}<Pagination page={page} pages={pages} go={go} />
    {editor && <ProductEditor initial={editor.draft} id={editor.id} categories={categories} action={action} busy={busy} close={() => setEditor(null)} />}
  </div>;
}
function ProductEditor({ initial, id, categories, action, busy, close }: { initial: ProductDraft; id?: string; categories: Category[]; action: Action; busy: boolean; close: () => void }) {
  const [draft, setDraft] = useState(initial); const [uploading, setUploading] = useState(false);
  const set = <K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) => setDraft(d => ({ ...d, [key]: value }));
  async function save(e: FormEvent) {
    e.preventDefault();
    if (uploading) return;
    if (await action("/api/admin/products", id ? "PATCH" : "POST", { ...draft, ...(id ? { id } : {}) }, id ? "Đã lưu sản phẩm." : "Đã thêm sản phẩm.")) close();
  }
  return <Editor title={id ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"} busy={busy || uploading} close={close}><form className="cms-form" onSubmit={save}><fieldset disabled={busy}>
    <GalleryPicker images={draft.images} setImages={images => setDraft(current => ({ ...current, images, image: images[0] ?? current.image }))} onBusy={setUploading} />
    <label>Tên sản phẩm<input required maxLength={120} value={draft.name} onChange={e => set("name", e.target.value)} placeholder="Ví dụ: Đóa Hồng Mơ" /></label>
    <div className="form-two"><label>Danh mục<select aria-label="Danh mục" required value={draft.categoryId} onChange={e => set("categoryId", e.target.value)}><option value="">Chọn danh mục</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}{c.active ? "" : " (ẩn)"}</option>)}</select></label><label>Dịp tặng<input maxLength={80} value={draft.occasion} onChange={e => set("occasion", e.target.value)} /></label></div>
    {!categories.length && <p className="cms-error">Hãy tạo một danh mục trước khi thêm sản phẩm.</p>}
    <div className="form-two"><label>Giá bán (đ)<input required type="number" inputMode="numeric" min={1} max={1000000000} step={1} value={draft.price || ""} onChange={e => set("price", Number(e.target.value))} /></label><label>Tồn kho<input required type="number" inputMode="numeric" min={0} max={1000000} step={1} value={draft.stock} onChange={e => set("stock", Number(e.target.value))} /></label></div>
    <label>Nhãn sản phẩm<input maxLength={40} value={draft.badge} onChange={e => set("badge", e.target.value)} placeholder="Bán chạy, Mới, Đặt trước…" /></label>
    <label>Mô tả<textarea required maxLength={700} rows={4} value={draft.description} onChange={e => set("description", e.target.value)} /></label>
    <div className="check-row"><label><input type="checkbox" checked={draft.active} onChange={e => set("active", e.target.checked)} /> Hiển thị trên website</label><label><input type="checkbox" checked={draft.featured} onChange={e => set("featured", e.target.checked)} /> Nổi bật</label></div>
    <SaveBar busy={busy || uploading} disabled={!categories.length || !draft.images.length} text="Lưu sản phẩm" />
  </fieldset></form></Editor>;
}


"use client";
import { useState, type FormEvent } from "react";
import { type Category, type Product, type Action, normalize, slugify, Heading, Empty, Editor, SaveBar } from "./admin-shared";
type Draft = Omit<Category, "id">;

export default function Categories({ categories, products, action, busy }: { categories: Category[]; products: Product[]; action: Action; busy: boolean }) {
  const [editor, setEditor] = useState<{ id?: string; draft: Draft } | null>(null);
  const [query, setQuery] = useState("");
  const filtered = categories.filter(c => normalize(c.name + " " + c.slug).includes(normalize(query)));
  async function remove(c: Category) {
    if (!confirm('Xóa danh mục "' + c.name + '"?')) return;
    await action("/api/admin/categories?id=" + encodeURIComponent(c.id), "DELETE", undefined, "Đã xóa danh mục.");
  }
  return <div className="cms-content"><Heading title={categories.length + " danh mục"} subtitle="SẮP XẾP BỘ SƯU TẬP" action={<button className="admin-button primary" onClick={() => setEditor({ draft: { name: "", slug: "", sortOrder: categories.length + 1, active: true } })}>＋ Thêm danh mục</button>} /><div className="admin-filters"><label className="admin-search">Tìm danh mục<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Tên hoặc đường dẫn…" /></label></div><div className="admin-categories">{filtered.map(c => {
    const count = products.filter(p => p.categoryId === c.id).length;
    return <article className="cms-panel" key={c.id}><span className="admin-badge">{c.active ? "Hiển thị" : "Đang ẩn"}</span><h3>{c.name}</h3><p>/{c.slug}</p><small>{count} sản phẩm · Thứ tự {c.sortOrder}</small><div className="admin-card-actions"><button disabled={busy} onClick={() => setEditor({ id: c.id, draft: { ...c } })}>Sửa danh mục</button><button className="danger" disabled={busy || count > 0} onClick={() => void remove(c)}>Xóa</button></div>{count > 0 && <small>Chuyển sản phẩm sang danh mục khác để xóa.</small>}</article>;
  })}</div>{!filtered.length && <Empty text="Chưa có danh mục phù hợp. Thêm danh mục mới hoặc đổi từ khóa tìm kiếm." />}
    {editor && <CategoryEditor initial={editor.draft} id={editor.id} action={action} busy={busy} close={() => setEditor(null)} />}
  </div>;
}
function CategoryEditor({ initial, id, action, busy, close }: { initial: Draft; id?: string; action: Action; busy: boolean; close: () => void }) {
  const [draft, setDraft] = useState(initial); const [customSlug, setCustomSlug] = useState(!!id);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (await action("/api/admin/categories", id ? "PATCH" : "POST", { ...draft, ...(id ? { id } : {}) }, "Đã lưu danh mục.")) close();
  }
  return <Editor title={id ? "Chỉnh sửa danh mục" : "Thêm danh mục"} busy={busy} close={close}><form className="cms-form" onSubmit={save}><fieldset disabled={busy}><label>Tên danh mục<input required maxLength={80} value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value, ...(!customSlug ? { slug: slugify(e.target.value) } : {}) })} /></label><label>Đường dẫn không dấu<input required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={e => { setCustomSlug(true); setDraft({ ...draft, slug: e.target.value }); }} /></label><label>Thứ tự hiển thị<input type="number" required min={0} max={99999} step={1} inputMode="numeric" value={draft.sortOrder} onChange={e => setDraft({ ...draft, sortOrder: Number(e.target.value) })} /></label><div className="check-row"><label><input type="checkbox" checked={draft.active} onChange={e => setDraft({ ...draft, active: e.target.checked })} /> Hiển thị danh mục</label></div><SaveBar busy={busy} text="Lưu danh mục" /></fieldset></form></Editor>;
}

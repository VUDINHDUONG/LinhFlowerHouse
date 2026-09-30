"use client";

import { useEffect, useMemo, useState } from "react";
import "./catalog.css";

type Product = { id: string; name: string; categoryId: string; occasion: string; price: number; description: string; image: string; images: string[]; badge: string; stock: number; active: boolean; featured: boolean };
type Category = { id: string; name: string; slug: string; sortOrder: number; active: boolean };
type Settings = Record<string, string>;
const fallback: Settings = { announcement: "Hoa tươi & quà tặng được chọn theo mùa", heroTitle: "Chọn một món quà thật đẹp.", heroSubtitle: "Khám phá toàn bộ bộ sưu tập hoa và quà tặng của Linh Flower House.", contactZalo: "https://zalo.me/", contactPhone: "0900 000 000" };
const money = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

export default function FlowerShop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<Settings>(fallback);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    Promise.all([fetch("/api/products"), fetch("/api/settings")]).then(async ([productResponse, settingResponse]) => {
      if (productResponse.ok) { const data = await productResponse.json() as { products: Product[]; categories: Category[] }; setProducts(data.products); setCategories(data.categories); }
      if (settingResponse.ok) { const data = await settingResponse.json() as { settings: Settings }; setSettings(current => ({ ...current, ...data.settings })); }
    }).catch(() => {});
  }, []);
  const visible = useMemo(() => {
    const term = normalize(query.trim());
    return products.filter(product => (category === "all" || product.categoryId === category) && (!term || normalize(`${product.name} ${product.occasion} ${product.description}`).includes(term)));
  }, [products, category, query]);
  function choose(next: string) { setCategory(next); setMenu(false); document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  return <main className="catalog-shell">
    <div className="catalog-announcement">{settings.announcement}</div>
    <header className="catalog-header"><a href="#top" className="catalog-brand"><span>✦</span> Linh <em>Flower House</em></a><nav className="catalog-nav" aria-label="Danh mục">{categories.map(item => <button key={item.id} onClick={() => choose(item.id)}>{item.name}</button>)}</nav><div className="catalog-actions"><a href={settings.contactZalo} target="_blank" rel="noreferrer" className="catalog-zalo">Nhắn Zalo</a><button className="catalog-menu" aria-label="Mở danh mục" onClick={() => setMenu(value => !value)}>☰</button></div></header>
    {menu && <nav className="catalog-mobile-nav">{categories.map(item => <button key={item.id} onClick={() => choose(item.id)}>{item.name}</button>)}<a href={settings.contactZalo} target="_blank" rel="noreferrer">Nhắn Zalo</a></nav>}
    <section className="catalog-hero" id="top"><div><p className="catalog-kicker">LINH FLOWER HOUSE · CATALOGUE</p><h1>{settings.heroTitle}</h1><p>{settings.heroSubtitle}</p><button className="catalog-primary" onClick={() => choose("all")}>Xem tất cả sản phẩm <span>↓</span></button></div><div className="catalog-hero-image"><span>Hoa tươi<br />& quà tặng</span></div></section>
    <section className="catalog-products" id="products"><header><div><p className="catalog-kicker">BỘ SƯU TẬP</p><h2>Tất cả sản phẩm</h2></div><label className="catalog-search">⌕<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm tên hoa, dịp tặng…" aria-label="Tìm sản phẩm" /></label></header><div className="catalog-filters"><button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>Tất cả <small>{products.length}</small></button>{categories.map(item => <button key={item.id} className={category === item.id ? "active" : ""} onClick={() => setCategory(item.id)}>{item.name} <small>{products.filter(product => product.categoryId === item.id).length}</small></button>)}</div><p className="catalog-count">{visible.length} sản phẩm</p><div className="catalog-grid">{visible.map(product => <ProductCard key={product.id} product={product} onOpen={() => setSelected(product)} />)}</div>{!visible.length && <div className="catalog-empty"><b>Chưa tìm thấy sản phẩm phù hợp.</b><p>Thử một từ khóa khác hoặc nhắn Zalo để được Linh gợi ý mẫu hoa.</p><a href={settings.contactZalo} target="_blank" rel="noreferrer">Nhắn Zalo</a></div>}</section>
    <section className="catalog-contact"><div><p className="catalog-kicker">TƯ VẤN NHANH</p><h2>Đã chọn được mẫu hoa?</h2><p>Nhắn Linh qua Zalo để hỏi thêm về màu hoa, kích thước, số lượng và thời gian chuẩn bị.</p></div><a className="catalog-primary" href={settings.contactZalo} target="_blank" rel="noreferrer">Nhắn Zalo cho Linh <span>→</span></a></section>
    <footer className="catalog-footer"><div><span>✦</span> Linh <em>Flower House</em></div><a href={settings.contactZalo} target="_blank" rel="noreferrer">Zalo</a><a href={`tel:${settings.contactPhone.replace(/\s/g, "")}`}>{settings.contactPhone}</a><a href="/admin">Quản trị</a></footer>
    {selected && <ProductDetail product={selected} category={categories.find(item => item.id === selected.categoryId)?.name ?? "Sản phẩm"} zalo={settings.contactZalo} close={() => setSelected(null)} />}
  </main>;
}

function ProductCard({ product, onOpen }: { product: Product; onOpen: () => void }) {
  const images = product.images.length ? product.images : [product.image];
  return <article className="catalog-card"><button className="catalog-card-image" onClick={onOpen}><img src={images[0]} alt={product.name} loading="lazy" />{product.badge && <span>{product.badge}</span>}{images.length > 1 && <i>▣ {images.length}</i>}<b>Xem chi tiết</b></button><div><p>{product.occasion}</p><h3>{product.name}</h3><strong>{money.format(product.price)}</strong><button onClick={onOpen}>Xem ảnh & thông tin <span>→</span></button></div></article>;
}

function ProductDetail({ product, category, zalo, close }: { product: Product; category: string; zalo: string; close: () => void }) {
  const images = product.images.length ? product.images : [product.image]; const [active, setActive] = useState(0); const [zaloNotice, setZaloNotice] = useState("");
  const inquiry = `Chào Linh Flower House,\n\nMình muốn hỏi sản phẩm:\n• Tên: ${product.name}\n• Mã sản phẩm: ${product.id}\n• Giá tham khảo: ${money.format(product.price)}\n• Dịp tặng: ${product.occasion}\n• Mô tả: ${product.description}\n\nShop tư vấn giúp mình ạ. Cảm ơn shop!`;
  function askViaZalo() {
    const copied = navigator.clipboard?.writeText(inquiry);
    window.open(zalo, "_blank", "noopener,noreferrer");
    if (!copied) { setZaloNotice("Mở Zalo rồi sao chép nội dung hỏi hàng bên dưới để gửi cho Linh."); return; }
    void copied.then(() => setZaloNotice("Đã soạn sẵn và sao chép tin nhắn. Trong Zalo, chạm Giữ rồi Dán để gửi cho Linh.")).catch(() => setZaloNotice("Zalo đã mở. Hãy sao chép nội dung hỏi hàng bên dưới rồi dán để gửi."));
  }
  return <div className="catalog-dialog-backdrop" role="dialog" aria-modal="true" aria-label={`Thông tin ${product.name}`} onClick={event => { if (event.target === event.currentTarget) close(); }}><article className="catalog-detail"><button className="catalog-close" aria-label="Đóng" onClick={close}>×</button><section className="catalog-gallery"><img src={images[active]} alt={`${product.name} – ảnh ${active + 1}`} />{images.length > 1 && <div>{images.map((image, index) => <button className={active === index ? "active" : ""} key={image} aria-label={`Xem ảnh ${index + 1}`} onClick={() => setActive(index)}><img src={image} alt="" /></button>)}</div>}</section><section className="catalog-detail-copy"><p className="catalog-kicker">{category} · {product.occasion}</p><h2>{product.name}</h2><strong>{money.format(product.price)}</strong>{product.badge && <span className="catalog-detail-badge">{product.badge}</span>}<p className="catalog-description">{product.description}</p><dl><div><dt>Ảnh sản phẩm</dt><dd>{images.length} ảnh</dd></div><div><dt>Tình trạng</dt><dd>{product.stock > 0 ? "Còn nhận tư vấn" : "Hãy hỏi Linh để chọn mẫu tương tự"}</dd></div></dl><button type="button" className="catalog-primary" onClick={askViaZalo}>Hỏi mẫu này qua Zalo <span>→</span></button>{zaloNotice ? <p className="catalog-zalo-notice" role="status">{zaloNotice}</p> : <small>Shop sẽ nhận được tên, mã, giá và mô tả mẫu hoa trong tin nhắn.</small>}<details className="catalog-zalo-message"><summary>Xem và tự sao chép nội dung tin nhắn</summary><textarea readOnly aria-label="Nội dung hỏi sản phẩm" value={inquiry} onFocus={event => event.currentTarget.select()} /></details></section></article></div>;
}


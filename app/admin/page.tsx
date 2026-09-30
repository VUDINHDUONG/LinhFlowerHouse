import { isAdmin } from "../../lib/cms";
import CmsClient from "./cms-client";
import LocalLogin from "./local-login";
import Link from "next/link";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const allowed = await isAdmin();
  if (!allowed) {
    if (import.meta.env.DEV) return <LocalLogin />;
    return <main className="cms-denied"><p className="eyebrow rose">KHU VỰC RIÊNG</p><h1>Bạn chưa có quyền vào CMS.</h1><p>Hãy mở đường dẫn này bằng tài khoản đã được cấp quyền quản trị cho Linh Flower House.</p><Link className="button dark" href="/">Về trang cửa hàng</Link></main>;
  }
  return <CmsClient />;
}

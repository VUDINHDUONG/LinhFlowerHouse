import { isAdmin } from "../../lib/cms";
import CmsClient from "./cms-client";
import LocalLogin from "./local-login";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const allowed = await isAdmin();
  if (!allowed) {
    return <LocalLogin />;
  }
  return <CmsClient />;
}

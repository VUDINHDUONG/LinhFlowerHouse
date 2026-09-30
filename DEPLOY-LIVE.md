# Đưa Linh Flower House lên web chính thức

Website này dùng Cloudflare **Workers**, D1 và **Cloudinary Free** để trang quản trị, dữ liệu sản phẩm và ảnh hoạt động. Cloudflare Pages tĩnh không có đủ phần máy chủ cho ứng dụng này.

## Đã có sẵn trong mã nguồn

- Workflow GitHub Actions: `.github/workflows/deploy-cloudflare.yml`.
- Worker tên `linh-flower-house`.
- D1 tên `linh-flower-house-db`.
- Ảnh sản phẩm lưu trên Cloudinary Free.
- Mỗi lần đẩy nhánh `main`, GitHub sẽ build, áp dụng migration D1 và deploy Worker.

## Thiết lập Cloudflare một lần

Đăng nhập Cloudflare bằng Wrangler, rồi tạo dữ liệu production:

```powershell
$env:PATH = "$PWD\.local-tools\node-v22.23.3-win-x64;$env:PATH"
node node_modules/wrangler/bin/wrangler.js login
node node_modules/wrangler/bin/wrangler.js d1 create linh-flower-house-db --location apac
```

Lệnh tạo D1 trả về `database_id`. Lưu giá trị đó để khai báo ở GitHub. Lấy `Account ID` trong Cloudflare Dashboard, ở cột phải của trang quản lý tài khoản.

Tạo Cloudflare API Token có quyền sửa Workers và D1 cho đúng tài khoản. Không đưa token hay mật khẩu vào mã nguồn.

Tại Cloudinary Dashboard, lấy **Cloud name**, **API Key** và **API Secret** từ trang API Keys. Các giá trị này được lưu dạng encrypted secrets tại Worker Cloudflare, không đưa vào mã nguồn hoặc GitHub.

## Tạo repo GitHub và khai báo secrets

Tạo một repository private trên GitHub, sau đó thêm các GitHub Actions secrets sau:

| Secret | Giá trị |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | API token vừa tạo |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID Cloudflare |
| `CLOUDFLARE_D1_DATABASE_ID` | ID của `linh-flower-house-db` |

Khi push nhánh `main`, workflow sẽ deploy phiên bản Worker mới sau khi build xong. Khách tiếp tục dùng phiên bản cũ cho đến lúc phiên bản mới sẵn sàng. Ảnh Cloudinary và mật khẩu admin đã đặt tại Worker được giữ nguyên giữa các lần deploy. URL `*.workers.dev` xuất hiện trong trang Actions và Cloudflare Workers.

Sản phẩm, danh mục và thông tin liên hệ không cần deploy: cập nhật từ `/admin` được ghi trực tiếp vào D1 và Cloudinary, sau đó khách thấy ngay.

## Tên miền riêng

Thêm domain vào Cloudflare DNS. Sau lần deploy đầu tiên, trong Cloudflare Dashboard mở **Workers & Pages → linh-flower-house → Settings → Domains & Routes**, rồi thêm Custom Domain. Cloudflare tự tạo DNS và HTTPS.

## Đưa mã nguồn lên GitHub

Sau khi repository được tạo, chạy các lệnh sau ở thư mục dự án, thay URL bằng URL repository của bạn:

```powershell
git remote add origin https://github.com/TAI_KHOAN/linh-flower-house.git
git push -u origin main
```

Mật khẩu quản trị production được cấu hình thành Cloudflare secret. Không dùng hoặc chia sẻ mã local trong `.dev.vars`.

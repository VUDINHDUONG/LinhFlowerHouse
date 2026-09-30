import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Linh Flower House · Hoa & quà tặng",
  description: "Hoa tươi theo mùa và những món quà nhỏ, được gói theo câu chuyện của riêng bạn.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}

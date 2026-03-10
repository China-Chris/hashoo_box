import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "盲盒展示 | Mystery Box",
  description: "NFT 盲盒展示与开启体验",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Museo+Moderno:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-[#0a0a0f] text-[#f0f0f5]">
        {children}
      </body>
    </html>
  );
}

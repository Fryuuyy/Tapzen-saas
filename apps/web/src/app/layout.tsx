import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "TAPZEN — Digital Business Ecosystem", description: "Digital tools for modern businesses.", manifest: "/manifest.webmanifest" };
export const viewport: Viewport = { themeColor: "#080a09", width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
 return <html lang="ru"><body>{children}</body></html>;
}

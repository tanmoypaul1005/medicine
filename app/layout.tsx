import type { Metadata, Viewport } from "next";
import { Hind_Siliguri, Inter } from "next/font/google";
import { StoreProvider } from "@/store/StoreProvider";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const hind = Hind_Siliguri({
  variable: "--font-bangla",
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "MedicineMate — ওষুধের দাম ও সস্তা বিকল্প", template: "%s | MedicineMate" },
  description:
    "বাংলাদেশের যেকোনো ওষুধের দাম, একই generic-এর সস্তা বিকল্প আর সতর্কতা এক জায়গায়। Search medicine prices and cheaper alternatives in Bangladesh.",
};

export const viewport: Viewport = { themeColor: "#0f766e" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="bn" className={`${inter.variable} ${hind.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}

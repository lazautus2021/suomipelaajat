import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Suomalaiset pelaajat maailmalla",
  description: "Listaus suomalaisten futareiden matseista maailmalla!",
  icons: {
    icon: "https://www.suomipelaajat.fi/suomipelaajat.png",
    apple: "https://www.suomipelaajat.fi/suomipelaajat.png",
  },
  openGraph: {
    title: "Suomalaiset pelaajat maailmalla",
    description: "Listaus suomalaisten futareiden matseista maailmalla!",
    images: [{ url: "https://www.suomipelaajat.fi/suomipelaajat.png" }],
    siteName: "Suomipelaajat",
  },
  twitter: {
    card: "summary",
    title: "Suomalaiset pelaajat maailmalla",
    description: "Listaus suomalaisten futareiden matseista maailmalla!",
    images: ["https://www.suomipelaajat.fi/suomipelaajat.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>{children}
	<Analytics />
	</body>

    </html>
  );
}

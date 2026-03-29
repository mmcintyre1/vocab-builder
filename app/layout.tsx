import type { Metadata, Viewport } from "next";
import "./globals.css";
import PinGate from "@/components/PinGate";
import Nav from "@/components/Nav";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  title: "Vocab",
  description: "Personal vocabulary builder with spaced repetition",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Vocab",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1c1917",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistration />
        <PinGate>
          <main className="max-w-lg mx-auto px-4 pt-6 pb-24">
            {children}
          </main>
          <Nav />
        </PinGate>
      </body>
    </html>
  );
}

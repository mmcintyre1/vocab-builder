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
    statusBarStyle: "black-translucent",
    title: "Vocab",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f0e0d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistration />
        <PinGate>
          <Nav />
          <main className="max-w-lg mx-auto px-4" style={{ paddingTop: "calc(3.5rem + env(safe-area-inset-top) + 1.5rem)", paddingBottom: "max(2rem, env(safe-area-inset-bottom))" }}>
            {children}
          </main>
        </PinGate>
      </body>
    </html>
  );
}

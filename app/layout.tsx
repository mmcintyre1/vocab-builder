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
  themeColor: "#0f0e0d",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegistration />
        <PinGate>
          <Nav />
          <main className="max-w-lg mx-auto px-4 pt-20 pb-8">
            {children}
          </main>
        </PinGate>
      </body>
    </html>
  );
}

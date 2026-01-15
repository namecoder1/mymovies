import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Famflix | Streaming per la famiglia",
  description: "Guarda film e serie TV insieme alla tua famiglia",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Famflix",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
};

import { ProfileProvider } from "@/components/ProfileProvider";
import ProfileGate from "@/components/ProfileGate";
import { UserMediaProvider } from "@/components/UserMediaProvider";
import Footer from "@/components/Footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className="dark">
      <body className={cn(inter.className, "bg-zinc-950 text-white antialiased")}>
        <ProfileProvider>
          <ProfileGate>
            <UserMediaProvider>
              <Navbar />
              <main className="mt-20">
                {children}
              </main>
              <Toaster richColors />
              <ServiceWorkerRegister />
              <Footer />
            </UserMediaProvider>
          </ProfileGate>
        </ProfileProvider>
      </body>
    </html>
  );
}

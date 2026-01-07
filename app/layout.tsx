import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Famflix | Streaming per la famiglia",
  description: "Guarda film e serie TV insieme alla tua famiglia",
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
              <Footer />
            </UserMediaProvider>
          </ProfileGate>
        </ProfileProvider>
      </body>
    </html>
  );
}

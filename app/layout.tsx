import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { VideoProvider } from "@/context/video-context";
import { DrawProvider } from "@/context/draw-context";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Make Your GIF",
  description: "Record or upload a video and convert it to a GIF in seconds",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" >
      <body className={cn(inter.className, "bg-gradient-to-b from-rose-50 to-gray-200")}>
        <VideoProvider>
          <DrawProvider>
          {children}
          </DrawProvider>
        </VideoProvider>
      </body>
    </html>
  );
}

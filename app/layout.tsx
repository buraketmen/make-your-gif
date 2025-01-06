import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { VideoProvider } from '@/context/video-context';
import { DrawProvider } from '@/context/draw-context';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Make Your GIF',
  description: 'Record or upload a video and convert it to a GIF in seconds',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <VideoProvider>
          <DrawProvider>
            <Toaster />
            <main>{children}</main>
          </DrawProvider>
        </VideoProvider>
      </body>
    </html>
  );
}

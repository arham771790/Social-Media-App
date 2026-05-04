import { Geist, Geist_Mono } from "next/font/google";
import AppToaster from "@/components/ui/AppToaster";
import QueryProvider from "@/lib/QueryProvider";

import "./globals.css";
import IncomingCallCenter from "@/components/messages/call/IncomingCallCenter";
import CallPanelHost from "@/components/messages/call/CallPanelHost";
import AuthInitializer from "@/components/auth/AuthInitializer";
import { Toast } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Instopedia",
  description: "Connect, Share, Inspire",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <AuthInitializer />
          {children}
          <AppToaster position="top-right"/>
          <CallPanelHost/>
          <IncomingCallCenter/>
        </QueryProvider>
      </body>
    </html>
  );
}

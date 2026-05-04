import { Cormorant_Garamond, JetBrains_Mono, Manrope } from "next/font/google";
import AppToaster from "@/components/ui/AppToaster";
import QueryProvider from "@/lib/QueryProvider";

import "./globals.css";
import IncomingCallCenter from "@/components/messages/call/IncomingCallCenter";
import CallPanelHost from "@/components/messages/call/CallPanelHost";
import AuthInitializer from "@/components/auth/AuthInitializer";

const sans = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const display = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Instopedia",
  description: "Connect, Share, Inspire",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${sans.variable} ${display.variable} ${mono.variable} bg-background text-foreground antialiased`}
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

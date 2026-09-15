import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";
import GlobalClientComponents from "@/components/GlobalClientComponents";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const jetBrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "TRINETRA - Intelligent Border Video Analytics Platform",
  description: "AI-based intelligent video analytics platform for border surveillance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${spaceGrotesk.variable} ${jetBrains.variable} font-sans bg-[#090A0F] antialiased`}>
        <ThemeProvider>
          <GlobalClientComponents />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}


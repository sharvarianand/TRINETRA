import type { Metadata } from "next";
import { Share_Tech_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/ThemeContext";
import GlobalClientComponents from "@/components/GlobalClientComponents";

const techMono = Share_Tech_Mono({ weight: "400", subsets: ["latin"] });

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  document.documentElement.classList.add('dark');
                  localStorage.setItem('TRINETRA-theme', 'dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${techMono.className} bg-black text-cyan-500 antialiased bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem]`}>
        <ThemeProvider>
          <GlobalClientComponents>
            {children}
          </GlobalClientComponents>
        </ThemeProvider>
      </body>
    </html>
  );
}

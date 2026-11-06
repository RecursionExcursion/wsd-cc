import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import Starfield from "@/components/Starfield";
import ThemeToggle from "@/components/ThemeToggle";
import { THEME_KEY } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cosmic Workspace Deployer",
  description:
    "Define a workspace of apps and URLs, then download a script that launches them all.",
};

// Runs before first paint: apply the saved theme (dark by default) so there's no flash.
const themeScript = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark")}catch(e){}})()`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="relative isolate flex min-h-full flex-col">
        <Starfield />
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-9 w-9 rounded-full bg-gradient-to-br from-accent to-accent-2 shadow-[0_0_20px_var(--glow)]"
            />
            <div>
              <p className="font-display text-lg font-bold tracking-wider">
                COSMIC
              </p>
              <p className="-mt-1 text-xs tracking-[0.25em] text-muted">
                WORKSPACE DEPLOYER
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 sm:px-6">
          {children}
        </main>
        <footer className="mx-auto w-full max-w-6xl px-4 pb-6 text-center text-xs text-muted sm:px-6">
          🔒 Runs entirely in your browser. Nothing you enter is uploaded anywhere.
        </footer>
      </body>
    </html>
  );
}

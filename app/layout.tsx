import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const displayFont = Sora({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "GBP Suite — Google Business Profile + QR Reviews",
    template: "%s · GBP Suite",
  },
  description:
    "AI-assisted Google Business Profile management and QR-based review collection for Indian businesses.",
  applicationName: "GBP Suite",
  openGraph: {
    title: "GBP Suite",
    description:
      "AI-assisted Google Business Profile management and QR-based review collection for Indian businesses.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

// Applied before first paint: stored theme wins, otherwise follow the OS.
// Kept as a tiny inline script so there is no light→dark flash on load.
const themeInit = `(function(){try{var t=localStorage.getItem("gbp-theme");var m=window.matchMedia("(prefers-color-scheme: dark)").matches;var d=t==="dark"||(t!=="light"&&m);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${displayFont.variable} h-full antialiased`}
      // The inline script below sets the `dark` class on <html> before
      // first paint; tell React to accept the DOM over its payload.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      {/* body suppression: browsers/extensions may inject attributes
          (e.g. cz-shortcut-listen) before hydration — DOM must win. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

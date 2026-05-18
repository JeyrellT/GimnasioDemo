import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TanstackQueryProvider } from "@/components/shared/tanstack-query-provider";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Blackline Fitness",
    template: "%s — Blackline Fitness",
  },
  description: "Tu visión, tu evolución. Plataforma de entrenamiento personal para Costa Rica.",
  metadataBase: new URL(process.env.APP_URL ?? "https://blacklinefitness.app"),
  openGraph: {
    type: "website",
    locale: "es_CR",
    url: "https://blacklinefitness.app",
    siteName: "Blackline Fitness",
    title: "Blackline Fitness — Tu visión, tu evolución",
    description: "Plataforma de entrenamiento personal para entrenadores y clientes en Costa Rica.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Blackline Fitness — Entrenamiento personal profesional",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Blackline Fitness — Tu visión, tu evolución",
    description: "Plataforma de entrenamiento personal para Costa Rica.",
    images: ["/og-image.png"],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Blackline Fitness",
  },
  icons: {
    icon: "/icons/icon-192.svg",
    apple: "/icons/apple-touch-icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="es-CR"
      dir="ltr"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <body className="font-sans antialiased bg-[#09090B] text-[#FAFAFA]">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TanstackQueryProvider>
            {children}
            <Toaster
              position="bottom-center"
              toastOptions={{
                style: {
                  background: "#27272A",
                  color: "#FAFAFA",
                  border: "1px solid #3F3F46",
                },
              }}
            />
          </TanstackQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

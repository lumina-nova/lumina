import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getHealth } from "@/lib/api";

export const metadata: Metadata = {
  title: "LuminaKafka",
  description: "Kafka inspection UI"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const healthPromise = getHealth().catch(() => null);

  return (
    <RootLayoutInner healthPromise={healthPromise}>{children}</RootLayoutInner>
  );
}

async function RootLayoutInner({
  children,
  healthPromise
}: Readonly<{
  children: React.ReactNode;
  healthPromise: Promise<Awaited<ReturnType<typeof getHealth>> | null>;
}>) {
  const health = await healthPromise;
  const label = health?.kafka.connected
    ? `Cluster reachable · v${health.version}`
    : "Kafka unavailable";

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="lumina-theme-init" strategy="beforeInteractive">
          {`try {
            var savedTheme = localStorage.getItem("lumina-theme");
            if (savedTheme) {
              document.documentElement.dataset.theme = savedTheme;
              document.body.dataset.theme = savedTheme;
            }
          } catch (error) {}
          `}
        </Script>
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <AppShell healthLabel={label}>{children}</AppShell>
      </body>
    </html>
  );
}

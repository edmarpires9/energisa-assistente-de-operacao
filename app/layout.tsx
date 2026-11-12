import { Geist, Geist_Mono, Figtree, Outfit } from "next/font/google"

import "./globals.css"
import { RouteUsageTracker } from "@/components/route-usage-tracker"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import type { Metadata } from "next"

const outfitHeading = Outfit({ subsets: ["latin"], variable: "--font-heading" })

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "Apoio Operacional",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        figtree.variable,
        outfitHeading.variable
      )}
    >
      <body>
        <ThemeProvider>
          <RouteUsageTracker />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Scrutin - Analyse de votes",
  description: "Application d'analyse de scrutin et de votes",
  generator: "Next.js",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`cursor-default ${inter.className}`}>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors />
      </body>
    </html>
  )
}

"use client"

import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Body } from "./components/body"
import { useSearchParams } from "next/navigation"
import { Suspense } from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Scrutin au jugement médian",
  description: "Analyse des votes selon la méthode du jugement médian",
  generator: "Next.js",
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams()
  const isEmbedded = searchParams.get("d") === "embed"

  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={inter.className}
      style={isEmbedded ? { overflow: "hidden" } : undefined}>
      <Body>{children}</Body>
    </html>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense>
      <LayoutContent>{children}</LayoutContent>
    </Suspense>
  )
}

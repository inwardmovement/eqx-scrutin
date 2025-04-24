import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Body } from "./components/body"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Scrutin au jugement médian",
  description: "Analyse des votes selon la méthode du jugement médian",
  generator: "Next.js",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" suppressHydrationWarning className={inter.className}>
      <Body>{children}</Body>
    </html>
  )
}

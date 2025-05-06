import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Suspense } from "react"
import { ClientLayout } from "./components/client-layout"

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
    <Suspense>
      <ClientLayout className={inter.className}>{children}</ClientLayout>
    </Suspense>
  )
}

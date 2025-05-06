"use client"

import { useSearchParams } from "next/navigation"
import { Body } from "./body"

export function ClientLayout({
  children,
  className,
}: {
  children: React.ReactNode
  className: string
}) {
  const searchParams = useSearchParams()
  const isEmbedded = searchParams.get("d") === "embed"

  return (
    <html
      lang="fr"
      suppressHydrationWarning
      className={className}
      style={isEmbedded ? { overflow: "hidden" } : undefined}>
      <Body>{children}</Body>
    </html>
  )
}

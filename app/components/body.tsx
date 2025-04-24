"use client"

import { useEffect } from "react"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

export function Body({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const isEmbedded =
      new URLSearchParams(window.location.search).get("d") === "embed"
    if (isEmbedded) {
      document.body.style.backgroundColor = "initial"
    }
  }, [])

  return (
    <body className="cursor-default">
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster richColors />
    </body>
  )
}

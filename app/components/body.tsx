"use client"

import { useEffect } from "react"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"

export function Body({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const isEmbedded =
      new URLSearchParams(window.location.search).get("d") === "embed"
    const htmlElement = document.documentElement
    const previousOverflow = htmlElement.style.overflow

    if (isEmbedded) {
      document.body.style.backgroundColor = "initial"
      htmlElement.style.overflow = "hidden"
    }

    return () => {
      htmlElement.style.overflow = previousOverflow
    }
  }, [])

  return (
    <body className="cursor-default bg-brand-dark-blue">
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster richColors />
    </body>
  )
}

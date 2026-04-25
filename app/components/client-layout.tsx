import { Body } from "./body"

export function ClientLayout({
  children,
  className,
}: {
  children: React.ReactNode
  className: string
}) {
  return (
    <html lang="fr" suppressHydrationWarning className={className}>
      <Body>{children}</Body>
    </html>
  )
}

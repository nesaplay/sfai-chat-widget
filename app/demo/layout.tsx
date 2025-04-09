import type React from "react"
import Script from "next/script"

export default function DemoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <Script src="/widget.js" strategy="afterInteractive" />
    </>
  )
}

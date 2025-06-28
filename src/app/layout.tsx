import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Flow Dice Poker - Cryptographically Secure Gaming",
  description: "Experience the thrill of dice poker on Flow blockchain with verifiable randomness",
  keywords: "Flow, blockchain, dice poker, VRF, gaming, crypto",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black text-white`}>
        <div className="fixed inset-0 bg-gradient-to-br from-green-900/20 via-purple-900/20 to-blue-900/20 pointer-events-none" />
        <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center opacity-5 pointer-events-none" />
        {children}
      </body>
    </html>
  )
}
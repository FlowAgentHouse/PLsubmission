"use client"

import type { ReactNode } from "react"
import { WagmiProvider, createConfig } from "wagmi"
import { sepolia } from "wagmi/chains"
import { http } from "viem"
import { EthereumClient } from "@web3modal/ethereum"
import { Web3Modal } from "@web3modal/react"
import { modalConnectors } from "@web3modal/wagmi"

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "YOUR_PROJECT_ID"

/* -------------------------------------------------------------------------- */
/*  wagmi v2 configuration                                                    */
/* -------------------------------------------------------------------------- */
const chains = [sepolia]

const wagmiConfig = createConfig({
  chains,
  connectors: modalConnectors({ projectId, chains }),
  transports: {
    [sepolia.id]: http(), // ← public RPC; replace with your own if desired
  },
  ssr: true,
})

const ethereumClient = new EthereumClient(wagmiConfig, chains)

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <>
      <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
      <Web3Modal projectId={projectId} ethereumClient={ethereumClient} />
    </>
  )
}

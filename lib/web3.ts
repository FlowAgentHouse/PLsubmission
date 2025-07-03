import { BrowserProvider, Contract } from "ethers"
import type { Signer } from "ethers"
import Web3Modal from "web3modal"
import contractAbi from "../abi/DicePoker.json"

// Flow EVM Testnet Configuration
const FLOW_TESTNET_CONFIG = {
  chainId: 545,
  name: "Flow EVM Testnet",
  rpcUrl: "https://testnet.evm.nodes.onflow.org",
  blockExplorer: "https://evm-testnet.flowscan.io",
  nativeCurrency: {
    name: "Flow",
    symbol: "FLOW",
    decimals: 18
  }
}

const CONTRACT_ADDRESS = "0xFF2B890de3C8f2eE8725678F2a2598b5C42E4fAc"

let web3Modal: Web3Modal
let provider: BrowserProvider | null = null
let signer: Signer | null = null
let contract: Contract | null = null

export function initWeb3() {
  if (typeof window !== "undefined") {
    web3Modal = new Web3Modal({
      cacheProvider: true,
      providerOptions: {
        // Add provider options here if needed for WalletConnect, etc.
      },
      theme: "dark"
    })
  }
}

export async function connectWallet(): Promise<{ provider: BrowserProvider; signer: Signer }> {
  try {
    if (!web3Modal) {
      throw new Error("Web3Modal not initialized")
    }

    const instance = await web3Modal.connect()
    provider = new BrowserProvider(instance)
    
    // Check if we need to switch to Flow Testnet
    const network = await provider.getNetwork()
    const currentChainId = Number(network.chainId)

    if (currentChainId !== FLOW_TESTNET_CONFIG.chainId) {
      try {
        // Request to switch to Flow Testnet
        await instance.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${FLOW_TESTNET_CONFIG.chainId.toString(16)}` }],
        })
      } catch (switchError: any) {
        // Chain not added to wallet
        if (switchError.code === 4902) {
          await instance.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: `0x${FLOW_TESTNET_CONFIG.chainId.toString(16)}`,
              chainName: FLOW_TESTNET_CONFIG.name,
              nativeCurrency: FLOW_TESTNET_CONFIG.nativeCurrency,
              rpcUrls: [FLOW_TESTNET_CONFIG.rpcUrl],
              blockExplorerUrls: [FLOW_TESTNET_CONFIG.blockExplorer],
            }],
          })
        } else {
          throw switchError
        }
      }
      
      // Recreate provider after network switch
      provider = new BrowserProvider(instance)
    }

    signer = await provider.getSigner()
    contract = new Contract(CONTRACT_ADDRESS, contractAbi.abi, signer)

    // Set up event listeners for account/network changes
    if (instance.on) {
      instance.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet()
        } else {
          // Reload the page or update the account
          window.location.reload()
        }
      })

      instance.on("chainChanged", () => {
        // Reload the page when network changes
        window.location.reload()
      })
    }

    return { provider, signer }
  } catch (error) {
    console.error("Failed to connect wallet:", error)
    throw error
  }
}

export async function disconnectWallet() {
  if (web3Modal) {
    await web3Modal.clearCachedProvider()
  }
  provider = null
  signer = null
  contract = null
}

export function getSigner(): Signer {
  if (!signer) throw new Error("Wallet not connected")
  return signer
}

export function getProvider(): BrowserProvider {
  if (!provider) throw new Error("Wallet not connected")
  return provider
}

export function getDicePokerContract() {
  if (!contract || !signer) {
    throw new Error("Please connect your wallet first")
  }
  return contract
}

export async function checkContractExists() {
  try {
    const currentProvider = provider || new BrowserProvider((window as any).ethereum || FLOW_TESTNET_CONFIG.rpcUrl)
    const code = await currentProvider.getCode(CONTRACT_ADDRESS)
    return {
      exists: code !== "0x",
      error: code === "0x" ? "Contract not deployed at this address" : null
    }
  } catch (error: any) {
    return {
      exists: false,
      error: `Failed to check contract: ${error.message}`
    }
  }
}

// Auto-reconnect if cached
export async function autoConnectWallet(): Promise<{ provider: BrowserProvider; signer: Signer } | null> {
  try {
    if (web3Modal?.cachedProvider) {
      return await connectWallet()
    }
    return null
  } catch (error) {
    console.error("Auto-connect failed:", error)
    return null
  }
}
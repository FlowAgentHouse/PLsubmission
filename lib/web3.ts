import { BrowserProvider, Contract, formatEther, parseEther } from "ethers"
import type { Signer } from "ethers"
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

const CONTRACT_ADDRESS = "0xC0933C5440c656464D1Eb1F886422bE3466B1459"

let provider: BrowserProvider | null = null
let signer: Signer | null = null
let contract: Contract | null = null

export const initWeb3 = () => {
  // Web3 will be initialized when user connects wallet
}

export const connectWallet = async () => {
  if (!window.ethereum) {
    throw new Error("Please install MetaMask or another Web3 wallet")
  }

  try {
    // Request account access
    await window.ethereum.request({ method: "eth_requestAccounts" })

    // Check if we need to switch to Flow Testnet
    const chainId = await window.ethereum.request({ method: "eth_chainId" })
    const currentChainId = parseInt(chainId, 16)

    if (currentChainId !== FLOW_TESTNET_CONFIG.chainId) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${FLOW_TESTNET_CONFIG.chainId.toString(16)}` }],
        })
      } catch (switchError: any) {
        // Chain not added to MetaMask
        if (switchError.code === 4902) {
          await window.ethereum.request({
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
    }

    provider = new BrowserProvider(window.ethereum)
    signer = await provider.getSigner()
    contract = new Contract(CONTRACT_ADDRESS, contractAbi.abi, signer)

    return { provider, signer }
  } catch (error) {
    console.error("Failed to connect wallet:", error)
    throw error
  }
}

export const disconnectWallet = async () => {
  provider = null
  signer = null
  contract = null
}

export const getDicePokerContract = () => {
  if (!contract || !signer) {
    throw new Error("Please connect your wallet first")
  }
  return contract
}

export const checkContractExists = async () => {
  try {
    if (!provider) {
      provider = new BrowserProvider(window.ethereum || FLOW_TESTNET_CONFIG.rpcUrl)
    }
    const code = await provider.getCode(CONTRACT_ADDRESS)
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

// Extend window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any
  }
}
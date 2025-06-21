import { BrowserProvider, Contract, JsonRpcProvider } from "ethers"
import type { Signer } from "ethers"
import Web3Modal from "web3modal"

let web3Modal: Web3Modal
let provider: BrowserProvider | null = null
let signer: Signer | null = null

const CONTRACT_ADDRESS = "0xD382f910789b8AEad4f41B5ea27e6E058c3f9cCf"
// Use environment variable first, fallback to hardcoded
const SEPOLIA_RPC_URL =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/0d4aa52670ca4855b637394cb6d0f9ab"

const DICE_POKER_ABI = [
  "function currentState() view returns (uint8)",
  "function players(uint256) view returns (address)",
  "function bets(uint256) view returns (uint256)",
  "function playerDice(uint256, uint256) view returns (uint8)",
  "function currentBet() view returns (uint256)",
  "function roundBet(address) view returns (uint256)",
  "function joinGame()",
  "function placeBet() payable",
  "function call() payable",
  "function fold()",
  "function rollDice()",
  "function resetIfExpired()",
]

export function initWeb3() {
  if (typeof window !== "undefined") {
    web3Modal = new Web3Modal({
      cacheProvider: true,
      providerOptions: {},
    })
  }
}

export async function connectWallet(): Promise<{ provider: BrowserProvider; signer: Signer }> {
  try {
    const instance = await web3Modal.connect()
    provider = new BrowserProvider(instance)
    signer = await provider.getSigner()

    // Test the connection
    await signer.getAddress()

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
}

export function getSigner(): Signer {
  if (!signer) throw new Error("Wallet not connected")
  return signer
}

export function getProvider(): BrowserProvider {
  if (!provider) throw new Error("Wallet not connected")
  return provider
}

export function getDicePokerContract(): Contract {
  const currentSigner = getSigner()
  return new Contract(CONTRACT_ADDRESS, DICE_POKER_ABI, currentSigner)
}

// Helper function to check if contract exists using multiple RPC endpoints
export async function checkContractExists(): Promise<{ exists: boolean; rpcUsed: string; error?: string }> {
  const rpcEndpoints = [
    SEPOLIA_RPC_URL,
    "https://1rpc.io/sepolia",
    "https://sepolia.infura.io/v3/0d4aa52670ca4855b637394cb6d0f9ab",
    "https://rpc.sepolia.org",
  ]

  for (const rpcUrl of rpcEndpoints) {
    try {
      console.log(`Trying RPC: ${rpcUrl}`)
      const testProvider = new JsonRpcProvider(rpcUrl)
      const code = await testProvider.getCode(CONTRACT_ADDRESS)
      const exists = code !== "0x"
      console.log(`RPC ${rpcUrl} - Contract exists: ${exists}, Code length: ${code.length}`)

      if (exists) {
        return { exists: true, rpcUsed: rpcUrl }
      }
    } catch (error) {
      console.error(`RPC ${rpcUrl} failed:`, error)
      continue
    }
  }

  return { exists: false, rpcUsed: "none", error: "Contract not found on any RPC endpoint" }
}

// Helper function to get contract with read-only provider
export function getReadOnlyContract(): Contract {
  const readProvider = new JsonRpcProvider(SEPOLIA_RPC_URL)
  return new Contract(CONTRACT_ADDRESS, DICE_POKER_ABI, readProvider)
}

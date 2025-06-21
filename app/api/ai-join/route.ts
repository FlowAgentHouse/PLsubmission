import { type NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"

const CONTRACT_ADDRESS = "0xD382f910789b8AEad4f41B5ea27e6E058c3f9cCf"
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/0d4aa52670ca4855b637394cb6d0f9ab"
const AI_PRIVATE_KEY =
  process.env.AI_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001"

const DICE_POKER_ABI = [
  "function currentState() view returns (uint8)",
  "function players(uint256) view returns (address)",
  "function joinGame()",
]

export async function POST(request: NextRequest) {
  try {
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL)
    const aiWallet = new ethers.Wallet(AI_PRIVATE_KEY, provider)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, DICE_POKER_ABI, aiWallet)

    // Check if AI can join (game state should be 0 and player 2 slot should be empty)
    const currentState = await contract.currentState()
    const player2 = await contract.players(1)

    if (Number(currentState) !== 0) {
      return NextResponse.json({ error: "Game not in joining state" }, { status: 400 })
    }

    if (player2 !== "0x0000000000000000000000000000000000000000") {
      return NextResponse.json({ error: "Player 2 slot already taken" }, { status: 400 })
    }

    // AI joins the game
    const tx = await contract.joinGame()
    await tx.wait()

    return NextResponse.json({
      success: true,
      message: "AI joined the game",
      txHash: tx.hash,
    })
  } catch (error: any) {
    console.error("AI join error:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to join game",
      },
      { status: 500 },
    )
  }
}

import { type NextRequest, NextResponse } from "next/server"
import { ethers } from "ethers"

const CONTRACT_ADDRESS = "0xD382f910789b8AEad4f41B5ea27e6E058c3f9cCf"
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/0d4aa52670ca4855b637394cb6d0f9ab"
const AI_PRIVATE_KEY =
  process.env.AI_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001"

const DICE_POKER_ABI = [
  "function currentState() view returns (uint8)",
  "function players(uint256) view returns (address)",
  "function currentBet() view returns (uint256)",
  "function roundBet(address) view returns (uint256)",
  "function call() payable",
  "function rollDice()",
]

export async function POST(request: NextRequest) {
  try {
    const { gameState } = await request.json()

    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL)
    const aiWallet = new ethers.Wallet(AI_PRIVATE_KEY, provider)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, DICE_POKER_ABI, aiWallet)

    // Verify it's AI's turn (AI is player 2, so even-numbered states in betting rounds)
    const bettingStates = [2, 4, 8, 10, 14, 16, 20, 22] // Player 2 betting states
    const rollStates = [6, 12, 18, 24] // Player 2 roll states

    let action = ""
    let tx

    if (bettingStates.includes(gameState)) {
      // AI always calls during betting
      const currentBet = await contract.currentBet()
      const roundCommitted = await contract.roundBet(aiWallet.address)
      const toCall = currentBet - roundCommitted

      if (toCall > 0n) {
        tx = await contract.call({ value: toCall })
        action = `AI called ${ethers.formatEther(toCall)} ETH`
      } else {
        // If nothing to call, just return success
        return NextResponse.json({
          success: true,
          message: "AI has nothing to call",
        })
      }
    } else if (rollStates.includes(gameState)) {
      // AI rolls dice
      tx = await contract.rollDice()
      action = "AI rolled dice"
    } else {
      return NextResponse.json(
        {
          error: "Not AI's turn or invalid game state",
        },
        { status: 400 },
      )
    }

    if (tx) {
      await tx.wait()
    }

    return NextResponse.json({
      success: true,
      message: action,
      txHash: tx?.hash,
    })
  } catch (error: any) {
    console.error("AI action error:", error)
    return NextResponse.json(
      {
        error: error.message || "AI action failed",
      },
      { status: 500 },
    )
  }
}

// /app/api/ai-join/route.ts
import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import DicePokerABI from '@/abi/DicePoker.json'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xC0933C5440c656464D1Eb1F886422bE3466B1459"
const RPC_URL = process.env.RPC_URL || "https://testnet.evm.nodes.onflow.org"

/**
 * This route allows the AI agent to join an open game slot.
 * It checks for game state and player availability before executing the transaction.
 */
export async function POST() {
  try {
    const aiPrivateKey = process.env.AGENT_PRIVATE_KEY
    if (!aiPrivateKey) {
      return NextResponse.json({ 
        error: "AI wallet not configured",
        message: "The Dealer is currently offline." 
      }, { status: 500 })
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const aiWallet = new ethers.Wallet(aiPrivateKey, provider)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, DicePokerABI.abi, aiWallet)

    const gameState = await contract.currentState()
    const players = await Promise.all([
      contract.players(0),
      contract.players(1)
    ])

    if (Number(gameState) !== 0) {
      return NextResponse.json({ 
        error: "Game already in progress",
        message: "Sorry, you missed the deal. The game has already started." 
      }, { status: 400 })
    }

    if (players.includes(aiWallet.address)) {
         return NextResponse.json({ 
            error: "AI already in game",
            message: "I'm already at the table, ready to take your FLOW." 
        }, { status: 400 });
    }

    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
    if (players[0] === ZERO_ADDRESS || players[1] === ZERO_ADDRESS) {
      const tx = await contract.joinGame()
      await tx.wait()

      return NextResponse.json({ 
        success: true,
        message: "🤖 The Dealer has arrived. Shuffle up and deal!",
        txHash: tx.hash,
        aiAddress: aiWallet.address
      })
    } else {
      return NextResponse.json({ 
        error: "Game is full",
        message: "Table's full, champ. Maybe next time." 
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error("AI join error:", error)
    return NextResponse.json({ 
      error: error.message,
      message: "The Dealer had trouble finding the table. Please try again." 
    }, { status: 500 })
  }
}

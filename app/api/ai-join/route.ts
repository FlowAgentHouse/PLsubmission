import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import DicePokerABI from '@/abi/DicePoker.json'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xC0933C5440c656464D1Eb1F886422bE3466B1459"
const RPC_URL = process.env.RPC_URL || "https://testnet.evm.nodes.onflow.org"

export async function POST() {
  try {
    // Check if AI private key is configured
    const aiPrivateKey = process.env.AGENT_PRIVATE_KEY
    if (!aiPrivateKey) {
      return NextResponse.json({ 
        error: "AI wallet not configured",
        message: "AI is not available at the moment" 
      }, { status: 500 })
    }

    // Create wallet and contract instance
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const aiWallet = new ethers.Wallet(aiPrivateKey, provider)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, DicePokerABI.abi, aiWallet)

    // Check game state
    const gameState = await contract.currentState()
    const players = await Promise.all([
      contract.players(0),
      contract.players(1)
    ])

    // Check if AI can join
    if (Number(gameState) !== 0) {
      return NextResponse.json({ 
        error: "Game already in progress",
        message: "AI cannot join - game already started" 
      }, { status: 400 })
    }

    // Check if there's a spot available
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
    if (players[0] === ZERO_ADDRESS || players[1] === ZERO_ADDRESS) {
      // Join the game
      const tx = await contract.joinGame()
      await tx.wait()

      return NextResponse.json({ 
        success: true,
        message: "🤖 AI Dealer has joined the game!",
        txHash: tx.hash,
        aiAddress: aiWallet.address
      })
    } else {
      return NextResponse.json({ 
        error: "Game is full",
        message: "Both player slots are occupied" 
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error("AI join error:", error)
    return NextResponse.json({ 
      error: error.message,
      message: "AI failed to join the game" 
    }, { status: 500 })
  }
}
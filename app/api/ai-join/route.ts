// /app/api/ai-join/route.ts
import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import DicePokerABI from '@/abi/DicePoker.json'

// CRITICAL: This tells Next.js this route should be dynamic, not static
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xC0933C5440c656464D1Eb1F886422bE3466B1459"
const RPC_URL = process.env.RPC_URL || "https://testnet.evm.nodes.onflow.org"

/**
 * Enhanced AI join route with better error handling and logging
 */
export async function POST() {
  try {
    console.log("AI Join API called");
    
    const aiPrivateKey = process.env.AGENT_PRIVATE_KEY
    if (!aiPrivateKey) {
      console.error("AGENT_PRIVATE_KEY not found in environment");
      return NextResponse.json({ 
        error: "AI wallet not configured",
        message: "The Dealer is currently offline." 
      }, { status: 500 })
    }

    console.log("Setting up AI wallet and contract...");
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const aiWallet = new ethers.Wallet(aiPrivateKey, provider)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, DicePokerABI.abi, aiWallet)
    
    console.log("AI Wallet address:", aiWallet.address);

    // Check AI wallet balance
    const balance = await provider.getBalance(aiWallet.address);
    console.log("AI wallet balance:", ethers.formatEther(balance), "FLOW");
    
    if (balance < ethers.parseEther("0.1")) {
      console.warn("AI wallet has low balance:", ethers.formatEther(balance));
      return NextResponse.json({ 
        error: "AI wallet has insufficient funds",
        message: "The Dealer is broke! Need to top up the wallet." 
      }, { status: 500 })
    }

    // Get current game state
    const gameState = await contract.currentState()
    const currentGameState = Number(gameState)
    console.log("Current game state:", currentGameState);

    if (currentGameState !== 0) {
      console.log("Game already in progress, state:", currentGameState);
      return NextResponse.json({ 
        error: "Game already in progress",
        message: "Sorry, you missed the deal. The game has already started." 
      }, { status: 400 })
    }

    // Get current players
    const players = await Promise.all([
      contract.players(0),
      contract.players(1)
    ])
    console.log("Current players:", players);

    // Check if AI is already in the game
    if (players.includes(aiWallet.address)) {
      console.log("AI already in game");
      return NextResponse.json({ 
        error: "AI already in game",
        message: "I'm already at the table, ready to take your FLOW." 
      }, { status: 400 })
    }

    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
    
    // Check if there's an open slot
    const hasOpenSlot = players[0] === ZERO_ADDRESS || players[1] === ZERO_ADDRESS;
    if (!hasOpenSlot) {
      console.log("Game is full");
      return NextResponse.json({ 
        error: "Game is full",
        message: "Table's full, champ. Maybe next time." 
      }, { status: 400 })
    }

    // Check if there's a human player waiting
    const hasHumanPlayer = players[0] !== ZERO_ADDRESS || players[1] !== ZERO_ADDRESS;
    if (!hasHumanPlayer) {
      console.log("No human player to play against");
      return NextResponse.json({ 
        error: "No human player",
        message: "I need a human to play against. Join the game first!" 
      }, { status: 400 })
    }

    console.log("Attempting to join game...");
    
    // Execute the join transaction
    const tx = await contract.joinGame({
      gasLimit: 500000 // Set explicit gas limit
    });
    
    console.log("Join transaction sent:", tx.hash);
    
    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Join transaction confirmed:", receipt.transactionHash);

    // Verify the join was successful
    const newPlayers = await Promise.all([
      contract.players(0),
      contract.players(1)
    ]);
    console.log("Players after join:", newPlayers);

    const aiJoined = newPlayers.includes(aiWallet.address);
    if (!aiJoined) {
      throw new Error("Join transaction succeeded but AI not found in players");
    }

    // Determine AI's player index
    const aiPlayerIndex = newPlayers.findIndex(p => p.toLowerCase() === aiWallet.address.toLowerCase());
    console.log("AI joined as player", aiPlayerIndex);

    const messages = [
      "🤖 The Dealer has arrived. Let's see what you've got!",
      "🎰 Shuffle up and deal! Time to separate the wheat from the chaff.",
      "💎 The house always wins, but let's make this interesting.",
      "🔥 Ready to get rekt? I mean... good luck!",
      "⚡ Flow VRF dice vs human intuition. This should be fun."
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    return NextResponse.json({ 
      success: true,
      message: randomMessage,
      txHash: tx.hash,
      aiAddress: aiWallet.address,
      aiPlayerIndex: aiPlayerIndex,
      gameState: currentGameState
    });

  } catch (error: any) {
    console.error("AI join error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Provide specific error messages based on error type
    let userMessage = "The Dealer had trouble finding the table. Please try again.";
    
    if (error.message?.includes('insufficient funds')) {
      userMessage = "The Dealer is broke! Insufficient funds to join.";
    } else if (error.message?.includes('gas')) {
      userMessage = "The Dealer's transaction ran out of gas. Network congestion?";
    } else if (error.message?.includes('revert')) {
      userMessage = "The smart contract rejected the Dealer's join. Game rules violated?";
    } else if (error.message?.includes('timeout')) {
      userMessage = "The Dealer timed out trying to join. Network issues?";
    }

    return NextResponse.json({ 
      error: error.message,
      message: userMessage,
      success: false
    }, { status: 500 });
  }
}
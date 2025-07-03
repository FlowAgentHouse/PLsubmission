import { NextResponse } from 'next/server'
import { agentAccount, publicClient, walletClient } from '@/lib/viem-clients'
import { getContract, formatEther } from 'viem'
import DicePokerABI from '@/abi/DicePoker.json'

// CRITICAL: This tells Next.js this route should be dynamic, not static
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS! as `0x${string}`

const getDicePokerContract = () => {
  return getContract({
    address: CONTRACT_ADDRESS,
    abi: DicePokerABI.abi,
    client: { public: publicClient, wallet: walletClient }
  })
}

/**
 * Enhanced AI join route with viem integration and better error handling
 */
export async function POST() {
  try {
    console.log("AI Join API called");
    
    if (!process.env.PRIVATE_KEY) {
      console.error("PRIVATE_KEY not found in environment");
      return NextResponse.json({ 
        error: "AI wallet not configured",
        message: "The Dealer is currently offline." 
      }, { status: 500 })
    }

    console.log("Setting up AI wallet and contract...");
    const contract = getDicePokerContract()
    
    console.log("AI Wallet address:", agentAccount.address);

    // Check AI wallet balance
    const balance = await publicClient.getBalance({
      address: agentAccount.address
    });
    console.log("AI wallet balance:", formatEther(balance), "FLOW");
    
    if (balance < 100000000000000000n) { // 0.1 FLOW in wei
      console.warn("AI wallet has low balance:", formatEther(balance));
      
      // Try to request faucet funds automatically
      try {
        console.log("Attempting to auto-fund from faucet...");
        const faucetResponse = await fetch('https://faucet.flow.com/api/v1/fund', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: agentAccount.address,
            network: 'testnet'
          }),
        });

        if (faucetResponse.ok) {
          console.log("Auto-faucet request successful");
          // Wait a bit for funds to arrive
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (faucetError) {
        console.warn("Auto-faucet failed:", faucetError);
      }
      
      // Check balance again
      const newBalance = await publicClient.getBalance({
        address: agentAccount.address
      });
      
      if (newBalance < 100000000000000000n) {
        return NextResponse.json({ 
          error: "AI wallet has insufficient funds",
          message: "The Dealer is broke! Even the faucet couldn't help." 
        }, { status: 500 })
      }
    }

    // Get current game state
    const gameState = await contract.read.currentState() as bigint
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
    const [player0, player1] = await Promise.all([
      contract.read.players([0]) as Promise<string>,
      contract.read.players([1]) as Promise<string>
    ])
    const players = [player0, player1]
    console.log("Current players:", players);

    // Check if AI is already in the game
    if (players.includes(agentAccount.address)) {
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
    
    // Execute the join transaction using viem
    const hash = await contract.write.joinGame();
    
    console.log("Join transaction sent:", hash);
    
    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Join transaction confirmed:", receipt.transactionHash);

    // Verify the join was successful
    const [newPlayer0, newPlayer1] = await Promise.all([
      contract.read.players([0]) as Promise<string>,
      contract.read.players([1]) as Promise<string>
    ]);
    const newPlayers = [newPlayer0, newPlayer1];
    console.log("Players after join:", newPlayers);

    const aiJoined = newPlayers.includes(agentAccount.address);
    if (!aiJoined) {
      throw new Error("Join transaction succeeded but AI not found in players");
    }

    // Determine AI's player index
    const aiPlayerIndex = newPlayers.findIndex((p: string) => p.toLowerCase() === agentAccount.address.toLowerCase());
    console.log("AI joined as player", aiPlayerIndex);

    const messages = [
      "🤖 The Dealer has arrived. Let's see what you've got!",
      "🎰 Shuffle up and deal! Time to separate the wheat from the chaff.",
      "💎 The house always wins, but let's make this interesting.",
      "🔥 Ready to get rekt? I mean... good luck!",
      "⚡ Flow VRF dice vs human intuition. This should be fun.",
      "🎯 Time to show you what superior AI algorithms can do.",
      "💀 Another human sacrificing their FLOW to the machine gods.",
      "🚀 Buckle up, meatbag. This is going to be educational."
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];

    return NextResponse.json({ 
      success: true,
      message: randomMessage,
      txHash: hash,
      aiAddress: agentAccount.address,
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
    } else if (error.message?.includes('User rejected')) {
      userMessage = "The Dealer's wallet rejected the transaction. How embarrassing.";
    }

    return NextResponse.json({ 
      error: error.message,
      message: userMessage,
      success: false
    }, { status: 500 });
  }
}
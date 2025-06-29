import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import OpenAI from 'openai'
import DicePokerABI from '@/abi/DicePoker.json'

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0xC0933C5440c656464D1Eb1F886422bE3466B1459"
const RPC_URL = process.env.RPC_URL || "https://testnet.evm.nodes.onflow.org"

const STATE_NAMES = [
  "Joining",
  "Player1Bet1", "Player2BetOrCall1", "Player1RaiseOrCall1", "Player2RaiseOrCall1",
  "Player1Roll1", "Player2Roll1",
  "Player1Bet2", "Player2BetOrCall2", "Player1RaiseOrCall2", "Player2RaiseOrCall2",
  "Player1Roll2", "Player2Roll2",
  "Player1Bet3", "Player2BetOrCall3", "Player1RaiseOrCall3", "Player2RaiseOrCall3",
  "Player1Roll3", "Player2Roll3",
  "Player1Bet4", "Player2BetOrCall4", "Player1RaiseOrCall4", "Player2RaiseOrCall4",
  "Player1RollLast", "Player2RollLast",
  "DetermineWinner", "Tie", "GameEnded"
]

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: Request) {
  try {
    const { gameState: requestedState } = await request.json()

    // Check if AI private key is configured
    const aiPrivateKey = process.env.AGENT_PRIVATE_KEY
    if (!aiPrivateKey) {
      return NextResponse.json({ 
        error: "AI wallet not configured",
        message: "AI is not available" 
      }, { status: 500 })
    }

    // Create wallet and contract instance
    const provider = new ethers.JsonRpcProvider(RPC_URL)
    const aiWallet = new ethers.Wallet(aiPrivateKey, provider)
    const contract = new ethers.Contract(CONTRACT_ADDRESS, DicePokerABI.abi, aiWallet)

    // Get current game state
    const gameState = Number(await contract.currentState())
    const players = await Promise.all([
      contract.players(0),
      contract.players(1)
    ])
    const bets = await Promise.all([
      contract.bets(0),
      contract.bets(1)
    ])

    // Find AI's player index
    const aiIndex = players.findIndex(p => p.toLowerCase() === aiWallet.address.toLowerCase())
    if (aiIndex === -1) {
      return NextResponse.json({ 
        error: "AI not in game",
        message: "AI is not a player in this game" 
      }, { status: 400 })
    }

    // Check if it's AI's turn
    const isAITurn = checkIfAITurn(gameState, aiIndex)
    if (!isAITurn) {
      return NextResponse.json({ 
        message: "Not AI's turn",
        gameState: STATE_NAMES[gameState]
      })
    }

    // Get AI's dice (revealed so far)
    const aiDice = await getDice(contract, aiIndex)
    const revealedCount = getRevealedDiceCount(gameState)
    const revealedDice = aiDice.slice(0, revealedCount)

    // Get AI decision from OpenAI
    const action = await getAIDecision(gameState, revealedDice, bets, aiIndex)

    // Execute the action
    let tx;
    let message = "";

    switch (action.type) {
      case "bet":
        const betAmount = ethers.parseEther(action.amount || "0.1")
        tx = await contract.placeBet({ value: betAmount })
        message = `🎲 Dealer bets ${action.amount} FLOW! ${action.message}`
        break

      case "call":
        const currentBet = await contract.currentBet()
        const roundCommitted = await contract.roundBet(aiWallet.address)
        const toCall = currentBet - roundCommitted
        
        if (toCall > 0n) {
          tx = await contract.call({ value: toCall })
          message = `📞 Dealer calls ${ethers.formatEther(toCall)} FLOW! ${action.message}`
        } else {
          message = "Nothing to call"
        }
        break

      case "fold":
        tx = await contract.fold()
        message = `🏳️ Dealer folds. ${action.message}`
        break

      case "roll":
        tx = await contract.rollDice()
        message = `🎲 Dealer rolls the dice! ${action.message}`
        break

      default:
        message = "AI is thinking..."
    }

    if (tx) {
      await tx.wait()
    }

    return NextResponse.json({ 
      success: true,
      action: action.type,
      message,
      txHash: tx?.hash
    })

  } catch (error: any) {
    console.error("AI action error:", error)
    return NextResponse.json({ 
      error: error.message,
      message: "AI failed to make a move" 
    }, { status: 500 })
  }
}

function checkIfAITurn(gameState: number, aiIndex: number): boolean {
  const bettingStates = [
    [1, 2, 3, 4],
    [7, 8, 9, 10],
    [13, 14, 15, 16],
    [19, 20, 21, 22],
  ]
  const rollStates = [
    [5, 6],
    [11, 12],
    [17, 18],
    [23, 24],
  ]

  // Check betting states
  for (const states of bettingStates) {
    if (states.includes(gameState)) {
      const turn = gameState % 2 === 1 ? 0 : 1
      return turn === aiIndex
    }
  }

  // Check roll states
  for (const states of rollStates) {
    if (states.includes(gameState)) {
      const turn = states[0] === gameState ? 0 : 1
      return turn === aiIndex
    }
  }

  return false
}

async function getDice(contract: any, playerIndex: number): Promise<number[]> {
  const dice: number[] = []
  for (let i = 0; i < 5; i++) {
    try {
      const value = await contract.playerDice(playerIndex, i)
      dice.push(Number(value))
    } catch {
      dice.push(0)
    }
  }
  return dice
}

function getRevealedDiceCount(state: number): number {
  if (state >= 23) return 5
  if (state >= 17) return 3
  if (state >= 11) return 2
  if (state >= 5) return 1
  return 0
}

async function getAIDecision(
  gameState: number, 
  revealedDice: number[], 
  bets: any[],
  aiIndex: number
): Promise<{ type: string; amount?: string; message: string }> {
  try {
    // Determine if this is a betting or rolling phase
    const isBettingPhase = [1, 2, 3, 4, 7, 8, 9, 10, 13, 14, 15, 16, 19, 20, 21, 22].includes(gameState)
    const isRollingPhase = [5, 6, 11, 12, 17, 18, 23, 24].includes(gameState)

    if (isRollingPhase) {
      return {
        type: "roll",
        message: "Let's see what the Flow VRF gods have in store! 🔮"
      }
    }

    if (!isBettingPhase) {
      return {
        type: "wait",
        message: "Analyzing the situation..."
      }
    }

    // Use OpenAI to make a betting decision
    const prompt = `You are a poker dealer AI playing dice poker on Flow blockchain. 
    You have ${revealedDice.length} dice revealed so far: ${revealedDice.join(', ') || 'none yet'}
    Current pot: ${ethers.formatEther(BigInt(bets[0]) + BigInt(bets[1]))} FLOW
    Round: ${Math.floor((gameState - 1) / 6) + 1}/4
    
    Based on the revealed dice, make a strategic decision:
    - If dice look strong (high numbers), be aggressive
    - If dice look weak (low numbers), be conservative
    - Early rounds with no dice revealed: moderate betting
    
    Respond with a JSON object: { "action": "bet/call/fold", "amount": "0.1/0.2/0.5", "reason": "brief witty message" }
    
    For betting amounts:
    - 0.1 FLOW = conservative
    - 0.2 FLOW = moderate  
    - 0.5 FLOW = aggressive
    
    Be witty and reference the blockchain/Flow theme in your message.`

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a confident but fair poker dealer on Flow blockchain. Make strategic decisions and provide witty commentary."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 150,
    })

    const content = response.choices[0]?.message?.content
    if (content) {
      try {
        const decision = JSON.parse(content)
        return {
          type: decision.action || "bet",
          amount: decision.amount || "0.1",
          message: decision.reason || "The game is afoot!"
        }
      } catch {
        // Fallback if JSON parsing fails
      }
    }

    // Fallback logic based on dice
    const diceSum = revealedDice.reduce((a, b) => a + b, 0)
    const avgDiceValue = revealedDice.length > 0 ? diceSum / revealedDice.length : 3.5

    if (avgDiceValue >= 4.5) {
      return {
        type: "bet",
        amount: "0.5",
        message: "Looking strong! Time to raise the stakes 💪"
      }
    } else if (avgDiceValue >= 3) {
      return {
        type: "bet",
        amount: "0.2",
        message: "Steady as she goes on the Flow 🌊"
      }
    } else if (avgDiceValue >= 2 && revealedDice.length < 3) {
      return {
        type: "call",
        message: "I'll see where this river flows... 🎲"
      }
    } else {
      return {
        type: "fold",
        message: "Sometimes the wise dealer knows when to fold 🃏"
      }
    }

  } catch (error) {
    console.error("OpenAI decision error:", error)
    
    // Simple fallback logic
    const round = Math.floor((gameState - 1) / 6) + 1
    if (round <= 2) {
      return {
        type: "bet",
        amount: "0.1",
        message: "Let's keep this game flowing! 🎰"
      }
    } else {
      return {
        type: "call",
        message: "I'll match your enthusiasm! 🎲"
      }
    }
  }
}
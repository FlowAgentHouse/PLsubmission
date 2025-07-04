"use client"

import { useState, useEffect, useRef } from "react"
import type { Signer } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dice1, Dice2, Dice3, Dice4, Dice5, Dice6,
  Wallet, Bot, Trophy, Coins, Loader2, ArrowLeft,
  Shield, Brain, Sparkles, Crown, RefreshCw, Gift,
  CheckCircle, Clock, Terminal
} from "lucide-react"
import { formatEther, parseEther } from "ethers"
import { initWeb3, connectWallet, disconnectWallet, getDicePokerContract, checkContractExists, autoConnectWallet } from "@/lib/web3"
import * as fcl from "@onflow/fcl"
import "@/lib/fcl-config" // Import FCL configuration
import Link from "next/link"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

const STATE_NAMES = [
  "Joining", "Player1Bet1", "Player2BetOrCall1", "Player1RaiseOrCall1", "Player2RaiseOrCall1",
  "Player1Roll1", "Player2Roll1", "Player1Bet2", "Player2BetOrCall2", "Player1RaiseOrCall2", "Player2RaiseOrCall2",
  "Player1Roll2", "Player2Roll2", "Player1Bet3", "Player2BetOrCall3", "Player1RaiseOrCall3", "Player2RaiseOrCall3",
  "Player1Roll3", "Player2Roll3", "Player1Bet4", "Player2BetOrCall4", "Player1RaiseOrCall4", "Player2RaiseOrCall4",
  "Player1RollLast", "Player2RollLast", "DetermineWinner", "Tie", "GameEnded"
]

const DICE_ICONS = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6]

// Domino Loader Component
const DominoLoader = () => (
  <div className="domino-loader">
    <span></span><span></span><span></span><span></span>
    <span></span><span></span><span></span><span></span>
  </div>
)

// Dice Component
const DiceDisplay = ({ value, isRevealed, isRolling }: { value: number; isRevealed: boolean; isRolling?: boolean }) => {
  const DiceIcon = value > 0 && value <= 6 ? DICE_ICONS[value - 1] : Dice1
  
  return (
    <div className={`dice ${isRolling ? 'rolling' : ''} ${!isRevealed ? 'unrevealed' : ''}`}>
      {isRevealed && value > 0 ? (
        <DiceIcon className="w-8 h-8" />
      ) : null}
    </div>
  )
}

// Interactive Chat Component
const InteractiveChat = ({ 
  history, 
  onSendMessage, 
  isProcessing 
}: { 
  history: {role: 'human' | 'ai', content: string}[], 
  onSendMessage: (message: string) => void,
  isProcessing: boolean 
}) => {
    const logContainerRef = useRef<HTMLDivElement>(null);
    const [chatInput, setChatInput] = useState("");

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [history]);

    const handleSendMessage = () => {
        if (chatInput.trim() && !isProcessing) {
            onSendMessage(chatInput.trim());
            setChatInput("");
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <Card className="flow-card">
            <CardHeader>
                <CardTitle className="text-white flex items-center">
                    <Terminal className="w-5 h-5 mr-2 text-gray-400" />
                    Chat
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Chat Messages */}
                <div 
                    ref={logContainerRef} 
                    className="bg-black/50 rounded-lg p-4 h-48 overflow-y-auto font-mono text-sm space-y-2"
                >
                    {history.length === 0 && (
                        <p className="text-gray-500">Start chatting with the dealer...</p>
                    )}
                    {history.map((entry, index) => (
                        <div key={index} className="flex items-start">
                            <span className={`mr-2 font-bold ${
                                entry.role === 'ai' ? 'text-red-400' : 'text-blue-400'
                            }`}>
                                {entry.role === 'ai' ? '[Dealer]:' : '[You]:'}
                            </span>
                            <p className="whitespace-pre-wrap break-words text-gray-300">
                                {entry.content}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Chat Input */}
                <div className="flex space-x-2">
                    <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Trash talk the dealer..."
                        className="bg-gray-800 border-gray-700 text-white flex-1"
                        disabled={isProcessing}
                        maxLength={200}
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={!chatInput.trim() || isProcessing}
                        className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white min-w-[80px]"
                    >
                        {isProcessing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            "Send"
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

export default function PvEGamePage() {
  const [account, setAccount] = useState<string | null>(null)
  const [signer, setSigner] = useState<Signer | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>({ loggedIn: null })

  const [betAmount, setBetAmount] = useState("")
  const [gameState, setGameState] = useState(0)
  const [players, setPlayers] = useState([ZERO_ADDRESS, ZERO_ADDRESS])
  const [bets, setBets] = useState([BigInt(0), BigInt(0)])
  const [playerDice, setPlayerDice] = useState([
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ])
  const [myPlayerIndex, setMyPlayerIndex] = useState(-1)
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isRolling, setIsRolling] = useState(false)
  const [pot, setPot] = useState(BigInt(0))
  const [winner, setWinner] = useState<string>(ZERO_ADDRESS)
  const [gameEndedTimestamp, setGameEndedTimestamp] = useState(0)

  // AI Agent State
  const [aiStatus, setAiStatus] = useState("")
  const [aiThinking, setAiThinking] = useState(false)
  const [lastAgentMessage, setLastAgentMessage] = useState("")
  const [chatHistory, setChatHistory] = useState<{role: 'human' | 'ai', content: string}[]>([])
  
  // Game state tracking
  const [gameStarted, setGameStarted] = useState(false)
  const [aiJoinAttempted, setAiJoinAttempted] = useState(false)

  // FCL user subscription
  useEffect(() => {
    const unsubscribe = fcl.currentUser.subscribe(setUser)
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    initWeb3()
    // Try auto-connect for existing sessions
    autoConnectWallet().then((result) => {
      if (result) {
        setSigner(result.signer)
        result.signer.getAddress().then(setAccount)
      }
    }).catch(console.error)
  }, [])

  // Load game data when account is available
  useEffect(() => {
    if (account) {
      loadGameData()
      // Set up polling for game state updates
      const interval = setInterval(loadGameData, 3000)
      return () => clearInterval(interval)
    }
  }, [account])

  useEffect(() => {
    if (account && players) {
      const idx = players.findIndex((p) => p.toLowerCase() === account.toLowerCase())
      setMyPlayerIndex(idx)
    }
  }, [account, players])

  useEffect(() => {
    if (myPlayerIndex === -1) {
      setIsMyTurn(false)
      return
    }
    const bettingStates = [[1, 2, 3, 4], [7, 8, 9, 10], [13, 14, 15, 16], [19, 20, 21, 22]]
    const rollStates = [[5, 6], [11, 12], [17, 18], [23, 24]]
    let turn = -1
    for (const round of bettingStates) { 
      if (round.includes(gameState)) { 
        turn = gameState % 2 === 1 ? 0 : 1; 
        break 
      } 
    }
    for (const round of rollStates) { 
      if (round.includes(gameState)) { 
        turn = round[0] === gameState ? 0 : 1; 
        break 
      } 
    }
    setIsMyTurn(turn === myPlayerIndex)
  }, [gameState, myPlayerIndex])

  // AI Auto-Join Logic - Fixed
  useEffect(() => {
    const shouldAIJoin = 
      gameState === 0 && 
      myPlayerIndex === 0 && // User has joined as player 1
      players[1] === ZERO_ADDRESS && // Player 2 slot is empty
      !aiJoinAttempted && // Haven't tried to join AI yet
      !isProcessing

    if (shouldAIJoin) {
      console.log("Triggering AI auto-join...")
      setAiJoinAttempted(true)
      handleAIJoin()
    }
  }, [gameState, myPlayerIndex, players, aiJoinAttempted, isProcessing])

  // AI Action Logic - Fixed
  useEffect(() => {
    const shouldAIAct = 
      myPlayerIndex === 0 && // User is player 1
      !isMyTurn && // It's not the user's turn (so it's AI's turn)
      gameState > 0 && 
      gameState < 27 && 
      !aiThinking && 
      !isProcessing &&
      winner === ZERO_ADDRESS

    if (shouldAIAct) {
      console.log("Triggering AI action for state:", gameState)
      handleAIAction()
    }
  }, [isMyTurn, gameState, myPlayerIndex, aiThinking, isProcessing, winner])

  const handleConnectWallet = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // First authenticate with FCL
      await fcl.authenticate()
      
      // Then connect the EVM wallet for contract interactions
      const { signer: web3Signer } = await connectWallet()
      setSigner(web3Signer)
      const address = await web3Signer.getAddress()
      setAccount(address)
    } catch (err: any) {
      setError("Failed to connect wallet. Please make sure you're on Flow Testnet.")
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnectWallet = async () => {
    // Disconnect FCL
    await fcl.unauthenticate()
    
    // Disconnect EVM wallet
    await disconnectWallet()
    setAccount(null)
    setSigner(null)
    setChatHistory([])
    setLastAgentMessage("")
    setAiJoinAttempted(false)
  }

  const loadGameData = async () => {
    if (!signer) return
    try {
      const contractCheck = await checkContractExists()
      if (!contractCheck.exists) {
        setError(`Contract not found. ${contractCheck.error}`)
        return
      }

      const contract = getDicePokerContract()
      const state = await contract.currentState()
      setGameState(Number(state))
      
      const [p1, p2] = await Promise.all([contract.players(0), contract.players(1)])
      setPlayers([p1, p2])
      
      const [b1, b2] = await Promise.all([contract.bets(0), contract.bets(1)])
      setBets([BigInt(b1.toString()), BigInt(b2.toString())])
      
      setPot(BigInt((await contract.pot()).toString()))
      setWinner(await contract.winner())
      setGameEndedTimestamp(Number(await contract.gameEndedTimestamp()))
      
      const d1: number[] = [], d2: number[] = []
      for (let i = 0; i < 5; i++) {
        const [pd1, pd2] = await Promise.all([contract.playerDice(0, i), contract.playerDice(1, i)])
        d1.push(Number(pd1)); d2.push(Number(pd2))
      }
      setPlayerDice([d1, d2])
      setError(null)
    } catch (err: any) {
      console.error("Error loading game data:", err)
      setError("Failed to load game data. Check your connection.")
    }
  }

  const handleAIJoin = async () => {
    setAiStatus("Dealer is approaching the table...")
    try {
      const response = await fetch('/api/ai-join', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || "AI failed to join")
      }
      
      setAiStatus(data.message)
      console.log("AI join successful:", data)
      
      // Wait a bit then reload game data
      setTimeout(async () => {
        await loadGameData()
        setAiStatus("")
      }, 2000)
      
    } catch (err: any) {
      console.error("AI join error:", err)
      setError(`AI join failed: ${err.message}`)
      setAiStatus("Dealer couldn't find the table...")
      setAiJoinAttempted(false) // Allow retry
    }
  }

  const handleAIAction = async () => {
    if (!account) return
    
    setAiThinking(true)
    setAiStatus("Dealer is thinking...")
    
    try {
      console.log("Sending AI action request...")
      const response = await fetch('/api/ai-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: account,
          chatHistory: chatHistory,
        }),
      })

      const data = await response.json()
      console.log("AI action response:", data)

      if (!response.ok) {
        throw new Error(data.details || data.error || "AI agent failed to act")
      }

      setLastAgentMessage(data.message)
      setChatHistory(data.newHistory || [...chatHistory, { role: 'ai', content: data.message }])
      setAiStatus("")
      
      // Reload game data after AI action
      setTimeout(loadGameData, 1000)
      
    } catch (err: any) {
      console.error("AI action error:", err)
      setError(`AI action failed: ${err.message}`)
      setAiStatus("Dealer is confused...")
    } finally {
      setTimeout(() => {
        setAiThinking(false)
      }, 2000)
    }
  }

  const handleSendChatMessage = async (message: string) => {
    if (!account) return;
    
    try {
      console.log("Sending chat message:", message);
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: account,
          message: message,
          chatHistory: chatHistory,
        }),
      });

      const data = await response.json();
      console.log("AI chat response:", data);

      if (data.success) {
        setChatHistory(data.newHistory);
        if (data.message) {
          setLastAgentMessage(data.message);
        }
      }
    } catch (err: any) {
      console.error("Chat error:", err);
    }
  };

  const handleJoinGame = async () => {
    if (!signer) return
    setIsProcessing(true)
    setError(null)
    try {
      const contract = getDicePokerContract()
      setAiStatus("You take a seat at the table...")
      const tx = await contract.joinGame()
      await tx.wait()
      await loadGameData()
      setAiStatus("")
    } catch (err: any) {
      setError(err.message || "Failed to join game")
      setAiStatus("")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUserAction = async (action: () => Promise<any>) => {
    setIsProcessing(true)
    setError(null)
    try {
      await action()
      await loadGameData()
    } catch (err: any) {
      setError(err.message || "An unknown error occurred.")
    } finally {
      setIsProcessing(false)
    }
  }
  
  const handleResetGame = () => handleUserAction(async () => {
    const contract = getDicePokerContract()
    const tx = await contract.resetIfExpired()
    await tx.wait()
    setChatHistory([])
    setLastAgentMessage("")
    setAiJoinAttempted(false)
  })

  const handlePlaceBet = () => handleUserAction(async () => {
    if (!betAmount) {
        setError("Bet amount cannot be empty.")
        return
    }
    const contract = getDicePokerContract()
    const tx = await contract.placeBet({ value: parseEther(betAmount) })
    await tx.wait()
    setBetAmount("")
    
    // Add user action to chat history
    setChatHistory(prev => [...prev, { role: 'human', content: `Placed bet of ${betAmount} FLOW` }])
  })

  const handleCall = () => handleUserAction(async () => {
    if (!account) return
    const contract = getDicePokerContract()
    const currentBet = await contract.currentBet()
    const roundCommitted = await contract.roundBet(account)
    const toCall = BigInt(currentBet.toString()) - BigInt(roundCommitted.toString())
    if (toCall <= 0n) {
      setError("Nothing to call")
      return
    }
    const tx = await contract.call({ value: toCall })
    await tx.wait()
    
    setChatHistory(prev => [...prev, { role: 'human', content: `Called bet of ${formatEther(toCall)} FLOW` }])
  })

  const handleFold = () => handleUserAction(async () => {
    const contract = getDicePokerContract()
    const tx = await contract.fold()
    await tx.wait()
    
    setChatHistory(prev => [...prev, { role: 'human', content: 'Folded hand' }])
  })

  const handleRollDice = () => handleUserAction(async () => {
    setIsRolling(true)
    const contract = getDicePokerContract()
    const tx = await contract.rollDice()
    await tx.wait()
    setTimeout(() => setIsRolling(false), 1000)
    
    setChatHistory(prev => [...prev, { role: 'human', content: 'Rolled dice' }])
  })

  const maskDice = (dice: number[], state: number) => {
    let revealed = 0
    if (state >= 23) revealed = 5
    else if (state >= 17) revealed = 3
    else if (state >= 11) revealed = 2
    else if (state >= 5) revealed = 1
    return dice.map((d, i) => ({ value: d, isRevealed: i < revealed }))
  }

  const isGameEnded = gameState >= 25 || winner !== ZERO_ADDRESS
  const isWinner = winner !== ZERO_ADDRESS && winner.toLowerCase() === account?.toLowerCase()
  const canReset = gameEndedTimestamp > 0 && (Date.now() / 1000) > gameEndedTimestamp + 300
  const canBet = isMyTurn && [1, 2, 3, 4, 7, 8, 9, 10, 13, 14, 15, 16, 19, 20, 21, 22].includes(gameState)
  const canRoll = isMyTurn && [5, 6, 11, 12, 17, 18, 23, 24].includes(gameState)
  const canJoin = gameState === 0 && myPlayerIndex === -1 && players.includes(ZERO_ADDRESS)

  const hasFoldedWinner = winner !== ZERO_ADDRESS && gameState < 25;
  const isTieGame = isGameEnded && winner === ZERO_ADDRESS && gameState > 0;

  useEffect(() => {
    const handleGameOver = async () => {
      if (isGameEnded && winner !== ZERO_ADDRESS && !lastAgentMessage) {
        const playerWon = winner.toLowerCase() === account?.toLowerCase();
        
        try {
          const response = await fetch('/api/ai-game-over', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerWon,
              playerAddress: account,
              finalPot: formatEther(pot)
            }),
          });
  
          const data = await response.json();
          if (data.success && data.message) {
            setLastAgentMessage(data.message);
            setChatHistory(prev => [...prev, { 
              role: 'ai', 
              content: data.message 
            }]);
          }
        } catch (err: any) {
          console.error("Game over taunt failed:", err);
        }
      }
    };
  
    handleGameOver();
  }, [isGameEnded, winner, account, pot, lastAgentMessage]);

  // Show connection screen if no account
  if (!account) {
    return (
      <div className="min-h-screen bg-black text-white relative flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/20 rounded-full blur-3xl floating" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl floating" />
        </div>
        <Card className="w-full max-w-md flow-card relative z-10">
          <CardHeader className="text-center">
            <Link href="/" className="flex items-center justify-center text-green-400 mb-4 hover:text-green-300 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
            </Link>
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Challenge the Dealer</CardTitle>
            <p className="text-gray-400">Connect your wallet to challenge our dealer on Flow</p>
            
            {/* FCL User Status */}
            {user.loggedIn && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm">FCL Connected: {user.addr}</p>
                <p className="text-gray-400 text-xs">Now connect your EVM wallet for gameplay</p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleConnectWallet} disabled={loading} className="w-full flow-button text-lg py-6">
              {loading ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />Connecting...</>) : (<><Wallet className="w-5 h-5 mr-2" />Connect Wallet</>)}
            </Button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white relative p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl floating" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl floating" />
      </div>
      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-green-400 hover:text-green-300 transition-colors"><ArrowLeft className="w-6 h-6" /></Link>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center"><Bot className="w-6 h-6 text-white" /></div>
            <div><h1 className="text-3xl font-bold text-white">Challenge the Dealer</h1><p className="text-gray-400">Flow EVM Testnet {user.loggedIn && <span className="text-blue-400">• FCL Connected</span>}</p></div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="border-green-500 text-green-400"><Wallet className="w-4 h-4 mr-1" />{account.slice(0, 6)}...{account.slice(-4)}</Badge>
            <Button onClick={handleDisconnectWallet} variant="outline" className="border-red-500 text-red-400 hover:bg-red-500/20">Disconnect</Button>
          </div>
        </div>

        {/* AI Status & Banter Display */}
        {(lastAgentMessage || aiStatus) && (
          <Card className={`flow-card ${lastAgentMessage ? 'border-purple-500/50 bg-purple-500/5' : 'border-green-500/50 bg-green-500/5'}`}>
            <CardContent className="py-4">
              <div className="flex items-center justify-center space-x-3">
                {lastAgentMessage ? <Sparkles className="w-5 h-5 text-purple-400 pulse-icon" /> : <Brain className="w-5 h-5 text-green-400" />}
                <p className={`font-medium ${lastAgentMessage ? 'text-purple-300 italic' : 'text-green-400'}`}>
                  {lastAgentMessage ? `"${lastAgentMessage}"` : aiStatus}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Winner Display */}
        {isGameEnded && winner !== ZERO_ADDRESS && (
          <Card className="flow-card border-yellow-500/50 bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
            <CardContent className="py-6">
              <div className="flex items-center justify-center space-x-4">
                <Crown className="w-8 h-8 text-yellow-400 pulse-icon" />
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-yellow-400">{isWinner ? "🎉 Congratulations! You Won!" : `🤖 Dealer Wins!`}</h3>
                  <p className="text-gray-300">Winner: {isWinner ? "You" : "Dealer"}</p>
                  <p className="text-yellow-400 font-semibold">Prize: {formatEther(pot)} FLOW</p>
                </div>
                <Trophy className="w-8 h-8 text-yellow-400 pulse-icon" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Game State & Pot */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="flow-card">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl text-white flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                  {STATE_NAMES[gameState] || `State ${gameState}`}
                </CardTitle>
                <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                  Round {Math.max(1, Math.floor((gameState - 1) / 6) + 1)}/4
                </Badge>
              </div>
            </CardHeader>
          </Card>
          <Card className="flow-card">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl text-white flex items-center">
                  <Coins className="w-5 h-5 mr-2 text-yellow-400" />
                  Total Pot
                </CardTitle>
                <div className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                  {formatEther(pot)} FLOW
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Players */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Human Player */}
          <Card className={`flow-card ${myPlayerIndex === 0 ? 'border-blue-500 shadow-blue-500/20 shadow-xl' : ''} ${winner === players[0] && winner !== ZERO_ADDRESS ? 'border-yellow-500 shadow-yellow-500/30 shadow-xl' : ''}`}>
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center">
                  You (Player 1)
                  <Badge className="ml-2 bg-blue-600">Human</Badge>
                  {winner === players[0] && winner !== ZERO_ADDRESS && <Crown className="w-5 h-5 ml-2 text-yellow-400" />}
                </span>
                <div className="flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400">{formatEther(bets[0])} FLOW</span>
                </div>
              </CardTitle>
              <p className="text-gray-400 text-sm font-mono">
                {players[0] === ZERO_ADDRESS ? "Waiting for a challenger..." : `${players[0].slice(0, 6)}...${players[0].slice(-4)}`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-3 justify-center dice-container">
                {maskDice(playerDice[0], gameState).map((die, index) => (
                  <DiceDisplay key={index} value={die.value} isRevealed={die.isRevealed} isRolling={isRolling && myPlayerIndex === 0 && canRoll} />
                ))}
              </div>
              {isGameEnded && (
                <div className="text-center mt-4">
                  <p className="text-gray-400 text-sm">Total: {playerDice[0].reduce((a, b) => a + b, 0)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dealer */}
          <Card className={`flow-card border-green-600 shadow-green-500/20 shadow-xl ${winner === players[1] && winner !== ZERO_ADDRESS ? 'border-yellow-500 shadow-yellow-500/30' : ''}`}>
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center">
                  <Bot className="w-5 h-5 mr-2 text-green-400" />
                  Dealer (Player 2)
                  <Badge className="ml-2 bg-green-600">Dealer</Badge>
                  {winner === players[1] && winner !== ZERO_ADDRESS && <Crown className="w-5 h-5 ml-2 text-yellow-400" />}
                </span>
                <div className="flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400">{formatEther(bets[1])} FLOW</span>
                </div>
              </CardTitle>
              <p className="text-gray-400 text-sm font-mono">
                {players[1] === ZERO_ADDRESS ? "Waiting for game to start..." : `${players[1].slice(0, 6)}...${players[1].slice(-4)}`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-3 justify-center dice-container">
                {maskDice(playerDice[1], gameState).map((die, index) => (
                  <DiceDisplay key={index} value={die.value} isRevealed={die.isRevealed} />
                ))}
              </div>
              {isGameEnded && (
                <div className="text-center mt-4">
                  <p className="text-gray-400 text-sm">Total: {playerDice[1].reduce((a, b) => a + b, 0)}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card className="flow-card">
          <CardHeader><CardTitle className="text-white">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}
            
            {/* Join Game Button */}
            {canJoin && (
              <Button onClick={handleJoinGame} disabled={isProcessing} className="w-full flow-button text-lg py-6">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Joining Game...
                  </>
                ) : (
                  <>
                    <Bot className="w-5 h-5 mr-2" />
                    Start Game vs Dealer
                  </>
                )}
              </Button>
            )}

            {/* Reset Game */}
            {(hasFoldedWinner || isTieGame || (isGameEnded && canReset)) && (
              <Button onClick={handleResetGame} disabled={isProcessing} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white text-lg py-6">
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Challenge Dealer Again
                  </>
                )}
              </Button>
            )}
            
            {/* User Turn Actions */}
            {isMyTurn && !isGameEnded && (
              <>
                {canBet && (
                  <div className="space-y-3">
                    <div className="flex space-x-2">
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="Bet amount (FLOW)" 
                        value={betAmount} 
                        onChange={(e) => setBetAmount(e.target.value)} 
                        className="bg-gray-800 border-gray-700 text-white" 
                      />
                      <Button 
                        onClick={handlePlaceBet} 
                        disabled={!betAmount || isProcessing} 
                        className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white min-w-[100px]"
                      >
                        {isProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Coins className="w-4 h-4 mr-2" />
                            Bet
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={handleCall} 
                        disabled={isProcessing} 
                        variant="outline" 
                        className="flex-1 border-blue-500 text-blue-400 hover:bg-blue-500/20"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Call
                      </Button>
                      <Button 
                        onClick={handleFold} 
                        disabled={isProcessing} 
                        variant="outline" 
                        className="flex-1 border-red-500 text-red-400 hover:bg-red-500/20"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Fold
                      </Button>
                    </div>
                  </div>
                )}
                {canRoll && (
                  <Button 
                    onClick={handleRollDice} 
                    disabled={isProcessing} 
                    className="w-full flow-button text-lg py-6 group"
                  >
                    {isProcessing ? (
                      <>
                        <div className="dice-loader mr-3" />
                        Rolling with VRF...
                      </>
                    ) : (
                      <>
                        <Dice1 className="w-5 h-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                        Roll Dice with Flow VRF
                        <Shield className="w-5 h-5 ml-2 text-green-300" />
                      </>
                    )}
                  </Button>
                )}
              </>
            )}

            {/* AI Thinking Indicator */}
            {aiThinking && (
              <div className="text-center py-8">
                <div className="inline-flex items-center space-x-3">
                  <span className="text-gray-400">{aiStatus}</span>
                  <DominoLoader />
                </div>
              </div>
            )}

            {/* Waiting for Game State */}
            {gameState === 0 && players[0] === ZERO_ADDRESS && (
              <div className="text-center py-8">
                <div className="inline-flex items-center space-x-3">
                  <span className="text-gray-400">The dealer is waiting for a challenger...</span>
                </div>
              </div>
            )}

            {/* Game Status Messages */}
            {gameState === 0 && myPlayerIndex === 0 && players[1] === ZERO_ADDRESS && !aiJoinAttempted && (
              <div className="text-center py-4">
                <div className="inline-flex items-center space-x-3">
                  <Bot className="w-5 h-5 text-green-400 pulse-icon" />
                  <span className="text-gray-400">Waiting for dealer to join...</span>
                </div>
              </div>
            )}

            {/* Not your turn indicator */}
            {!isMyTurn && myPlayerIndex !== -1 && gameState > 0 && gameState < 27 && !isGameEnded && !aiThinking && (
              <div className="text-center py-6">
                <div className="inline-flex items-center space-x-3">
                  <Bot className="w-6 h-6 text-green-400 pulse-icon" />
                  <span className="text-gray-400">Dealer is making their move...</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Interactive Chat Component */}
        <InteractiveChat 
          history={chatHistory} 
          onSendMessage={handleSendChatMessage}
          isProcessing={aiThinking || isProcessing}
        />

      </div>
    </div>
  )
}
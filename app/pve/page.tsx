"use client"

import { useState, useEffect } from "react"
import type { BrowserProvider } from "ethers"
import type { Signer } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Wallet, Bot, Trophy, Coins, Loader2, ArrowLeft } from "lucide-react"
import { formatEther, parseEther } from "ethers"
import { initWeb3, connectWallet, disconnectWallet, getDicePokerContract, checkContractExists } from "@/lib/web3"
import Link from "next/link"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

const STATE_NAMES = [
  "Joining",
  "Player1Bet1",
  "Player2BetOrCall1",
  "Player1RaiseOrCall1",
  "Player2RaiseOrCall1",
  "Player1Roll1",
  "Player2Roll1",
  "Player1Bet2",
  "Player2BetOrCall2",
  "Player1RaiseOrCall2",
  "Player2RaiseOrCall2",
  "Player1Roll2",
  "Player2Roll2",
  "Player1Bet3",
  "Player2BetOrCall3",
  "Player1RaiseOrCall3",
  "Player2RaiseOrCall3",
  "Player1Roll3",
  "Player2Roll3",
  "Player1Bet4",
  "Player2BetOrCall4",
  "Player1RaiseOrCall4",
  "Player2RaiseOrCall4",
  "Player1RollLast",
  "Player2RollLast",
  "DetermineWinner",
  "Tie",
  "GameEnded",
]

const DICE_ICONS = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6]

export default function PvEGamePage() {
  const [account, setAccount] = useState<string | null>(null)
  const [provider, setProvider] = useState<BrowserProvider | null>(null)
  const [signer, setSigner] = useState<Signer | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [betAmount, setBetAmount] = useState("")
  const [gameState, setGameState] = useState(0)
  const [players, setPlayers] = useState([ZERO_ADDRESS, ZERO_ADDRESS])
  const [bets, setBets] = useState([0n, 0n])
  const [playerDice, setPlayerDice] = useState([
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ])
  const [myPlayerIndex, setMyPlayerIndex] = useState(-1)
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiStatus, setAiStatus] = useState("")

  useEffect(() => {
    initWeb3()
  }, [])

  useEffect(() => {
    if (account) {
      loadGameData()
      const interval = setInterval(loadGameData, 2000) // Faster polling for AI game
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

    let turn = -1
    for (const round of bettingStates) {
      if (round.includes(gameState)) {
        turn = gameState % 2 === 1 ? 0 : 1
        break
      }
    }
    for (const round of rollStates) {
      if (round.includes(gameState)) {
        turn = round[0] === gameState ? 0 : 1
        break
      }
    }

    setIsMyTurn(turn === myPlayerIndex)
  }, [gameState, myPlayerIndex])

  // Trigger AI actions when it's AI's turn
  useEffect(() => {
    if (myPlayerIndex === 0 && !isMyTurn && gameState > 0 && gameState < 27) {
      triggerAIAction()
    }
  }, [gameState, isMyTurn, myPlayerIndex])

  const handleConnectWallet = async () => {
    try {
      setLoading(true)
      setError(null)
      const { provider: web3Provider, signer: web3Signer } = await connectWallet()
      setProvider(web3Provider)
      setSigner(web3Signer)
      const address = await web3Signer.getAddress()
      setAccount(address)
    } catch (err: any) {
      console.error("Failed to connect wallet:", err)
      setError("Failed to connect wallet")
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnectWallet = async () => {
    await disconnectWallet()
    setAccount(null)
    setProvider(null)
    setSigner(null)
  }

  const loadGameData = async () => {
    if (!signer) return

    try {
      // First check if contract exists
      const contractExists = await checkContractExists()
      if (!contractExists) {
        setError("Contract not found at address. Please check the contract deployment.")
        return
      }

      const contract = getDicePokerContract()

      // Load game state with timeout
      const state = await Promise.race([
        contract.currentState(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000)),
      ])
      setGameState(Number(state))

      // Load players
      const [player1, player2] = await Promise.all([contract.players(0), contract.players(1)])
      setPlayers([player1, player2])

      // Load bets
      const [bet1, bet2] = await Promise.all([contract.bets(0), contract.bets(1)])
      setBets([bet1, bet2])

      // Load dice
      const dice1 = []
      const dice2 = []
      for (let i = 0; i < 5; i++) {
        const [d1, d2] = await Promise.all([contract.playerDice(0, i), contract.playerDice(1, i)])
        dice1.push(Number(d1))
        dice2.push(Number(d2))
      }
      setPlayerDice([dice1, dice2])

      // Clear any previous errors
      setError(null)
    } catch (err: any) {
      console.error("Error loading game data:", err)
      if (err.message.includes("could not decode result data")) {
        setError("Contract not responding. Please check if the contract is deployed on Sepolia.")
      } else if (err.message.includes("Timeout")) {
        setError("Network timeout. Please check your connection.")
      } else {
        setError(`Failed to load game data: ${err.message}`)
      }
    }
  }

  const triggerAIAction = async () => {
    try {
      setAiStatus("AI is thinking...")
      const response = await fetch("/api/ai-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ gameState }),
      })

      if (response.ok) {
        const result = await response.json()
        setAiStatus(result.message || "AI made a move")
        setTimeout(() => setAiStatus(""), 3000)
      }
    } catch (err) {
      console.error("AI action failed:", err)
      setAiStatus("")
    }
  }

  const handleJoinGame = async () => {
    if (!signer) return

    try {
      setIsProcessing(true)
      setError(null)
      const contract = getDicePokerContract()
      const tx = await contract.joinGame()
      await tx.wait()

      // Trigger AI to join as player 2
      setAiStatus("Waiting for AI to join...")
      setTimeout(async () => {
        try {
          await fetch("/api/ai-join", { method: "POST" })
        } catch (err) {
          console.error("AI join failed:", err)
        }
      }, 2000)

      await loadGameData()
    } catch (err: any) {
      console.error("Failed to join game:", err)
      setError(err.message || "Failed to join game")
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePlaceBet = async () => {
    if (!signer || !betAmount) return

    try {
      setIsProcessing(true)
      setError(null)
      const contract = getDicePokerContract()
      const tx = await contract.placeBet({ value: parseEther(betAmount) })
      await tx.wait()
      setBetAmount("")
      await loadGameData()
    } catch (err: any) {
      console.error("Failed to place bet:", err)
      setError(err.message || "Failed to place bet")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCall = async () => {
    if (!signer || !account) return

    try {
      setIsProcessing(true)
      setError(null)
      const contract = getDicePokerContract()

      const currentBet = await contract.currentBet()
      const roundCommitted = await contract.roundBet(account)
      const toCall = currentBet - roundCommitted

      if (toCall === 0n) {
        setError("Nothing to call")
        return
      }

      const tx = await contract.call({ value: toCall })
      await tx.wait()
      await loadGameData()
    } catch (err: any) {
      console.error("Failed to call:", err)
      setError(err.message || "Failed to call")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFold = async () => {
    if (!signer) return

    try {
      setIsProcessing(true)
      setError(null)
      const contract = getDicePokerContract()
      const tx = await contract.fold()
      await tx.wait()
      await loadGameData()
    } catch (err: any) {
      console.error("Failed to fold:", err)
      setError(err.message || "Failed to fold")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRollDice = async () => {
    if (!signer) return

    try {
      setIsProcessing(true)
      setError(null)
      const contract = getDicePokerContract()
      const tx = await contract.rollDice()
      await tx.wait()
      await loadGameData()

      if (gameState === 24) {
        const sum1 = playerDice[0].reduce((a, b) => a + b, 0)
        const sum2 = playerDice[1].reduce((a, b) => a + b, 0)
        console.log("Final Results:")
        console.log(`Player 1: ${playerDice[0].join(", ")} (sum=${sum1})`)
        console.log(`Player 2: ${playerDice[1].join(", ")} (sum=${sum2})`)
      }
    } catch (err: any) {
      console.error("Failed to roll dice:", err)
      setError(err.message || "Failed to roll dice")
    } finally {
      setIsProcessing(false)
    }
  }

  const maskDice = (dice: number[], state: number) => {
    let revealed = 0
    if (state >= 23) revealed = 5
    else if (state >= 17) revealed = 3
    else if (state >= 11) revealed = 2
    else if (state >= 5) revealed = 1

    return dice.map((d, i) => (i < revealed ? d : 0))
  }

  const renderDice = (dice: number[], isRevealed = true) => {
    return dice.map((value, index) => {
      const DiceIcon = value > 0 && value <= 6 ? DICE_ICONS[value - 1] : Dice1
      return (
        <div
          key={index}
          className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
            value > 0 && isRevealed
              ? "border-yellow-400 bg-yellow-400/20 text-yellow-400"
              : "border-gray-600 bg-gray-800 text-gray-500"
          }`}
        >
          {value > 0 && isRevealed ? <DiceIcon className="w-8 h-8" /> : <span className="text-2xl font-mono">?</span>}
        </div>
      )
    })
  }

  const canJoin = gameState === 0 && myPlayerIndex === -1 && players.includes(ZERO_ADDRESS)
  const canBet = isMyTurn && [1, 2, 3, 4, 7, 8, 9, 10, 13, 14, 15, 16, 19, 20, 21, 22].includes(gameState)
  const canRoll = isMyTurn && [5, 6, 11, 12, 17, 18, 23, 24].includes(gameState)

  if (!account) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-800/50 border-green-500/30 backdrop-blur-sm">
          <CardHeader className="text-center">
            <Link href="/" className="flex items-center text-green-400 mb-4 hover:text-green-300">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Player vs AI</CardTitle>
            <p className="text-gray-400">Connect your wallet to challenge our AI</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleConnectWallet}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </>
              )}
            </Button>
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-green-400 hover:text-green-300">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Player vs AI</h1>
              <p className="text-gray-400">Ethereum Sepolia</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="border-green-500 text-green-400">
              <Bot className="w-4 h-4 mr-1" />
              {account.slice(0, 6)}...{account.slice(-4)}
            </Badge>
            <Button
              onClick={handleDisconnectWallet}
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-500/20"
            >
              Disconnect
            </Button>
          </div>
        </div>

        {/* AI Status */}
        {aiStatus && (
          <Card className="bg-green-500/10 border-green-500/30 backdrop-blur-sm">
            <CardContent className="py-3">
              <div className="flex items-center space-x-2 text-green-400">
                <Bot className="w-4 h-4" />
                <span className="text-sm">{aiStatus}</span>
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Game State */}
        <Card className="bg-gray-800/50 border-green-500/30 backdrop-blur-sm">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl text-white flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                {STATE_NAMES[gameState]}
              </CardTitle>
              <Badge className="bg-green-600 text-white">Round {Math.floor((gameState - 1) / 6) + 1}/4</Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Players */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Player 1 (Human) */}
          <Card
            className={`bg-gray-800/50 border-2 backdrop-blur-sm transition-all duration-300 ${
              myPlayerIndex === 0 ? "border-blue-500 shadow-blue-500/20 shadow-lg" : "border-gray-600"
            }`}
          >
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span>You (Player 1)</span>
                <div className="flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400">{formatEther(bets[0])} ETH</span>
                </div>
              </CardTitle>
              <p className="text-gray-400 text-sm font-mono">
                {players[0] === ZERO_ADDRESS ? "Waiting..." : `${players[0].slice(0, 6)}...${players[0].slice(-4)}`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2 justify-center">{renderDice(maskDice(playerDice[0], gameState))}</div>
            </CardContent>
          </Card>

          {/* Player 2 (AI) */}
          <Card className="bg-gray-800/50 border-2 border-green-600 backdrop-blur-sm shadow-green-500/20 shadow-lg">
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center">
                  <Bot className="w-5 h-5 mr-2 text-green-400" />
                  AI (Player 2)
                </span>
                <div className="flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400">{formatEther(bets[1])} ETH</span>
                </div>
              </CardTitle>
              <p className="text-gray-400 text-sm font-mono">
                {players[1] === ZERO_ADDRESS ? "Waiting..." : `${players[1].slice(0, 6)}...${players[1].slice(-4)}`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2 justify-center">{renderDice(maskDice(playerDice[1], gameState))}</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card className="bg-gray-800/50 border-green-500/30 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>
            )}

            {canJoin && (
              <Button
                onClick={handleJoinGame}
                disabled={isProcessing}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg py-6"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Starting Game...
                  </>
                ) : (
                  <>
                    <Bot className="w-5 h-5 mr-2" />
                    Start Game vs AI
                  </>
                )}
              </Button>
            )}

            {canBet && (
              <div className="space-y-3">
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Bet amount (ETH)"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <Button
                    onClick={handlePlaceBet}
                    disabled={!betAmount || isProcessing}
                    className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Coins className="w-4 h-4 mr-2" />
                    )}
                    Bet
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
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg py-6"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Rolling...
                  </>
                ) : (
                  <>
                    <Dice1 className="w-5 h-5 mr-2" />
                    Roll Dice
                  </>
                )}
              </Button>
            )}

            {!isMyTurn && myPlayerIndex !== -1 && gameState > 0 && gameState < 27 && (
              <div className="text-center py-8">
                <div className="inline-flex items-center space-x-2 text-gray-400">
                  <Bot className="w-5 h-5 text-green-400" />
                  <span>AI is playing...</span>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

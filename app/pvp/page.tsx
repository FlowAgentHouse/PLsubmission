"use client"

import { useState, useEffect } from "react"
import type { BrowserProvider } from "ethers"
import type { Signer } from "ethers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dice1, Dice2, Dice3, Dice4, Dice5, Dice6,
  Wallet, Users, Trophy, Coins, Loader2, ArrowLeft,
  Shield, Zap, Sparkles
} from "lucide-react"
import { formatEther, parseEther } from "ethers"
import { initWeb3, connectWallet, disconnectWallet, getDicePokerContract, checkContractExists } from "@/lib/web3"
import Link from "next/link"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

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

export default function PvPGamePage() {
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
  const [isRolling, setIsRolling] = useState(false)
  const [pot, setPot] = useState(0n)

  useEffect(() => {
    initWeb3()
  }, [])

  useEffect(() => {
    if (account) {
      loadGameData()
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
      setError("Failed to connect wallet. Please make sure you're on Flow Testnet.")
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
      const contractCheck = await checkContractExists()
      if (!contractCheck.exists) {
        setError(`Contract not found. ${contractCheck.error}`)
        return
      }

      const contract = getDicePokerContract()

      const state = await Promise.race([
        contract.currentState(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 10000)),
      ])
      setGameState(Number(state))

      const [player1, player2] = await Promise.all([contract.players(0), contract.players(1)])
      setPlayers([player1, player2])

      const [bet1, bet2] = await Promise.all([contract.bets(0), contract.bets(1)])
      setBets([bet1, bet2])

      const potValue = await contract.pot()
      setPot(potValue)

      const dice1 = []
      const dice2 = []
      for (let i = 0; i < 5; i++) {
        const [d1, d2] = await Promise.all([contract.playerDice(0, i), contract.playerDice(1, i)])
        dice1.push(Number(d1))
        dice2.push(Number(d2))
      }
      setPlayerDice([dice1, dice2])

      setError(null)
    } catch (err: any) {
      console.error("Error loading game data:", err)
      if (err.message.includes("Timeout")) {
        setError("Network timeout. Please check your connection.")
      }
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
      setIsRolling(true)
      setError(null)
      const contract = getDicePokerContract()
      const tx = await contract.rollDice()
      await tx.wait()
      await loadGameData()

      setTimeout(() => setIsRolling(false), 1000)

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
      setIsRolling(false)
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

    return dice.map((d, i) => ({ value: d, isRevealed: i < revealed }))
  }

  const canJoin = gameState === 0 && myPlayerIndex === -1 && players.includes(ZERO_ADDRESS)
  const canBet = isMyTurn && [1, 2, 3, 4, 7, 8, 9, 10, 13, 14, 15, 16, 19, 20, 21, 22].includes(gameState)
  const canRoll = isMyTurn && [5, 6, 11, 12, 17, 18, 23, 24].includes(gameState)

  if (!account) {
    return (
      <div className="min-h-screen bg-black text-white relative flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl floating" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl floating" />
        </div>
        
        <Card className="w-full max-w-md flow-card relative z-10">
          <CardHeader className="text-center">
            <Link href="/" className="flex items-center text-green-400 mb-4 hover:text-green-300 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Player vs Player</CardTitle>
            <p className="text-gray-400">Connect your wallet to challenge other players on Flow</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleConnectWallet}
              disabled={loading}
              className="w-full flow-button text-lg py-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="w-5 h-5 mr-2" />
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
    <div className="min-h-screen bg-black text-white relative p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl floating" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl floating" />
      </div>

      <div className="max-w-7xl mx-auto space-y-6 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-green-400 hover:text-green-300 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Player vs Player</h1>
              <p className="text-gray-400">Flow EVM Testnet</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="border-green-500 text-green-400">
              <Wallet className="w-4 h-4 mr-1" />
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

        {/* Game State & Pot */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="flow-card">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl text-white flex items-center">
                  <Trophy className="w-5 h-5 mr-2 text-yellow-400" />
                  {STATE_NAMES[gameState]}
                </CardTitle>
                <Badge className="bg-gradient-to-r from-green-600 to-blue-600 text-white">
                  Round {Math.floor((gameState - 1) / 6) + 1}/4
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

        {/* VRF Indicator */}
        {canRoll && (
          <Card className="flow-card border-green-500/50 vrf-badge">
            <CardContent className="py-4">
              <div className="flex items-center justify-center space-x-4">
                <Shield className="w-6 h-6 text-green-400 pulse-icon" />
                <span className="text-green-400 font-semibold">
                  Ready to roll with Flow Native VRF - Cryptographically Secure Randomness
                </span>
                <Sparkles className="w-6 h-6 text-green-400 pulse-icon" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Players */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Player 1 */}
          <Card 
            className={`flow-card ${myPlayerIndex === 0 ? 'border-blue-500 shadow-blue-500/20 shadow-xl' : ''}`}
          >
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center">
                  Player 1 {myPlayerIndex === 0 && <Badge className="ml-2 bg-blue-600">You</Badge>}
                </span>
                <div className="flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400">{formatEther(bets[0])} FLOW</span>
                </div>
              </CardTitle>
              <p className="text-gray-400 text-sm font-mono">
                {players[0] === ZERO_ADDRESS ? "Waiting for player..." : `${players[0].slice(0, 6)}...${players[0].slice(-4)}`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-3 justify-center dice-container">
                {maskDice(playerDice[0], gameState).map((die, index) => (
                  <DiceDisplay 
                    key={index} 
                    value={die.value} 
                    isRevealed={die.isRevealed}
                    isRolling={isRolling && myPlayerIndex === 0 && canRoll}
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Player 2 */}
          <Card 
            className={`flow-card ${myPlayerIndex === 1 ? 'border-purple-500 shadow-purple-500/20 shadow-xl' : ''}`}
          >
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center">
                  Player 2 {myPlayerIndex === 1 && <Badge className="ml-2 bg-purple-600">You</Badge>}
                </span>
                <div className="flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400">{formatEther(bets[1])} FLOW</span>
                </div>
              </CardTitle>
              <p className="text-gray-400 text-sm font-mono">
                {players[1] === ZERO_ADDRESS ? "Waiting for player..." : `${players[1].slice(0, 6)}...${players[1].slice(-4)}`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-3 justify-center dice-container">
                {maskDice(playerDice[1], gameState).map((die, index) => (
                  <DiceDisplay 
                    key={index} 
                    value={die.value} 
                    isRevealed={die.isRevealed}
                    isRolling={isRolling && myPlayerIndex === 1 && canRoll}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <Card className="flow-card">
          <CardHeader>
            <CardTitle className="text-white">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {canJoin && (
              <Button
                onClick={handleJoinGame}
                disabled={isProcessing}
                className="w-full flow-button text-lg py-6"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5 mr-2" />
                    Join Game
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

            {!isMyTurn && myPlayerIndex !== -1 && gameState > 0 && gameState < 27 && (
              <div className="text-center py-8">
                <DominoLoader />
                <p className="text-gray-400 mt-4">Waiting for opponent...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
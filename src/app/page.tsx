"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dice1, Users, Bot, Trophy, Gamepad2, Settings } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-6">
            <Dice1 className="w-10 h-10 text-gray-900" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Dice Poker</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Experience the thrill of dice poker on Ethereum Sepolia. Compete with 5 dice across 4 rounds of strategic
            betting.
          </p>
        </div>

        {/* Game Mode Selection */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Player vs Player */}
          <Card className="bg-gray-800/50 border-purple-500/30 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-white">Player vs Player</CardTitle>
              <p className="text-gray-400">Challenge another human player in real-time</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center">
                  <Trophy className="w-4 h-4 mr-2 text-yellow-400" />
                  <span>Compete against real players</span>
                </div>
                <div className="flex items-center">
                  <Gamepad2 className="w-4 h-4 mr-2 text-green-400" />
                  <span>Strategic betting and bluffing</span>
                </div>
                <div className="flex items-center">
                  <Dice1 className="w-4 h-4 mr-2 text-purple-400" />
                  <span>Progressive dice reveals</span>
                </div>
              </div>
              <Link href="/pvp" className="block">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg py-6">
                  Play vs Player
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Player vs AI */}
          <Card className="bg-gray-800/50 border-green-500/30 backdrop-blur-sm hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20 hover:-translate-y-1">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl text-white">Player vs AI</CardTitle>
              <p className="text-gray-400">Practice against our AI opponent</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center">
                  <Bot className="w-4 h-4 mr-2 text-green-400" />
                  <span>AI automatically joins and plays</span>
                </div>
                <div className="flex items-center">
                  <Gamepad2 className="w-4 h-4 mr-2 text-blue-400" />
                  <span>Perfect for learning the game</span>
                </div>
                <div className="flex items-center">
                  <Dice1 className="w-4 h-4 mr-2 text-purple-400" />
                  <span>Same rules and mechanics</span>
                </div>
              </div>
              <Link href="/pve" className="block">
                <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-lg py-6">
                  Play vs AI
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Debug Tools */}
        <div className="text-center">
          <Link href="/contract-debug">
            <Button variant="outline" className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/20">
              <Settings className="w-4 h-4 mr-2" />
              Contract Debug Tools
            </Button>
          </Link>
        </div>

        {/* Game Rules */}
        <Card className="bg-gray-800/50 border-gray-600 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-xl text-center">How to Play</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6 text-gray-300">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Game Flow</h3>
              <ul className="space-y-2 text-sm">
                <li>• Two players compete with 5 dice each</li>
                <li>• 4 rounds of betting with progressive reveals</li>
                <li>• Round 1: Bet → Reveal 1st die</li>
                <li>• Round 2: Bet → Reveal 2nd die</li>
                <li>• Round 3: Bet → Reveal 3rd die</li>
                <li>• Round 4: Bet → Reveal final 2 dice</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">Winning</h3>
              <ul className="space-y-2 text-sm">
                <li>• Highest total sum of 5 dice wins</li>
                <li>• Ties split the pot equally</li>
                <li>• Players can fold to forfeit</li>
                <li>• Strategic betting increases the pot</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Dice1, Users, Bot, Trophy, Gamepad2, Settings, Shield, 
  Sparkles, Zap, Star, Clock, Target, Award, CheckCircle,
  ArrowRight, Play, Rocket, Database
} from "lucide-react"
import { useEffect, useState } from "react"

export default function HomePage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    setIsLoaded(true)
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const createParticles = () => {
    return Array.from({ length: 20 }, (_, i) => (
      <div
        key={i}
        className="particle"
        style={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 8}s`,
          animationDuration: `${8 + Math.random() * 4}s`,
        }}
      />
    ))
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Enhanced Background Elements */}
      <div className="particle-bg">
        {createParticles()}
      </div>
      
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full blur-3xl floating" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-full blur-3xl floating" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-3xl floating" />
        
        {/* Mouse follower effect */}
        <div 
          className="absolute w-96 h-96 bg-gradient-to-br from-green-500/5 to-purple-500/5 rounded-full blur-3xl pointer-events-none transition-all duration-1000 ease-out"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        />
      </div>

      <div className={`max-w-7xl mx-auto space-y-12 relative z-10 p-4 transition-all duration-1000 ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Enhanced Header */}
        <div className="text-center space-y-8 py-8">
          <div className="inline-flex items-center justify-center relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-full blur-xl opacity-60 pulse-icon" />
            <div className="relative w-28 h-28 bg-gradient-to-br from-black to-gray-900 rounded-full flex items-center justify-center border-2 border-green-500 shadow-2xl">
              <div className="dice-loader" />
            </div>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-7xl font-bold animated-text leading-tight">
              Flow Dice Poker
            </h1>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Experience the future of gaming on <span className="text-green-400 font-semibold">Flow blockchain</span> with 
              cryptographically secure VRF randomness. Battle through 4 rounds of strategic betting with progressive dice reveals.
            </p>
            
            {/* Enhanced VRF Badge */}
            <div className="inline-flex items-center gap-3 px-6 py-3 vrf-badge rounded-full">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">Secured by Flow Native VRF</span>
              <div className="w-2 h-2 bg-green-400 rounded-full pulse-icon" />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mt-8">
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-green-400">100%</div>
                <div className="text-xs text-gray-400">Provably Fair</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-blue-400">0.001</div>
                <div className="text-xs text-gray-400">FLOW Fee</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-purple-400">&lt;1s</div>
                <div className="text-xs text-gray-400">Transaction</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-cyan-400">24/7</div>
                <div className="text-xs text-gray-400">Available</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Game Mode Selection */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Player vs Player */}
          <Card className="flow-card group relative">
            <CardHeader className="text-center pb-6">
              <div className="flow-light-button mx-auto">
                <div className="light-holder">
                  <div className="dot"></div>
                  <div className="light"></div>
                </div>
                <div className="button-holder">
                  <Users className="w-10 h-10" />
                  <span className="text-sm font-bold">Player vs Player</span>
                </div>
              </div>
              <CardTitle className="text-3xl text-white mb-3">Competitive Arena</CardTitle>
              <p className="text-gray-400">Challenge real opponents in high-stakes battles</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                  </div>
                  <span className="text-gray-300">Compete for real FLOW tokens</span>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-gray-300">Strategic betting & mind games</span>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-gray-300">Progressive dice reveals</span>
                </div>
              </div>
              <a href="/pvp" className="block">
                <Button className="w-full flow-button text-lg py-6 group">
                  Enter PvP Arena
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Player vs AI */}
          <Card className="flow-card group relative">
            <CardHeader className="text-center pb-6">
              <div className="flow-light-button mx-auto">
                <div className="light-holder">
                  <div className="dot"></div>
                  <div className="light"></div>
                </div>
                <div className="button-holder">
                  <Bot className="w-10 h-10" />
                  <span className="text-sm font-bold">Player vs AI</span>
                </div>
              </div>
              <CardTitle className="text-3xl text-white mb-3">Practice Arena</CardTitle>
              <p className="text-gray-400">Master your skills against our AI opponent</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4 text-sm">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-gray-300">AI automatically joins & plays</span>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Gamepad2 className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-gray-300">Perfect for learning strategies</span>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-gray-300">Same VRF-secured gameplay</span>
                </div>
              </div>
              <a href="/pve" className="block">
                <Button className="w-full flow-button text-lg py-6 group">
                  Challenge AI
                  <Play className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Flow Features */}
        <Card className="flow-card">
          <CardHeader>
            <CardTitle className="text-3xl text-center animated-text">Powered by Flow Blockchain</CardTitle>
            <p className="text-center text-gray-400 max-w-2xl mx-auto">
              Built on the next-generation blockchain designed for games and consumer applications
            </p>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4 group">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Native VRF</h3>
              <p className="text-sm text-gray-400 leading-relaxed">Cryptographically secure randomness built directly into the blockchain protocol</p>
            </div>
            <div className="text-center space-y-4 group">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Rocket className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Fast & Scalable</h3>
              <p className="text-sm text-gray-400 leading-relaxed">Sub-second finality with minimal transaction costs for seamless gaming</p>
            </div>
            <div className="text-center space-y-4 group">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Database className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white">Fair Gaming</h3>
              <p className="text-sm text-gray-400 leading-relaxed">Verifiable, tamper-proof results with complete transparency</p>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Game Rules */}
        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="flow-card">
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center gap-3">
                <Target className="w-8 h-8 text-green-400" />
                Game Flow
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 text-sm">
                {[
                  "Two players compete with 5 dice each",
                  "4 rounds of betting with progressive reveals",
                  "Round 1-3: Bet → Reveal 1 die each",
                  "Round 4: Bet → Reveal final 2 dice",
                  "All dice rolls use Flow's native VRF"
                ].map((rule, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-400 text-xs font-bold">{index + 1}</span>
                    </div>
                    <span className="text-gray-300">{rule}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="flow-card">
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center gap-3">
                <Award className="w-8 h-8 text-purple-400" />
                Winning & Strategy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4 text-sm">
                {[
                  "Players can fold to minimize losses",
                  "Strategic betting increases the pot",
                  "Highest total sum of 5 dice wins",
                  "Ties split the pot equally",
                  "Every game is provably fair"
                ].map((rule, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                    <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{rule}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center space-y-6 py-12">
          <h2 className="text-4xl font-bold animated-text">Ready to Roll the Dice?</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Join the future of gaming on Flow blockchain and experience true randomness like never before.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
            <a href="/pvp" className="w-full">
              <Button className="w-full flow-button text-lg py-6">
                Start Playing Now
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
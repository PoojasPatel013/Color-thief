"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import GameCanvas from "@/components/game-canvas"

export default function GamePage() {
  const [gameStarted, setGameStarted] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)

  const handleGameOver = (finalScore: number) => {
    setGameOver(true)
    setScore(finalScore)
  }

  const handleLevelUp = (newLevel: number) => {
    setLevel(newLevel)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      {!gameStarted && !gameOver ? (
        <div className="text-center mb-8 bg-slate-800/70 p-8 rounded-xl shadow-xl backdrop-blur-sm">
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">How to Play</h1>
          <div className="max-w-md mx-auto text-left space-y-4 mb-8">
            <p>• Use <span className="font-bold">arrow keys</span> or <span className="font-bold">WASD</span> to move your blob</p>
            <p>• Absorb colors by touching colored orbs</p>
            <p>• <span className="text-red-400 font-bold">Red</span>: Move faster</p>
            <p>• <span className="text-blue-400 font-bold">Blue</span>: Jump higher</p>
            <p>• <span className="text-green-400 font-bold">Green</span>: Temporary invisibility</p>
            <p>• <span className="text-yellow-400 font-bold">Yellow</span>: Shield protection</p>
            <p>• <span className="text-purple-400 font-bold">Purple</span>: Score multiplier</p>
            <p>• Match your color with targets to score points</p>
            <p>• Collect power-ups for special abilities</p>
            <p>• You have 3 lives - use them wisely!</p>
          </div>
          <Button 
            className="px-6 py-4 text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/20"
            onClick={() => setGameStarted(true)}
          >
            Start Game
          </Button>
        </div>
      ) : gameOver ? (
        <div className="text-center bg-slate-800/70 p-8 rounded-xl shadow-xl backdrop-blur-sm">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">Game Over!</h1>
          <p className="text-2xl mb-2">Your score: <span className="font-bold text-yellow-300">{score}</span></p>
          <p className="text-xl mb-8">Level reached: <span className="font-bold text-blue-300">{level}</span></p>
          <div className="flex gap-4 justify-center">
            <Button 
              className="px-6 py-4 text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-blue-500/20"
              onClick={() => {
                setGameOver(false)
                setGameStarted(true)
                setLevel(1)
              }}
            >
              Play Again
            </Button>
            <Link href="/">
              <Button variant="outline" className="px-6 py-4 text-lg border-white/20 bg-white/5 hover:bg-white/10">
                Main Menu
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute top-2 left-2 z-10 bg-slate-800/80 px-4 py-2 rounded-lg backdrop-blur-sm">
            <p className="text-lg">Level: <span className="font-bold text-blue-300">{level}</span></p>
          </div>
          <GameCanvas onGameOver={handleGameOver} onLevelUp={handleLevelUp} />
        </div>
      )}
    </main>
  )
}

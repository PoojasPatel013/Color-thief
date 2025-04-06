import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-900 text-white">
      <div className="max-w-5xl w-full text-center">
        <h1 className="text-6xl font-bold mb-8 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
          Color Thief
        </h1>
        <p className="text-xl mb-12">
          Absorb colors from the environment and use their powers to overcome obstacles!
        </p>
        <Link href="/game">
          <Button className="px-8 py-6 text-xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700">
            Start Game
          </Button>
        </Link>
      </div>
    </main>
  )
}

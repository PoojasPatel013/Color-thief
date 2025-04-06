"use client"

import { useEffect, useRef, useState } from "react"

interface GameCanvasProps {
  onGameOver: (score: number) => void
  onLevelUp: (level: number) => void
}

// Game entities and types
type EntityType = "player" | "colorOrb" | "enemy" | "target" | "powerUp" | "platform" | "particle"
type PowerUpType = "shield" | "extraLife" | "scoreMultiplier" | "slowMotion" | "magnet"

interface Entity {
  x: number
  y: number
  width: number
  height: number
  color: string
  type: EntityType
  visible: boolean
}

interface Player extends Entity {
  velocityX: number
  velocityY: number
  jumpPower: number
  speed: number
  isJumping: boolean
  invisibilityTimer: number
  score: number
  lives: number
  invincible: boolean
  invincibilityTimer: number
  shield: boolean
  shieldTimer: number
  scoreMultiplier: number
  multiplierTimer: number
  magnetRadius: number
  magnetTimer: number
  slowMotionTimer: number
}

interface ColorOrb extends Entity {
  collected: boolean
  pulseSize: number
  pulseDirection: boolean
}

interface Enemy extends Entity {
  velocityX: number
  velocityY: number
  speed: number
  chasePlayer: boolean
  size: number
  sizeDirection: boolean
}

interface Target extends Entity {
  matched: boolean
  timer: number
  points: number
  pulseSize: number
  pulseDirection: boolean
}

interface PowerUp extends Entity {
  type: PowerUpType
  collected: boolean
  floatOffset: number
  floatDirection: boolean
}

interface Platform extends Entity {
  moving: boolean
  startX: number
  startY: number
  endX: number
  endY: number
  progress: number
  speed: number
}

interface Particle extends Entity {
  velocityX: number
  velocityY: number
  life: number
  maxLife: number
  size: number
}

export default function GameCanvas({ onGameOver, onLevelUp }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gameLoop, setGameLoop] = useState<number | null>(null)
  const [keys, setKeys] = useState({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
    " ": false, // Space
  })

  // Game state refs to avoid dependency issues in the game loop
  const playerRef = useRef<Player>({
    x: 100,
    y: 100,
    width: 40,
    height: 40,
    color: "#ffffff",
    type: "player",
    velocityX: 0,
    velocityY: 0,
    jumpPower: 15,
    speed: 5,
    isJumping: false,
    invisibilityTimer: 0,
    score: 0,
    lives: 3,
    invincible: true, // Start with brief invincibility
    invincibilityTimer: 180, // 3 seconds at 60fps
    shield: false,
    shieldTimer: 0,
    scoreMultiplier: 1,
    multiplierTimer: 0,
    magnetRadius: 0,
    magnetTimer: 0,
    slowMotionTimer: 0,
    visible: true,
  })

  const colorOrbsRef = useRef<ColorOrb[]>([])
  const enemiesRef = useRef<Enemy[]>([])
  const targetsRef = useRef<Target[]>([])
  const powerUpsRef = useRef<PowerUp[]>([])
  const platformsRef = useRef<Platform[]>([])
  const particlesRef = useRef<Particle[]>([])
  const gameTimeRef = useRef(0)
  const keysRef = useRef(keys)
  const levelRef = useRef(1)
  const levelScoreThresholdRef = useRef(300) // Score needed to advance to next level
  const gameSpeedRef = useRef(1) // For slow motion effect
  const backgroundGradientRef = useRef({
    start: "#1e293b",
    end: "#0f172a",
  })

  // Update keys ref when state changes
  useEffect(() => {
    keysRef.current = keys
  }, [keys])

  // Initialize game
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = 800
    canvas.height = 600

    // Initialize game elements based on level
    initializeLevel(1)

    // Start game loop
    const loop = window.requestAnimationFrame(gameUpdate)
    setGameLoop(loop)

    // Set up event listeners
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    // Touch controls for mobile
    canvas.addEventListener("touchstart", handleTouchStart)
    canvas.addEventListener("touchmove", handleTouchMove)
    canvas.addEventListener("touchend", handleTouchEnd)

    return () => {
      if (gameLoop) window.cancelAnimationFrame(gameLoop)
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchmove", handleTouchMove)
      canvas.removeEventListener("touchend", handleTouchEnd)
    }
  }, [])

  // Initialize level
  const initializeLevel = (level: number) => {
    levelRef.current = level
    onLevelUp(level)

    // Reset player position but keep score
    const player = playerRef.current
    const currentScore = player.score
    const currentLives = player.lives

    // Create safe starting area
    player.x = 100
    player.y = 100
    player.velocityX = 0
    player.velocityY = 0
    player.score = currentScore
    player.lives = currentLives
    player.invincible = true
    player.invincibilityTimer = 180 // 3 seconds invincibility on level start

    // Update background gradient based on level
    if (level === 1) {
      backgroundGradientRef.current = { start: "#1e293b", end: "#0f172a" }
    } else if (level === 2) {
      backgroundGradientRef.current = { start: "#1e1b4b", end: "#0f172a" }
    } else if (level === 3) {
      backgroundGradientRef.current = { start: "#3b1e2b", end: "#0f172a" }
    } else {
      backgroundGradientRef.current = { start: "#1e3b2b", end: "#0f172a" }
    }

    // Initialize color orbs - more orbs at higher levels
    const orbCount = 5 + level
    colorOrbsRef.current = []

    for (let i = 0; i < orbCount; i++) {
      const colors = ["#ff0000", "#0000ff", "#00ff00", "#ffff00", "#ff00ff"]
      const color = colors[Math.floor(Math.random() * colors.length)]
      const x = 100 + Math.random() * 600
      const y = 100 + Math.random() * 400

      colorOrbsRef.current.push({
        x,
        y,
        width: 30,
        height: 30,
        color,
        type: "colorOrb",
        collected: false,
        visible: true,
        pulseSize: 0,
        pulseDirection: true,
      })
    }

    // Initialize enemies - more and faster enemies at higher levels
    const enemyCount = 2 + level
    enemiesRef.current = []

    for (let i = 0; i < enemyCount; i++) {
      const colors = ["#ff0000", "#0000ff", "#00ff00"]
      const color = colors[Math.floor(Math.random() * colors.length)]
      const x = 200 + Math.random() * 500
      const y = 200 + Math.random() * 300
      const speed = 1 + level * 0.5

      enemiesRef.current.push({
        x,
        y,
        width: 40,
        height: 40,
        color,
        type: "enemy",
        velocityX: Math.random() * 4 - 2,
        velocityY: Math.random() * 4 - 2,
        speed,
        visible: true,
        chasePlayer: level > 1 && Math.random() > 0.5,
        size: 40,
        sizeDirection: true,
      })
    }

    // Initialize targets - more valuable targets at higher levels
    const targetCount = 3 + level
    targetsRef.current = []

    for (let i = 0; i < targetCount; i++) {
      const colors = ["#ff0000", "#0000ff", "#00ff00", "#ffff00", "#ff00ff"]
      const color = colors[Math.floor(Math.random() * colors.length)]
      const x = 100 + Math.random() * 600
      const y = 100 + Math.random() * 400
      const points = 50 * level

      targetsRef.current.push({
        x,
        y,
        width: 60,
        height: 60,
        color,
        type: "target",
        matched: false,
        timer: 0,
        visible: true,
        points,
        pulseSize: 0,
        pulseDirection: true,
      })
    }

    // Initialize power-ups - more types at higher levels
    powerUpsRef.current = []
    const powerUpTypes: PowerUpType[] = ["shield", "extraLife", "scoreMultiplier"]

    if (level >= 2) {
      powerUpTypes.push("slowMotion")
    }

    if (level >= 3) {
      powerUpTypes.push("magnet")
    }

    for (let i = 0; i < 2 + level; i++) {
      const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]
      const x = 100 + Math.random() * 600
      const y = 100 + Math.random() * 400

      let color = "#ffffff"
      switch (type) {
        case "shield":
          color = "#00ffff"
          break
        case "extraLife":
          color = "#ff6666"
          break
        case "scoreMultiplier":
          color = "#ff00ff"
          break
        case "slowMotion":
          color = "#aaaaff"
          break
        case "magnet":
          color = "#ffaa00"
          break
      }

      powerUpsRef.current.push({
        x,
        y,
        width: 25,
        height: 25,
        color,
        type: "powerUp",
        powerType: type,
        collected: false,
        visible: true,
        floatOffset: 0,
        floatDirection: true,
      })
    }

    // Initialize platforms - more complex platforms at higher levels
    platformsRef.current = []

    if (level >= 2) {
      // Add some basic platforms
      for (let i = 0; i < 3 + level; i++) {
        const x = 100 + Math.random() * 600
        const y = 150 + Math.random() * 350
        const width = 80 + Math.random() * 120

        platformsRef.current.push({
          x,
          y,
          width,
          height: 20,
          color: "#888888",
          type: "platform",
          visible: true,
          moving: false,
          startX: x,
          startY: y,
          endX: x,
          endY: y,
          progress: 0,
          speed: 0,
        })
      }

      // Add moving platforms at higher levels
      if (level >= 3) {
        for (let i = 0; i < 2; i++) {
          const startX = 100 + Math.random() * 300
          const startY = 150 + Math.random() * 350
          const endX = startX + 200 + Math.random() * 200
          const endY = startY + (Math.random() > 0.5 ? 100 : -100)

          platformsRef.current.push({
            x: startX,
            y: startY,
            width: 100,
            height: 20,
            color: "#aaaaaa",
            type: "platform",
            visible: true,
            moving: true,
            startX,
            startY,
            endX,
            endY,
            progress: 0,
            speed: 0.005 + Math.random() * 0.005,
          })
        }
      }
    }

    // Clear particles
    particlesRef.current = []

    // Update level score threshold
    levelScoreThresholdRef.current = 300 * level
  }

  // Handle key events
  const handleKeyDown = (e: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", " "].includes(e.key)) {
      e.preventDefault()
      setKeys((prev) => ({ ...prev, [e.key]: true }))
    }
  }

  const handleKeyUp = (e: KeyboardEvent) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", " "].includes(e.key)) {
      e.preventDefault()
      setKeys((prev) => ({ ...prev, [e.key]: false }))
    }
  }

  // Touch controls
  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const touch = e.touches[0]
    const rect = canvas.getBoundingClientRect()
    const touchX = touch.clientX - rect.left
    const touchY = touch.clientY - rect.top

    // Virtual joystick or direction detection
    if (touchX < canvas.width / 3) {
      setKeys((prev) => ({ ...prev, ArrowLeft: true }))
    } else if (touchX > (canvas.width / 3) * 2) {
      setKeys((prev) => ({ ...prev, ArrowRight: true }))
    }

    if (touchY < canvas.height / 2) {
      setKeys((prev) => ({ ...prev, ArrowUp: true }))
    }
  }

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    // Reset all keys first
    setKeys((prev) => ({
      ...prev,
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
    }))

    const touch = e.touches[0]
    const rect = canvas.getBoundingClientRect()
    const touchX = touch.clientX - rect.left
    const touchY = touch.clientY - rect.top

    // Virtual joystick or direction detection
    if (touchX < canvas.width / 3) {
      setKeys((prev) => ({ ...prev, ArrowLeft: true }))
    } else if (touchX > (canvas.width / 3) * 2) {
      setKeys((prev) => ({ ...prev, ArrowRight: true }))
    }

    if (touchY < canvas.height / 2) {
      setKeys((prev) => ({ ...prev, ArrowUp: true }))
    }
  }

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault()
    // Reset all keys
    setKeys((prev) => ({
      ...prev,
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
    }))
  }

  // Helper functions to create entities
  function createColorOrb(x: number, y: number, color: string): ColorOrb {
    return {
      x,
      y,
      width: 30,
      height: 30,
      color,
      type: "colorOrb",
      collected: false,
      visible: true,
      pulseSize: 0,
      pulseDirection: true,
    }
  }

  function createEnemy(x: number, y: number, color: string, speed: number, chasePlayer: boolean): Enemy {
    return {
      x,
      y,
      width: 40,
      height: 40,
      color,
      type: "enemy",
      velocityX: Math.random() * 4 - 2,
      velocityY: Math.random() * 4 - 2,
      speed,
      visible: true,
      chasePlayer,
      size: 40,
      sizeDirection: true,
    }
  }

  function createTarget(x: number, y: number, color: string, points: number): Target {
    return {
      x,
      y,
      width: 60,
      height: 60,
      color,
      type: "target",
      matched: false,
      timer: 0,
      visible: true,
      points,
      pulseSize: 0,
      pulseDirection: true,
    }
  }

  function createPowerUp(x: number, y: number, type: PowerUpType): PowerUp {
    let color = "#ffffff"
    switch (type) {
      case "shield":
        color = "#00ffff"
        break
      case "extraLife":
        color = "#ff6666"
        break
      case "scoreMultiplier":
        color = "#ff00ff"
        break
      case "slowMotion":
        color = "#aaaaff"
        break
      case "magnet":
        color = "#ffaa00"
        break
    }

    return {
      x,
      y,
      width: 25,
      height: 25,
      color,
      type: "powerUp",
      powerType: type,
      collected: false,
      visible: true,
      floatOffset: 0,
      floatDirection: true,
    }
  }

  function createParticle(x: number, y: number, color: string): Particle {
    return {
      x,
      y,
      width: 5,
      height: 5,
      color,
      type: "particle",
      visible: true,
      velocityX: (Math.random() - 0.5) * 5,
      velocityY: (Math.random() - 0.5) * 5,
      life: 60,
      maxLife: 60,
      size: 5,
    }
  }

  // Check collision between two entities
  function checkCollision(entity1: Entity, entity2: Entity): boolean {
    return (
      entity1.x < entity2.x + entity2.width &&
      entity1.x + entity1.width > entity2.x &&
      entity1.y < entity2.y + entity2.height &&
      entity1.y + entity1.height > entity2.y
    )
  }

  // Create particles
  function spawnParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push(createParticle(x, y, color))
    }
  }

  // Main game update function
  const gameUpdate = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Apply slow motion if active
    const gameSpeed = playerRef.current.slowMotionTimer > 0 ? 0.5 : 1
    gameSpeedRef.current = gameSpeed

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, backgroundGradientRef.current.start)
    gradient.addColorStop(1, backgroundGradientRef.current.end)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw grid lines for visual depth
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)"
    ctx.lineWidth = 1

    // Horizontal grid lines
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // Vertical grid lines
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }

    // Update game time
    gameTimeRef.current += 1 * gameSpeed

    // Get current player state
    const player = playerRef.current
    const colorOrbs = colorOrbsRef.current
    const enemies = enemiesRef.current
    const targets = targetsRef.current
    const powerUps = powerUpsRef.current
    const platforms = platformsRef.current
    const particles = particlesRef.current

    // Check for level up
    if (player.score >= levelScoreThresholdRef.current) {
      const newLevel = levelRef.current + 1
      initializeLevel(newLevel)
    }

    // Update player timers
    if (player.invincibilityTimer > 0) {
      player.invincibilityTimer -= 1 * gameSpeed
      player.invincible = true
    } else {
      player.invincible = false
    }

    if (player.shieldTimer > 0) {
      player.shieldTimer -= 1 * gameSpeed
      player.shield = true
    } else {
      player.shield = false
    }

    if (player.multiplierTimer > 0) {
      player.multiplierTimer -= 1 * gameSpeed
    } else {
      player.scoreMultiplier = 1
    }

    if (player.magnetTimer > 0) {
      player.magnetTimer -= 1 * gameSpeed
    } else {
      player.magnetRadius = 0
    }

    if (player.slowMotionTimer > 0) {
      player.slowMotionTimer -= 1
    }

    if (player.invisibilityTimer > 0) {
      player.invisibilityTimer -= 1 * gameSpeed
      player.visible = gameTimeRef.current % 10 < 5 // Blinking effect
    } else {
      player.visible = true
    }

    // Apply color-based abilities
    if (player.color === "#ff0000") {
      // Red - Speed
      player.speed = 8
    } else if (player.color === "#0000ff") {
      // Blue - Jump
      player.jumpPower = 20
    } else if (player.color === "#00ff00") {
      // Green - Invisibility
      if (player.invisibilityTimer <= 0) {
        player.invisibilityTimer = 300 // 5 seconds at 60fps
      }
    } else if (player.color === "#ffff00") {
      // Yellow - Shield
      if (!player.shield) {
        player.shield = true
        player.shieldTimer = 600 // 10 seconds
      }
    } else if (player.color === "#ff00ff") {
      // Purple - Score multiplier
      player.scoreMultiplier = 2
      player.multiplierTimer = 600 // 10 seconds
    } else {
      // Default values
      player.speed = 5
      player.jumpPower = 15
    }

    // Handle player movement based on keys
    player.velocityX = 0

    if (keysRef.current.ArrowLeft || keysRef.current.a) {
      player.velocityX = -player.speed
    }

    if (keysRef.current.ArrowRight || keysRef.current.d) {
      player.velocityX = player.speed
    }

    if ((keysRef.current.ArrowUp || keysRef.current.w || keysRef.current[" "]) && !player.isJumping) {
      player.velocityY = -player.jumpPower
      player.isJumping = true
    }

    // Apply gravity
    player.velocityY += 0.8 * gameSpeed

    // Update player position
    player.x += player.velocityX * gameSpeed
    player.y += player.velocityY * gameSpeed

    // Check platform collisions
    let onPlatform = false
    platforms.forEach((platform) => {
      if (
        player.velocityY > 0 && // Only check when falling
        player.y + player.height <= platform.y + 10 && // Was above platform
        player.y + player.height + player.velocityY >= platform.y && // Will be below platform
        player.x + player.width > platform.x && // Right edge past platform left edge
        player.x < platform.x + platform.width
      ) {
        // Left edge before platform right edge

        player.y = platform.y - player.height
        player.velocityY = 0
        player.isJumping = false
        onPlatform = true

        // If platform is moving, move player with it
        if (platform.moving) {
          player.x += (platform.x - platform.prevX || 0) * gameSpeed
        }
      }
    })

    // Keep player within bounds
    if (player.x < 0) player.x = 0
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width
    if (player.y < 0) player.y = 0
    if (player.y + player.height > canvas.height) {
      player.y = canvas.height - player.height
      player.velocityY = 0
      player.isJumping = false
    }

    // Update platforms
    platforms.forEach((platform) => {
      // Store previous position for player movement
      platform.prevX = platform.x
      platform.prevY = platform.y

      if (platform.moving) {
        platform.progress += platform.speed * gameSpeed

        if (platform.progress >= 1) {
          platform.progress = 0
          // Swap start and end points
          const tempX = platform.startX
          const tempY = platform.startY
          platform.startX = platform.endX
          platform.startY = platform.endY
          platform.endX = tempX
          platform.endY = tempY
        }

        // Interpolate position
        platform.x = platform.startX + (platform.endX - platform.startX) * platform.progress
        platform.y = platform.startY + (platform.endY - platform.startY) * platform.progress
      }

      // Draw platform
      ctx.fillStyle = platform.color
      ctx.fillRect(platform.x, platform.y, platform.width, platform.height)

      // Add platform shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
      ctx.fillRect(platform.x + 5, platform.y + 5, platform.width, platform.height / 2)
    })

    // Update and draw color orbs
    colorOrbs.forEach((orb, index) => {
      if (!orb.collected) {
        // Update pulse animation
        if (orb.pulseDirection) {
          orb.pulseSize += 0.1 * gameSpeed
          if (orb.pulseSize >= 5) orb.pulseDirection = false
        } else {
          orb.pulseSize -= 0.1 * gameSpeed
          if (orb.pulseSize <= 0) orb.pulseDirection = true
        }

        // Apply magnet effect if player has it
        if (player.magnetRadius > 0) {
          const dx = player.x + player.width / 2 - (orb.x + orb.width / 2)
          const dy = player.y + player.height / 2 - (orb.y + orb.height / 2)
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < player.magnetRadius) {
            const angle = Math.atan2(dy, dx)
            const force = ((player.magnetRadius - distance) / player.magnetRadius) * 2
            orb.x += Math.cos(angle) * force * gameSpeed
            orb.y += Math.sin(angle) * force * gameSpeed
          }
        }

        // Draw glow effect
        const gradient = ctx.createRadialGradient(
          orb.x + orb.width / 2,
          orb.y + orb.height / 2,
          0,
          orb.x + orb.width / 2,
          orb.y + orb.height / 2,
          orb.width / 2 + 10,
        )
        gradient.addColorStop(0, orb.color)
        gradient.addColorStop(1, "rgba(0,0,0,0)")

        ctx.beginPath()
        ctx.fillStyle = gradient
        ctx.arc(orb.x + orb.width / 2, orb.y + orb.height / 2, orb.width / 2 + orb.pulseSize + 5, 0, Math.PI * 2)
        ctx.fill()

        // Draw orb
        ctx.fillStyle = orb.color
        ctx.beginPath()
        ctx.arc(orb.x + orb.width / 2, orb.y + orb.height / 2, orb.width / 2, 0, Math.PI * 2)
        ctx.fill()

        // Add highlight
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
        ctx.beginPath()
        ctx.arc(orb.x + orb.width / 4, orb.y + orb.height / 4, orb.width / 6, 0, Math.PI * 2)
        ctx.fill()

        // Check collision with player
        if (checkCollision(player, orb)) {
          player.color = orb.color
          orb.collected = true

          // Create particles
          spawnParticles(orb.x + orb.width / 2, orb.y + orb.height / 2, orb.color, 20)

          // Respawn orb after a delay
          setTimeout(() => {
            const newX = Math.random() * (canvas.width - orb.width)
            const newY = Math.random() * (canvas.height - orb.height)
            colorOrbsRef.current[index] = {
              ...orb,
              x: newX,
              y: newY,
              collected: false,
            }
          }, 5000)
        }
      }
    })

    // Update and draw power-ups
    powerUps.forEach((powerUp, index) => {
      if (!powerUp.collected) {
        // Floating animation
        if (powerUp.floatDirection) {
          powerUp.floatOffset += 0.1 * gameSpeed
          if (powerUp.floatOffset >= 5) powerUp.floatDirection = false
        } else {
          powerUp.floatOffset -= 0.1 * gameSpeed
          if (powerUp.floatOffset <= -5) powerUp.floatDirection = true
        }

        // Apply magnet effect if player has it
        if (player.magnetRadius > 0) {
          const dx = player.x + player.width / 2 - (powerUp.x + powerUp.width / 2)
          const dy = player.y + player.height / 2 - (powerUp.y + powerUp.height / 2)
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < player.magnetRadius) {
            const angle = Math.atan2(dy, dx)
            const force = ((player.magnetRadius - distance) / player.magnetRadius) * 2
            powerUp.x += Math.cos(angle) * force * gameSpeed
            powerUp.y += Math.sin(angle) * force * gameSpeed
          }
        }

        // Draw power-up
        ctx.fillStyle = powerUp.color
        ctx.beginPath()

        // Different shapes for different power-ups
        switch (powerUp.powerType) {
          case "shield":
            // Draw shield (circle)
            ctx.arc(
              powerUp.x + powerUp.width / 2,
              powerUp.y + powerUp.floatOffset + powerUp.height / 2,
              powerUp.width / 2,
              0,
              Math.PI * 2,
            )
            break
          case "extraLife":
            // Draw heart
            const x = powerUp.x + powerUp.width / 2
            const y = powerUp.y + powerUp.floatOffset + powerUp.height / 2
            const size = powerUp.width / 2

            ctx.beginPath()
            ctx.moveTo(x, y + size / 4)
            ctx.bezierCurveTo(x, y - size / 2, x - size, y - size / 2, x - size, y + size / 4)
            ctx.bezierCurveTo(x - size, y + size, x, y + size, x, y + size)
            ctx.bezierCurveTo(x, y + size, x + size, y + size, x + size, y + size / 4)
            ctx.bezierCurveTo(x + size, y - size / 2, x, y - size / 2, x, y + size / 4)
            break
          case "scoreMultiplier":
            // Draw star
            const centerX = powerUp.x + powerUp.width / 2
            const centerY = powerUp.y + powerUp.floatOffset + powerUp.height / 2
            const spikes = 5
            const outerRadius = powerUp.width / 2
            const innerRadius = powerUp.width / 4

            let rot = (Math.PI / 2) * 3
            const step = Math.PI / spikes

            ctx.beginPath()
            ctx.moveTo(centerX, centerY - outerRadius)

            for (let i = 0; i < spikes; i++) {
              ctx.lineTo(centerX + Math.cos(rot) * outerRadius, centerY + Math.sin(rot) * outerRadius)
              rot += step
              ctx.lineTo(centerX + Math.cos(rot) * innerRadius, centerY + Math.sin(rot) * innerRadius)
              rot += step
            }

            ctx.lineTo(centerX, centerY - outerRadius)
            ctx.closePath()
            break
          case "slowMotion":
            // Draw hourglass
            ctx.fillRect(powerUp.x, powerUp.y + powerUp.floatOffset, powerUp.width, powerUp.height)
            ctx.beginPath()
            ctx.moveTo(powerUp.x, powerUp.y + powerUp.floatOffset)
            ctx.lineTo(powerUp.x + powerUp.width, powerUp.y + powerUp.floatOffset)
            ctx.lineTo(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.floatOffset + powerUp.height / 2)
            ctx.lineTo(powerUp.x + powerUp.width, powerUp.y + powerUp.floatOffset + powerUp.height)
            ctx.lineTo(powerUp.x, powerUp.y + powerUp.floatOffset + powerUp.height)
            ctx.lineTo(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.floatOffset + powerUp.height / 2)
            ctx.closePath()
            break
          case "magnet":
            // Draw magnet
            ctx.fillRect(powerUp.x, powerUp.y + powerUp.floatOffset, powerUp.width, powerUp.height * 0.6)
            ctx.fillRect(
              powerUp.x,
              powerUp.y + powerUp.floatOffset + powerUp.height * 0.7,
              powerUp.width * 0.3,
              powerUp.height * 0.3,
            )
            ctx.fillRect(
              powerUp.x + powerUp.width * 0.7,
              powerUp.y + powerUp.floatOffset + powerUp.height * 0.7,
              powerUp.width * 0.3,
              powerUp.height * 0.3,
            )
            break
          default:
            // Default square
            ctx.fillRect(powerUp.x, powerUp.y + powerUp.floatOffset, powerUp.width, powerUp.height)
        }

        ctx.fill()

        // Add glow effect
        ctx.shadowColor = powerUp.color
        ctx.shadowBlur = 10
        ctx.fill()
        ctx.shadowBlur = 0

        // Check collision with player
        if (
          checkCollision(player, {
            ...powerUp,
            y: powerUp.y + powerUp.floatOffset,
          })
        ) {
          powerUp.collected = true

          // Apply power-up effect
          switch (powerUp.powerType) {
            case "shield":
              player.shield = true
              player.shieldTimer = 600 // 10 seconds
              break
            case "extraLife":
              player.lives += 1
              break
            case "scoreMultiplier":
              player.scoreMultiplier = 2
              player.multiplierTimer = 600 // 10 seconds
              break
            case "slowMotion":
              player.slowMotionTimer = 300 // 5 seconds
              break
            case "magnet":
              player.magnetRadius = 150
              player.magnetTimer = 600 // 10 seconds
              break
          }

          // Create particles
          spawnParticles(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2, powerUp.color, 15)

          // Respawn power-up after a delay
          setTimeout(() => {
            const newX = Math.random() * (canvas.width - powerUp.width)
            const newY = Math.random() * (canvas.height - powerUp.height)
            const powerUpTypes: PowerUpType[] = ["shield", "extraLife", "scoreMultiplier"]

            if (levelRef.current >= 2) {
              powerUpTypes.push("slowMotion")
            }

            if (levelRef.current >= 3) {
              powerUpTypes.push("magnet")
            }

            const newType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)]

            powerUpsRef.current[index] = createPowerUp(newX, newY, newType)
          }, 15000)
        }
      }
    })

    // Update and draw enemies
    enemies.forEach((enemy, index) => {
      // Move enemy
      if (enemy.chasePlayer && gameTimeRef.current % 30 === 0) {
        // Occasionally update direction to chase player
        const dx = player.x - enemy.x
        const dy = player.y - enemy.y
        const angle = Math.atan2(dy, dx)

        enemy.velocityX = Math.cos(angle) * enemy.speed
        enemy.velocityY = Math.sin(angle) * enemy.speed
      } else {
        // Regular bouncing movement
        if (enemy.x <= 0 || enemy.x + enemy.width >= canvas.width) {
          enemy.velocityX *= -1
        }

        if (enemy.y <= 0 || enemy.y + enemy.height >= canvas.height) {
          enemy.velocityY *= -1
        }
      }

      // Update enemy position
      enemy.x += enemy.velocityX * gameSpeed
      enemy.y += enemy.velocityY * gameSpeed

      // Pulsating size animation
      if (enemy.sizeDirection) {
        enemy.size += 0.2 * gameSpeed
        if (enemy.size >= 45) enemy.sizeDirection = false
      } else {
        enemy.size -= 0.2 * gameSpeed
        if (enemy.size <= 35) enemy.sizeDirection = true
      }

      // Draw enemy with glow effect
      ctx.shadowColor = enemy.color
      ctx.shadowBlur = 10
      ctx.fillStyle = enemy.color

      // Triangle shape
      ctx.beginPath()
      ctx.moveTo(enemy.x + enemy.width / 2, enemy.y)
      ctx.lineTo(enemy.x + enemy.size, enemy.y + enemy.size)
      ctx.lineTo(enemy.x, enemy.y + enemy.size)
      ctx.closePath()
      ctx.fill()

      ctx.shadowBlur = 0

      // Check collision with player
      if (
        checkCollision(player, {
          ...enemy,
          width: enemy.size,
          height: enemy.size,
        })
      ) {
        if (player.invincible || player.invisibilityTimer > 0 || player.color === enemy.color || player.shield) {
          // Player is invincible, invisible, matches enemy color, or has shield - enemy is defeated

          // Create explosion particles
          spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 20)

          // Respawn enemy
          enemy.x = Math.random() * (canvas.width - enemy.width)
          enemy.y = Math.random() * (canvas.height - enemy.height)
          enemy.velocityX = Math.random() * 4 - 2
          enemy.velocityY = Math.random() * 4 - 2

          // Award points
          player.score += 10 * player.scoreMultiplier

          // If player had shield, remove it
          if (player.shield && player.color !== enemy.color && !player.invincible && player.invisibilityTimer <= 0) {
            player.shield = false
            player.shieldTimer = 0
          }
        } else {
          // Player loses a life
          player.lives -= 1

          // Create particles for hit effect
          spawnParticles(player.x + player.width / 2, player.y + player.height / 2, "#ff0000", 15)

          if (player.lives <= 0) {
            // Game over
            if (gameLoop) window.cancelAnimationFrame(gameLoop)
            onGameOver(player.score)
            return
          } else {
            // Make player temporarily invincible
            player.invincible = true
            player.invincibilityTimer = 180 // 3 seconds

            // Respawn enemy
            enemy.x = Math.random() * (canvas.width - enemy.width)
            enemy.y = Math.random() * (canvas.height - enemy.height)
          }
        }
      }
    })

    // Update and draw targets
    targets.forEach((target, index) => {
      if (!target.matched) {
        // Update pulse animation
        if (target.pulseDirection) {
          target.pulseSize += 0.1 * gameSpeed
          if (target.pulseSize >= 3) target.pulseDirection = false
        } else {
          target.pulseSize -= 0.1 * gameSpeed
          if (target.pulseSize <= 0) target.pulseDirection = true
        }

        // Draw target
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
        ctx.fillRect(target.x, target.y, target.width, target.height)

        // Draw border with pulse effect
        ctx.strokeStyle = target.color
        ctx.lineWidth = 4 + target.pulseSize
        ctx.strokeRect(target.x, target.y, target.width, target.height)

        // Draw inner pattern
        ctx.fillStyle = target.color
        ctx.globalAlpha = 0.3
        ctx.fillRect(target.x + 10, target.y + 10, target.width - 20, target.height - 20)
        ctx.globalAlpha = 1.0

        // Check collision with player
        if (checkCollision(player, target)) {
          if (player.color === target.color) {
            target.matched = true

            // Award points
            player.score += target.points * player.scoreMultiplier

            // Create particles
            spawnParticles(target.x + target.width / 2, target.y + target.height / 2, target.color, 30)

            // Respawn target after a delay with a new color
            setTimeout(() => {
              const colors = ["#ff0000", "#0000ff", "#00ff00", "#ffff00", "#ff00ff"]
              const newColor = colors[Math.floor(Math.random() * colors.length)]
              const newX = Math.random() * (canvas.width - target.width)
              const newY = Math.random() * (canvas.height - target.height)
              const points = 50 * levelRef.current

              targetsRef.current[index] = createTarget(newX, newY, newColor, points)
            }, 3000)
          }
        }
      }
    })

    // Update and draw particles
    particles.forEach((particle, index) => {
      // Update particle
      particle.x += particle.velocityX * gameSpeed
      particle.y += particle.velocityY * gameSpeed
      particle.life -= 1 * gameSpeed

      // Fade out and shrink as life decreases
      const lifeRatio = particle.life / particle.maxLife
      particle.size = lifeRatio * 5

      // Draw particle
      ctx.globalAlpha = lifeRatio
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1.0

      // Remove particle if life is over
      if (particle.life <= 0) {
        particlesRef.current.splice(index, 1)
      }
    })

    // Draw player
    if (player.visible) {
      // Draw shield if active
      if (player.shield) {
        ctx.beginPath()
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2 + 10, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(0, 255, 255, 0.3)"
        ctx.fill()

        ctx.beginPath()
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2 + 10, 0, Math.PI * 2)
        ctx.strokeStyle = "rgba(0, 255, 255, 0.8)"
        ctx.lineWidth = 2
        ctx.stroke()
      }

      // Draw magnet radius if active
      if (player.magnetRadius > 0) {
        ctx.beginPath()
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.magnetRadius, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(255, 170, 0, 0.1)"
        ctx.fill()

        ctx.beginPath()
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.magnetRadius, 0, Math.PI * 2)
        ctx.strokeStyle = "rgba(255, 170, 0, 0.3)"
        ctx.setLineDash([5, 5])
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Draw player with glow effect
      ctx.shadowColor = player.color
      ctx.shadowBlur = 15
      ctx.fillStyle = player.color
      ctx.beginPath()
      ctx.arc(player.x + player.width / 2, player.y + player.height / 2, player.width / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // Add eyes to make it look like a blob
      ctx.fillStyle = "#000"
      ctx.beginPath()
      ctx.arc(player.x + player.width / 2 - 8, player.y + player.height / 2 - 5, 5, 0, Math.PI * 2)
      ctx.fill()

      ctx.beginPath()
      ctx.arc(player.x + player.width / 2 + 8, player.y + player.height / 2 - 5, 5, 0, Math.PI * 2)
      ctx.fill()

      // Add mouth based on whether player has power-ups
      if (player.shield || player.scoreMultiplier > 1 || player.magnetRadius > 0 || player.slowMotionTimer > 0) {
        // Happy mouth
        ctx.beginPath()
        ctx.arc(player.x + player.width / 2, player.y + player.height / 2 + 5, 8, 0, Math.PI)
        ctx.stroke()
      } else {
        // Neutral mouth
        ctx.beginPath()
        ctx.moveTo(player.x + player.width / 2 - 5, player.y + player.height / 2 + 5)
        ctx.lineTo(player.x + player.width / 2 + 5, player.y + player.height / 2 + 5)
        ctx.stroke()
      }
    }

    // Draw UI
    // Draw score
    ctx.fillStyle = "#ffffff"
    ctx.font = "24px Arial"
    ctx.textAlign = "left"
    ctx.fillText(`Score: ${player.score}`, 20, 40)

    // Draw level
    ctx.fillText(`Level: ${levelRef.current}`, 20, 70)

    // Draw lives
    ctx.fillText(`Lives: `, 20, 100)
    for (let i = 0; i < player.lives; i++) {
      ctx.fillStyle = "#ff6666"
      ctx.beginPath()
      const heartX = 100 + i * 30
      const heartY = 95
      const heartSize = 10

      ctx.moveTo(heartX, heartY + heartSize / 4)
      ctx.bezierCurveTo(
        heartX,
        heartY - heartSize / 2,
        heartX - heartSize,
        heartY - heartSize / 2,
        heartX - heartSize,
        heartY + heartSize / 4,
      )
      ctx.bezierCurveTo(heartX - heartSize, heartY + heartSize, heartX, heartY + heartSize, heartX, heartY + heartSize)
      ctx.bezierCurveTo(
        heartX,
        heartY + heartSize,
        heartX + heartSize,
        heartY + heartSize,
        heartX + heartSize,
        heartY + heartSize / 4,
      )
      ctx.bezierCurveTo(
        heartX + heartSize,
        heartY - heartSize / 2,
        heartX,
        heartY - heartSize / 2,
        heartX,
        heartY + heartSize / 4,
      )
      ctx.fill()
    }

    // Draw current color name and ability
    let colorName = "White"
    let abilityText = ""

    if (player.color === "#ff0000") {
      colorName = "Red"
      abilityText = "Speed Boost"
    } else if (player.color === "#0000ff") {
      colorName = "Blue"
      abilityText = "Super Jump"
    } else if (player.color === "#00ff00") {
      colorName = "Green"
      abilityText = "Invisibility"
    } else if (player.color === "#ffff00") {
      colorName = "Yellow"
      abilityText = "Shield"
    } else if (player.color === "#ff00ff") {
      colorName = "Purple"
      abilityText = "Score x2"
    }

    ctx.fillStyle = player.color
    ctx.fillText(`Color: ${colorName}`, 20, 130)
    ctx.fillStyle = "#ffffff"
    ctx.font = "18px Arial"
    ctx.fillText(abilityText, 20, 155)

    // Draw active power-ups
    let powerUpY = 185
    ctx.font = "18px Arial"

    if (player.shield && player.color !== "#ffff00") {
      ctx.fillStyle = "#00ffff"
      ctx.fillText(`Shield: ${Math.ceil(player.shieldTimer / 60)}s`, 20, powerUpY)
      powerUpY += 25
    }

    if (player.scoreMultiplier > 1 && player.color !== "#ff00ff") {
      ctx.fillStyle = "#ff00ff"
      ctx.fillText(`Score x${player.scoreMultiplier}: ${Math.ceil(player.multiplierTimer / 60)}s`, 20, powerUpY)
      powerUpY += 25
    }

    if (player.magnetRadius > 0) {
      ctx.fillStyle = "#ffaa00"
      ctx.fillText(`Magnet: ${Math.ceil(player.magnetTimer / 60)}s`, 20, powerUpY)
      powerUpY += 25
    }

    if (player.slowMotionTimer > 0) {
      ctx.fillStyle = "#aaaaff"
      ctx.fillText(`Slow Motion: ${Math.ceil(player.slowMotionTimer / 60)}s`, 20, powerUpY)
      powerUpY += 25
    }

    if (player.invisibilityTimer > 0 && player.color !== "#00ff00") {
      ctx.fillStyle = "#00ff00"
      ctx.fillText(`Invisibility: ${Math.ceil(player.invisibilityTimer / 60)}s`, 20, powerUpY)
    }

    // Draw level progress
    const progressWidth = 200
    const progressHeight = 10
    const progressX = canvas.width - progressWidth - 20
    const progressY = 30
    const progress = player.score / levelScoreThresholdRef.current

    // Draw progress bar background
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
    ctx.fillRect(progressX, progressY, progressWidth, progressHeight)

    // Draw progress
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
    ctx.fillRect(progressX, progressY, progressWidth * Math.min(progress, 1), progressHeight)

    // Draw progress text
    ctx.fillStyle = "#ffffff"
    ctx.font = "16px Arial"
    ctx.textAlign = "right"
    ctx.fillText(`Next Level: ${player.score}/${levelScoreThresholdRef.current}`, canvas.width - 20, progressY + 25)

    // Draw mobile controls if on touch device
    if ("ontouchstart" in window) {
      // Left button
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
      ctx.fillRect(20, canvas.height - 100, 80, 80)
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "center"
      ctx.fillText("←", 60, canvas.height - 60)

      // Right button
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
      ctx.fillRect(canvas.width - 100, canvas.height - 100, 80, 80)
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "center"
      ctx.fillText("→", canvas.width - 60, canvas.height - 60)

      // Jump button
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)"
      ctx.fillRect(canvas.width / 2 - 40, canvas.height - 100, 80, 80)
      ctx.fillStyle = "#ffffff"
      ctx.textAlign = "center"
      ctx.fillText("Jump", canvas.width / 2, canvas.height - 60)
    }

    // Continue game loop
    setGameLoop(window.requestAnimationFrame(gameUpdate))
  }

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="border-4 border-slate-700 rounded-lg shadow-lg" width={800} height={600} />
      <div className="absolute top-4 right-4 bg-slate-800/80 p-3 rounded-lg backdrop-blur-sm text-sm">
        <p>Arrow keys or WASD to move</p>
        <p>Match colors with targets</p>
        <p>Collect power-ups for bonuses</p>
      </div>
    </div>
  )
}


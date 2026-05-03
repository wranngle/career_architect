'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
  life: number
  maxLife: number
}

interface ParticleSystemProps {
  particleCount?: number
  colors?: string[]
  className?: string
}

export const ParticleSystem = ({ 
  particleCount = 100, 
  // Wranngle palette: wviolet-500, sunset-500, wviolet-600, wviolet-400
  colors = ['#cf3c69', '#ff5f00', '#b92a56', '#dd6186'],
  className = '' 
}: ParticleSystemProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particles = useRef<Particle[]>([])
  const animationRef = useRef<number>()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    const createParticle = (): Particle => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.6 + 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      maxLife: Math.random() * 200 + 100
    })

    const initParticles = () => {
      particles.current = Array.from({ length: particleCount }, createParticle)
    }

    const updateParticle = (particle: Particle) => {
      particle.x += particle.vx
      particle.y += particle.vy
      particle.life++

      // Boundary checking with wrapping
      if (particle.x < 0) particle.x = canvas.width
      if (particle.x > canvas.width) particle.x = 0
      if (particle.y < 0) particle.y = canvas.height
      if (particle.y > canvas.height) particle.y = 0

      // Life cycle opacity
      const lifeRatio = particle.life / particle.maxLife
      if (lifeRatio < 0.1) {
        particle.opacity = (lifeRatio / 0.1) * 0.6
      } else if (lifeRatio > 0.9) {
        particle.opacity = ((1 - lifeRatio) / 0.1) * 0.6
      }

      // Reset particle when it dies
      if (particle.life >= particle.maxLife) {
        Object.assign(particle, createParticle())
      }
    }

    const drawParticle = (particle: Particle) => {
      ctx.save()
      ctx.globalAlpha = particle.opacity
      ctx.fillStyle = particle.color
      ctx.beginPath()
      
      // Create glowing effect
      const gradient = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size * 2
      )
      gradient.addColorStop(0, particle.color)
      gradient.addColorStop(1, 'transparent')
      
      ctx.fillStyle = gradient
      ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2)
      ctx.fill()
      
      // Inner bright core
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fill()
      
      ctx.restore()
    }

    const drawConnections = () => {
      const maxDistance = 120
      
      for (let i = 0; i < particles.current.length; i++) {
        for (let j = i + 1; j < particles.current.length; j++) {
          const p1 = particles.current[i]
          const p2 = particles.current[j]
          
          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.15
            
            ctx.save()
            ctx.globalAlpha = opacity
            ctx.strokeStyle = '#cf3c69'
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
            ctx.restore()
          }
        }
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      // Update and draw particles
      particles.current.forEach(particle => {
        updateParticle(particle)
        drawParticle(particle)
      })
      
      // Draw connections between nearby particles
      drawConnections()
      
      animationRef.current = requestAnimationFrame(animate)
    }

    // Initialize
    resizeCanvas()
    initParticles()
    animate()

    // Handle resize
    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [particleCount, colors])

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 1 }}
    />
  )
}

// Advanced cursor follower component
export const CursorFollower = () => {
  const cursorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cursor = cursorRef.current
    if (!cursor) return

    const handleMouseMove = (e: MouseEvent) => {
      cursor.style.left = e.clientX + 'px'
      cursor.style.top = e.clientY + 'px'
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <motion.div
      ref={cursorRef}
      className="fixed w-8 h-8 pointer-events-none mix-blend-difference z-50"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="w-full h-full bg-white rounded-full opacity-30 blur-sm" />
      <div className="absolute inset-2 bg-white rounded-full" />
    </motion.div>
  )
}

// Floating geometric shapes
export const FloatingShapes = () => {
  const shapes = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    delay: i * 0.5,
    duration: 10 + Math.random() * 5,
    size: 20 + Math.random() * 40,
    left: Math.random() * 100,
    top: Math.random() * 100,
  }))

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      {shapes.map((shape) => (
        <motion.div
          key={shape.id}
          className="absolute opacity-5"
          style={{
            left: `${shape.left}%`,
            top: `${shape.top}%`,
            width: shape.size,
            height: shape.size,
          }}
          animate={{
            y: [-20, 20, -20],
            x: [-10, 10, -10],
            rotate: [0, 180, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: shape.duration,
            repeat: Infinity,
            delay: shape.delay,
            ease: "easeInOut",
          }}
        >
          {shape.id % 3 === 0 && (
            <div className="w-full h-full border-2 border-wviolet-400 rotate-45" />
          )}
          {shape.id % 3 === 1 && (
            <div className="w-full h-full bg-gradient-to-br from-sunset-400 to-wviolet-400 rounded-full" />
          )}
          {shape.id % 3 === 2 && (
            <div className="w-full h-full bg-gradient-to-br from-wviolet-400 to-sunset-400 transform rotate-45 rounded-lg" />
          )}
        </motion.div>
      ))}
    </div>
  )
}
'use client'

import React, { useEffect, useRef, useState, useMemo } from 'react'
import { motion } from 'framer-motion'

// Neural Network Background with animated connections
export const NeuralNetworkBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  const nodes = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
      y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      pulse: Math.random() * Math.PI * 2,
    }))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    let animationFrame: number
    let time = 0

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      time += 0.02

      // Update and draw nodes
      nodes.forEach((node, i) => {
        // Update position
        node.x += node.vx
        node.y += node.vy
        node.pulse += 0.1

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1

        // Keep in bounds
        node.x = Math.max(0, Math.min(canvas.width, node.x))
        node.y = Math.max(0, Math.min(canvas.height, node.y))

        // Draw connections to nearby nodes
        nodes.slice(i + 1).forEach(otherNode => {
          const dx = node.x - otherNode.x
          const dy = node.y - otherNode.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 150) {
            const opacity = 1 - distance / 150
            const gradient = ctx.createLinearGradient(node.x, node.y, otherNode.x, otherNode.y)
            gradient.addColorStop(0, `rgba(147, 51, 234, ${opacity * 0.3})`) // purple
            gradient.addColorStop(0.5, `rgba(59, 130, 246, ${opacity * 0.4})`) // blue
            gradient.addColorStop(1, `rgba(236, 72, 153, ${opacity * 0.3})`) // pink

            ctx.strokeStyle = gradient
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(otherNode.x, otherNode.y)
            ctx.stroke()

            // Data packet animation
            const progress = (Math.sin(time + i) + 1) / 2
            const packetX = node.x + (otherNode.x - node.x) * progress
            const packetY = node.y + (otherNode.y - node.y) * progress
            
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity * 0.8})`
            ctx.beginPath()
            ctx.arc(packetX, packetY, 2, 0, Math.PI * 2)
            ctx.fill()
          }
        })

        // Draw node
        const pulseIntensity = Math.sin(node.pulse) * 0.3 + 0.7
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 8)
        gradient.addColorStop(0, `rgba(147, 51, 234, ${pulseIntensity})`)
        gradient.addColorStop(0.5, `rgba(59, 130, 246, ${pulseIntensity * 0.7})`)
        gradient.addColorStop(1, `rgba(147, 51, 234, 0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2)
        ctx.fill()

        // Inner core
        ctx.fillStyle = `rgba(255, 255, 255, ${pulseIntensity})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2)
        ctx.fill()
      })

      animationFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [nodes])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-20"
      style={{ background: 'transparent' }}
    />
  )
}

// Quantum Particle Field with 3D perspective
export const QuantumParticleField: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  
  const particles = useMemo(() => {
    return Array.from({ length: 200 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      z: Math.random() * 100,
      size: Math.random() * 3 + 1,
      speed: Math.random() * 0.5 + 0.1,
      hue: Math.random() * 60 + 180, // cyan to purple range
    }))
  }, [])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-30"
      style={{ perspective: '1000px' }}
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: particle.size,
            height: particle.size,
            background: `radial-gradient(circle, hsl(${particle.hue}, 100%, 70%) 0%, transparent 70%)`,
            boxShadow: `0 0 ${particle.size * 2}px hsl(${particle.hue}, 100%, 70%)`,
          }}
          animate={{
            x: [
              `${particle.x}vw`,
              `${(particle.x + 50) % 100}vw`,
              `${particle.x}vw`
            ],
            y: [
              `${particle.y}vh`,
              `${(particle.y + 30) % 100}vh`,
              `${particle.y}vh`
            ],
            rotateX: [0, 360],
            rotateY: [0, -360],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 20 + particle.speed * 10,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  )
}

// DNA Helix Scroll Animation
interface DNAHelixScrollProps {
  className?: string
  helixHeight?: number
}

export const DNAHelixScroll: React.FC<DNAHelixScrollProps> = ({ 
  className = '', 
  helixHeight = 400 
}) => {
  const helixPairs = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      y: (i / 19) * helixHeight,
      leftX: Math.sin((i / 19) * Math.PI * 4) * 30,
      rightX: Math.sin((i / 19) * Math.PI * 4 + Math.PI) * 30,
    }))
  }, [helixHeight])

  return (
    <div className={`relative ${className}`} style={{ height: helixHeight }}>
      {/* Left strand */}
      <motion.div
        className="absolute left-0 top-0"
        animate={{ rotateZ: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        {helixPairs.map((pair, i) => (
          <motion.div
            key={`left-${pair.id}`}
            className="absolute w-3 h-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full"
            style={{
              left: 50 + pair.leftX,
              top: pair.y,
              boxShadow: '0 0 10px rgba(34, 211, 238, 0.6)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
      </motion.div>

      {/* Right strand */}
      <motion.div
        className="absolute right-0 top-0"
        animate={{ rotateZ: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        {helixPairs.map((pair, i) => (
          <motion.div
            key={`right-${pair.id}`}
            className="absolute w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full"
            style={{
              left: 50 + pair.rightX,
              top: pair.y,
              boxShadow: '0 0 10px rgba(147, 51, 234, 0.6)',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.1 + 0.5,
            }}
          />
        ))}
      </motion.div>

      {/* Connecting base pairs */}
      {helixPairs.map((pair, i) => (
        <motion.div
          key={`connection-${pair.id}`}
          className="absolute h-0.5 bg-gradient-to-r from-cyan-400 via-white to-purple-400"
          style={{
            left: 50 + Math.min(pair.leftX, pair.rightX),
            top: pair.y + 6,
            width: Math.abs(pair.rightX - pair.leftX),
            boxShadow: '0 0 5px rgba(255, 255, 255, 0.5)',
          }}
          animate={{
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  )
}

// Cyberpunk Text with glitch effects
interface CyberpunkTextProps {
  text: string
  className?: string
  glitchIntensity?: number
  neonColor?: string
}

export const CyberpunkText: React.FC<CyberpunkTextProps> = ({
  text,
  className = '',
  glitchIntensity = 0.2,
  neonColor = '#00ffff'
}) => {
  const [isGlitching, setIsGlitching] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() < glitchIntensity) {
        setIsGlitching(true)
        setTimeout(() => setIsGlitching(false), 150)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [glitchIntensity])

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Main text with neon glow */}
      <motion.span
        className="relative z-10 font-bold"
        style={{
          color: neonColor,
          textShadow: `
            0 0 5px ${neonColor},
            0 0 10px ${neonColor},
            0 0 15px ${neonColor},
            0 0 20px ${neonColor}
          `,
        }}
        animate={isGlitching ? {
          x: [0, -2, 2, 0],
          textShadow: [
            `0 0 5px ${neonColor}`,
            `2px 0 5px #ff00ff, -2px 0 5px #00ffff`,
            `0 0 5px ${neonColor}`,
          ],
        } : {}}
        transition={{ duration: 0.1 }}
      >
        {text}
      </motion.span>

      {/* Glitch layers */}
      {isGlitching && (
        <>
          <span
            className="absolute top-0 left-0 font-bold opacity-80"
            style={{
              color: '#ff00ff',
              transform: 'translateX(-2px)',
              clipPath: 'polygon(0 0, 100% 0, 100% 45%, 0 45%)',
            }}
          >
            {text}
          </span>
          <span
            className="absolute top-0 left-0 font-bold opacity-80"
            style={{
              color: '#00ffff',
              transform: 'translateX(2px)',
              clipPath: 'polygon(0 55%, 100% 55%, 100% 100%, 0 100%)',
            }}
          >
            {text}
          </span>
        </>
      )}

      {/* Neon border */}
      <div
        className="absolute inset-0 border-2 border-transparent animate-pulse"
        style={{
          borderImage: 'linear-gradient(45deg, #00ffff, #ff00ff, #00ffff) 1',
          boxShadow: `
            inset 0 0 10px rgba(0, 255, 255, 0.3),
            0 0 10px rgba(255, 0, 255, 0.3)
          `,
        }}
      />
    </div>
  )
}

// Holographic Data Stream
interface HolographicDataStreamProps {
  streamCount?: number
  className?: string
}

export const HolographicDataStream: React.FC<HolographicDataStreamProps> = ({
  streamCount = 6,
  className = ''
}) => {
  const streams = useMemo(() => {
    return Array.from({ length: streamCount }, (_, i) => ({
      id: i,
      x: (i / (streamCount - 1)) * 100,
      delay: i * 0.5,
      data: Array.from({ length: 20 }, () => 
        Math.random().toString(36).substring(2, 8)
      ),
    }))
  }, [streamCount])

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {streams.map((stream) => (
        <div
          key={stream.id}
          className="absolute top-0 h-full flex flex-col justify-around"
          style={{ left: `${stream.x}%` }}
        >
          {stream.data.map((data, dataIndex) => (
            <motion.div
              key={dataIndex}
              className="text-xs font-mono opacity-60"
              style={{
                color: `hsl(${180 + dataIndex * 10}, 100%, 70%)`,
                textShadow: '0 0 5px currentColor',
              }}
              initial={{ opacity: 0, y: -20 }}
              animate={{
                opacity: [0, 0.8, 0],
                y: ['0vh', '100vh'],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                delay: stream.delay + dataIndex * 0.2,
                ease: 'linear',
              }}
            >
              {data}
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  )
}

// Matrix Rain Effect
interface MatrixRainProps {
  density?: number
  className?: string
}

export const MatrixRain: React.FC<MatrixRainProps> = ({
  density = 20,
  className = ''
}) => {
  const drops = useMemo(() => {
    return Array.from({ length: density }, (_, i) => ({
      id: i,
      x: (i / density) * 100,
      chars: Array.from({ length: 15 }, () => 
        String.fromCharCode(0x30A0 + Math.random() * 96)
      ),
    }))
  }, [density])

  return (
    <div className={`fixed inset-0 pointer-events-none z-0 ${className}`}>
      {drops.map((drop) => (
        <div
          key={drop.id}
          className="absolute top-0 flex flex-col"
          style={{ left: `${drop.x}%` }}
        >
          {drop.chars.map((char, charIndex) => (
            <motion.span
              key={charIndex}
              className="text-green-400 font-mono text-sm opacity-60"
              style={{
                textShadow: '0 0 5px #00ff00',
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0, 1, 0],
                y: ['0vh', '100vh'],
              }}
              transition={{
                duration: 10,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: 'linear',
              }}
            >
              {char}
            </motion.span>
          ))}
        </div>
      ))}
    </div>
  )
}

// Pulsing Energy Field
export const PulsingEnergyField: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Energy waves */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute inset-0 border border-purple-500/20 rounded-full"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          }}
          animate={{
            scale: [0, 4],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            delay: i * 1.2,
            ease: 'easeOut',
          }}
        />
      ))}
      
      {/* Central energy core */}
      <motion.div
        className="absolute left-1/2 top-1/2 w-2 h-2 bg-purple-400 rounded-full"
        style={{
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 20px #a855f7, 0 0 40px #a855f7',
        }}
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.8, 1, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      />
    </div>
  )
}
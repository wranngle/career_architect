'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

// Liquid morphing background with WebGL shaders
export const LiquidMorphBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Liquid morph animation variables
    let time = 0
    const colors = ['#8b5cf6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899']
    
    const animate = () => {
      time += 0.01
      
      // Clear canvas with gradient
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, 'rgba(139, 92, 246, 0.03)')
      gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.02)')
      gradient.addColorStop(1, 'rgba(168, 85, 247, 0.03)')
      
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Create liquid morphing shapes
      for (let i = 0; i < 5; i++) {
        const x = canvas.width * 0.5 + Math.sin(time + i) * 200
        const y = canvas.height * 0.5 + Math.cos(time + i * 0.7) * 150
        const radius = 80 + Math.sin(time * 2 + i) * 30
        
        // Create morphing gradient
        const morphGradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2)
        morphGradient.addColorStop(0, colors[i] + '15')
        morphGradient.addColorStop(0.6, colors[i] + '08')
        morphGradient.addColorStop(1, 'transparent')
        
        ctx.fillStyle = morphGradient
        ctx.beginPath()
        
        // Create liquid blob shape
        const points = 8
        for (let j = 0; j <= points; j++) {
          const angle = (j / points) * Math.PI * 2
          const r = radius + Math.sin(time * 3 + j + i) * 20
          const px = x + Math.cos(angle) * r
          const py = y + Math.sin(angle) * r
          
          if (j === 0) {
            ctx.moveTo(px, py)
          } else {
            const prevAngle = ((j - 1) / points) * Math.PI * 2
            const prevR = radius + Math.sin(time * 3 + (j - 1) + i) * 20
            const prevX = x + Math.cos(prevAngle) * prevR
            const prevY = y + Math.sin(prevAngle) * prevR
            
            const cpx = (prevX + px) / 2 + Math.sin(time + j) * 10
            const cpy = (prevY + py) / 2 + Math.cos(time + j) * 10
            
            ctx.quadraticCurveTo(cpx, cpy, px, py)
          }
        }
        
        ctx.closePath()
        ctx.fill()
      }
      
      requestAnimationFrame(animate)
    }
    
    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}

// Advanced 3D card with glassmorphism
export const GlassmorphismCard = ({ 
  children, 
  className = '',
  intensity = 0.1 
}: {
  children: React.ReactNode
  className?: string
  intensity?: number
}) => {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [30, -30]))
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-30, 30]))
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    mouseX.set(e.clientX - centerX)
    mouseY.set(e.clientY - centerY)
  }
  
  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <motion.div
      className={`relative perspective-1000 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative p-8 rounded-3xl backdrop-blur-xl bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden"
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-white/10 dark:to-transparent rounded-3xl" />
        
        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500"
          style={{
            background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
            animation: 'shimmer 2s infinite',
          }}
        />
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
        
        {/* 3D depth shadow */}
        <div className="absolute inset-0 rounded-3xl shadow-inner opacity-30" 
             style={{ transform: 'translateZ(-10px)' }} />
      </motion.div>
    </motion.div>
  )
}

// Premium interactive button with liquid effects
export const LiquidButton = ({ 
  children, 
  onClick,
  className = '',
  variant = 'primary' 
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  variant?: 'primary' | 'secondary'
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([])
  
  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const newRipple = { id: Date.now(), x, y }
    setRipples(prev => [...prev, newRipple])
    
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id))
    }, 1000)
    
    onClick?.()
  }

  const baseClasses = variant === 'primary' 
    ? 'bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white'
    : 'bg-white/10 backdrop-blur-xl border border-white/20 text-gray-800 dark:text-white'

  return (
    <motion.button
      className={`relative px-8 py-4 rounded-2xl font-semibold text-lg overflow-hidden transition-all duration-300 ${baseClasses} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(139, 92, 246, 0.3)' }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Liquid background animation */}
      <motion.div
        className="absolute inset-0 opacity-0"
        animate={{
          opacity: isHovered ? 1 : 0,
          background: [
            'linear-gradient(45deg, #8b5cf6, #3b82f6)',
            'linear-gradient(90deg, #3b82f6, #6366f1)',
            'linear-gradient(135deg, #6366f1, #8b5cf6)',
            'linear-gradient(180deg, #8b5cf6, #3b82f6)'
          ]
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <motion.div
          key={ripple.id}
          className="absolute rounded-full bg-white/30"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
          }}
          animate={{
            scale: [0, 4],
            opacity: [0.8, 0],
          }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      ))}
      
      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: '-100%', skewX: -45 }}
        animate={isHovered ? { x: '200%' } : { x: '-100%' }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}

// Neumorphism component
export const NeumorphismCard = ({ 
  children, 
  className = '',
  pressed = false 
}: {
  children: React.ReactNode
  className?: string
  pressed?: boolean
}) => {
  return (
    <motion.div
      className={`relative p-6 rounded-3xl transition-all duration-300 ${className}`}
      style={{
        background: pressed 
          ? 'linear-gradient(145deg, #e0e0e0, #ffffff)' 
          : 'linear-gradient(145deg, #ffffff, #e0e0e0)',
        boxShadow: pressed
          ? 'inset 8px 8px 16px #d1d1d1, inset -8px -8px 16px #ffffff'
          : '8px 8px 16px #d1d1d1, -8px -8px 16px #ffffff'
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.div>
  )
}

// Advanced text reveal animation
export const TextRevealAnimation = ({ 
  text, 
  className = '',
  delay = 0 
}: {
  text: string
  className?: string
  delay?: number
}) => {
  const words = text.split(' ')
  
  return (
    <div className={`overflow-hidden ${className}`}>
      {words.map((word, index) => (
        <motion.span
          key={index}
          className="inline-block mr-2"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{
            duration: 0.8,
            delay: delay + index * 0.1,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
        >
          {word}
        </motion.span>
      ))}
    </div>
  )
}
'use client'

import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'

// Advanced parallax component
export const ParallaxElement = ({ 
  children, 
  speed = 0.5, 
  className = '',
  direction = 'vertical' 
}: {
  children: React.ReactNode
  speed?: number
  className?: string
  direction?: 'vertical' | 'horizontal'
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  })
  
  const y = useTransform(scrollYProgress, [0, 1], 
    direction === 'vertical' ? [-100 * speed, 100 * speed] : [0, 0]
  )
  const x = useTransform(scrollYProgress, [0, 1], 
    direction === 'horizontal' ? [-100 * speed, 100 * speed] : [0, 0]
  )
  
  return (
    <motion.div ref={ref} style={{ y, x }} className={className}>
      {children}
    </motion.div>
  )
}

// Magnetic hover effect
export const MagneticHover = ({ 
  children, 
  strength = 0.3,
  className = '' 
}: {
  children: React.ReactNode
  strength?: number
  className?: string
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const deltaX = (e.clientX - centerX) * strength
    const deltaY = (e.clientY - centerY) * strength
    
    setPosition({ x: deltaX, y: deltaY })
  }
  
  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
  }
  
  return (
    <motion.div
      ref={ref}
      className={className}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </motion.div>
  )
}
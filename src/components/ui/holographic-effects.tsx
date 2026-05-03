'use client';

import {useEffect, useRef, useState} from 'react';
import {
  motion, useMotionValue, useSpring, useTransform, AnimatePresence,
} from 'framer-motion';

// 3D Holographic Text Effect
export const HolographicText = ({
  text,
  className = '',
  intensity = 1,
  speed = 1,
}: {
  text: string;
  className?: string;
  intensity?: number;
  speed?: number;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [15, -15]));
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-15, 15]));
  const glowIntensity = useSpring(isHovered ? 1 : 0.3);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    mouseX.set((e.clientX - centerX) * intensity);
    mouseY.set((e.clientY - centerY) * intensity);
  };

  return (
    <motion.div
      className={`relative perspective-1000 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        mouseX.set(0);
        mouseY.set(0);
      }}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className='relative'
      >
        {/* Base text */}
        <motion.span
          className='relative z-10 bg-gradient-to-r from-wviolet-400 via-sunset-400 to-sunset-300 bg-clip-text text-transparent font-bold'
          style={{
            filter: `drop-shadow(0 0 ${glowIntensity.get() * 20}px rgba(207, 60, 105, 0.8))`,
            textShadow: '0 0 30px rgba(207, 60, 105, 0.5)',
          }}
        >
          {text}
        </motion.span>

        {/* Holographic layers */}
        {Array.from({length: 3}).map((_, i) => (
          <motion.span
            key={i}
            className='absolute inset-0 bg-gradient-to-r from-wviolet-400 via-sunset-400 to-sunset-300 bg-clip-text text-transparent font-bold opacity-30'
            style={{
              transform: `translateZ(${-10 * (i + 1)}px) translateX(${i * 2}px)`,
              filter: `blur(${i}px)`,
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 2 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          >
            {text}
          </motion.span>
        ))}

        {/* Scanning line effect */}
        <motion.div
          className='absolute inset-0 bg-gradient-to-r from-transparent via-sunset-300/20 to-transparent'
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 3 * speed,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{mixBlendMode: 'screen'}}
        />
      </motion.div>
    </motion.div>
  );
};

// Advanced Loading Animation
export const PremiumLoader = ({
  isLoading = true,
  size = 60,
  color = '#cf3c69',
}: {
  isLoading?: boolean;
  size?: number;
  color?: string;
}) => (
  <AnimatePresence>
    {isLoading && (
      <motion.div
        className='fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/20'
        initial={{opacity: 0}}
        animate={{opacity: 1}}
        exit={{opacity: 0}}
      >
        <div className='relative'>
          {/* Outer rotating ring */}
          <motion.div
            className='absolute inset-0 rounded-full border-4 border-transparent'
            style={{
              width: size,
              height: size,
              borderTopColor: color,
              borderRightColor: `${color}80`,
            }}
            animate={{rotate: 360}}
            transition={{duration: 1, repeat: Infinity, ease: 'linear'}}
          />

          {/* Inner pulsing core */}
          <motion.div
            className='rounded-full'
            style={{
              width: size * 0.6,
              height: size * 0.6,
              backgroundColor: color,
              margin: size * 0.2,
            }}
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{duration: 1.5, repeat: Infinity}}
          />

          {/* Orbiting particles */}
          {Array.from({length: 3}).map((_, i) => (
            <motion.div
              key={i}
              className='absolute w-2 h-2 rounded-full'
              style={{
                backgroundColor: color,
                top: '50%',
                left: '50%',
                transformOrigin: `${size * 0.4}px 0px`,
              }}
              animate={{rotate: 360}}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
                delay: i * 0.6,
              }}
            />
          ))}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// Advanced Morphing Button
export const MorphingButton = ({
  children,
  onClick,
  className = '',
  morphColor = '#cf3c69',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  morphColor?: string;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [clickPosition, setClickPosition] = useState({x: 0, y: 0});
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setClickPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsClicked(true);
    setTimeout(() => {
      setIsClicked(false);
    }, 600);
    onClick?.();
  };

  return (
    <motion.button
      className={`relative overflow-hidden px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${className}`}
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      onClick={handleClick}
      style={{
        background: isHovered
          ? `linear-gradient(45deg, ${morphColor}, #ff5f00, ${morphColor})`
          : `linear-gradient(45deg, ${morphColor}cc, #ff5f00cc)`,
      }}
      whileHover={{scale: 1.05}}
      whileTap={{scale: 0.95}}
    >
      {/* Morphing background */}
      <motion.div
        className='absolute inset-0'
        animate={isHovered
          ? {
            background: [
              `radial-gradient(circle at 20% 80%, ${morphColor} 0%, transparent 50%)`,
              'radial-gradient(circle at 80% 20%, #ff5f00 0%, transparent 50%)',
              `radial-gradient(circle at 40% 40%, ${morphColor} 0%, transparent 50%)`,
            ],
          }
          : {}}
        transition={{duration: 2, repeat: Infinity}}
      />

      {/* Click ripple effect */}
      {isClicked && (
        <motion.div
          className='absolute rounded-full bg-white/30'
          style={{
            left: clickPosition.x - 50,
            top: clickPosition.y - 50,
            width: 100,
            height: 100,
          }}
          initial={{scale: 0, opacity: 1}}
          animate={{scale: 3, opacity: 0}}
          transition={{duration: 0.6, ease: 'easeOut'}}
        />
      )}

      {/* Liquid edge effect */}
      <motion.div
        className='absolute inset-0 rounded-2xl'
        style={{
          background: `linear-gradient(45deg, transparent, ${morphColor}40, transparent)`,
          filter: 'blur(1px)',
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{duration: 4, repeat: Infinity, ease: 'linear'}}
      />

      <span className='relative z-10 text-white'>{children}</span>
    </motion.button>
  );
};

// 3D Floating Icon
export const FloatingIcon3D = ({
  children,
  className = '',
  floatIntensity = 1,
}: {
  children: React.ReactNode;
  className?: string;
  floatIntensity?: number;
}) => {
  const [mousePosition, setMousePosition] = useState({x: 0, y: 0});

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    setMousePosition({
      x: (e.clientX - centerX) * 0.1 * floatIntensity,
      y: (e.clientY - centerY) * 0.1 * floatIntensity,
    });
  };

  return (
    <motion.div
      className={`relative perspective-1000 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        setMousePosition({x: 0, y: 0});
      }}
    >
      <motion.div
        animate={{
          y: [-5, 5, -5],
          rotateX: [0, 5, 0],
          rotateY: [0, -5, 0],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          transform: `translate3d(${mousePosition.x}px, ${mousePosition.y}px, 20px)`,
          transformStyle: 'preserve-3d',
        }}
        whileHover={{
          scale: 1.1,
          rotateY: 15,
          rotateX: -10,
        }}
      >
        {/* Main icon */}
        <div className='relative z-10'>
          {children}
        </div>

        {/* 3D shadow */}
        <motion.div
          className='absolute inset-0 opacity-20 blur-sm'
          style={{
            transform: 'translateZ(-10px) translateY(10px)',
            filter: 'blur(4px)',
          }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

'use client'

import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Brain, 
  Target, 
  Shield, 
  Upload, 
  Link, 
  Zap, 
  Star,
  ArrowRight,
  CheckCircle,
  Sparkles,
  TrendingUp,
  Users,
  Award,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ParticleSystem, CursorFollower, FloatingShapes } from '@/components/ui/particle-system'
import { ParallaxElement, MagneticHover } from '@/components/ui/scroll-animations'
import { 
  LiquidMorphBackground, 
  GlassmorphismCard, 
  LiquidButton, 
  NeumorphismCard,
  TextRevealAnimation 
} from '@/components/ui/ultra-advanced-effects'
import { 
  HolographicText, 
  PremiumLoader, 
  MorphingButton,
  FloatingIcon3D 
} from '@/components/ui/holographic-effects'
import {
  NeuralNetworkBackground,
  QuantumParticleField,
  DNAHelixScroll,
  CyberpunkText,
  HolographicDataStream,
  MatrixRain,
  PulsingEnergyField
} from '@/components/ui/extreme-effects'

// Advanced background components
const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient mesh */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20" />
      
      {/* Floating orbs */}
      <motion.div
        className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-purple-400/20 to-blue-600/20 rounded-full blur-3xl"
        animate={{
          x: [0, 50, 0],
          y: [0, -50, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div
        className="absolute top-1/2 -left-32 w-80 h-80 bg-gradient-to-br from-blue-400/15 to-indigo-600/15 rounded-full blur-3xl"
        animate={{
          x: [0, -30, 0],
          y: [0, 40, 0],
          scale: [1, 0.9, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* Geometric patterns */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
        <div className="absolute top-20 left-20 w-4 h-4 border border-purple-500 rotate-45" />
        <div className="absolute top-40 right-32 w-6 h-6 border border-blue-500 rounded-full" />
        <div className="absolute bottom-32 left-1/3 w-3 h-3 bg-indigo-500 rounded-full" />
        <div className="absolute bottom-20 right-20 w-5 h-5 border border-purple-500" />
      </div>
    </div>
  )
}

// Magnetic button effect
const MagneticButton = ({ children, className, ...props }: any) => {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const deltaX = e.clientX - centerX
    const deltaY = e.clientY - centerY
    
    setPosition({ x: deltaX * 0.15, y: deltaY * 0.15 })
  }

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 })
    setIsHovered(false)
  }

  return (
    <motion.div
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <Button
        className={cn(
          "relative overflow-hidden group bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 border-0 text-white font-semibold px-8 py-4 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300",
          className
        )}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.6 }}
        />
        <span className="relative z-10 flex items-center gap-2">
          {children}
        </span>
      </Button>
    </motion.div>
  )
}

// Animated text reveal
const AnimatedText = ({ children, className, delay = 0 }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Floating card component
const FloatingCard = ({ children, delay = 0, className }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      whileHover={{ y: -10, scale: 1.02 }}
      className={cn("group cursor-pointer", className)}
    >
      <Card className="h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        {children}
      </Card>
    </motion.div>
  )
}

export default function CareerArchitectLandingPage() {
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 300], [0, 50])
  const y2 = useTransform(scrollY, [0, 300], [0, -50])
  const opacity = useTransform(scrollY, [0, 300], [1, 0.8])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 relative overflow-hidden">
      {/* Ultra-Advanced Visual Effects */}
      <LiquidMorphBackground />
      <NeuralNetworkBackground />
      <QuantumParticleField />
      <PulsingEnergyField />
      <ParticleSystem particleCount={120} />
      <FloatingShapes />
      <CursorFollower />
      <AnimatedBackground />
      <MatrixRain density={25} />
      
      {/* Navigation - Mega Menu */}
      <motion.nav 
        className="relative z-50 backdrop-blur-xl bg-white/10 border-b border-white/20 shadow-2xl"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <motion.div 
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Career Architect
                </span>
                <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">AI-Powered Career Transformation</div>
              </div>
            </motion.div>
            
            {/* Mega Menu Items */}
            <div className="hidden lg:flex items-center space-x-8">
              {/* Solutions Dropdown */}
              <div className="relative group">
                <button className="flex items-center space-x-1 text-gray-800 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold text-lg px-4 py-2 rounded-lg hover:bg-white/20">
                  <span>Solutions</span>
                  <ChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                </button>
                
                {/* Mega Menu Dropdown */}
                <div className="absolute top-full left-0 mt-2 w-96 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">For Professionals</h3>
                        <div className="space-y-3">
                          <a href="#" className="block text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                            <div className="font-medium">Resume Builder</div>
                            <div className="text-sm text-gray-500">AI-powered resume optimization</div>
                          </a>
                          <a href="#" className="block text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                            <div className="font-medium">Career Coaching</div>
                            <div className="text-sm text-gray-500">Personalized career guidance</div>
                          </a>
                          <a href="#" className="block text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                            <div className="font-medium">Interview Prep</div>
                            <div className="text-sm text-gray-500">Mock interviews & feedback</div>
                          </a>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-3 text-lg">For Companies</h3>
                        <div className="space-y-3">
                          <a href="#" className="block text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                            <div className="font-medium">Talent Matching</div>
                            <div className="text-sm text-gray-500">Find perfect candidates</div>
                          </a>
                          <a href="#" className="block text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                            <div className="font-medium">Bulk Screening</div>
                            <div className="text-sm text-gray-500">AI-powered candidate screening</div>
                          </a>
                          <a href="#" className="block text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                            <div className="font-medium">Analytics</div>
                            <div className="text-sm text-gray-500">Hiring insights & metrics</div>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <a href="#features" className="text-gray-800 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold text-lg px-4 py-2 rounded-lg hover:bg-white/20">Features</a>
              <a href="#testimonials" className="text-gray-800 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold text-lg px-4 py-2 rounded-lg hover:bg-white/20">Success Stories</a>
              <a href="#pricing" className="text-gray-800 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors font-semibold text-lg px-4 py-2 rounded-lg hover:bg-white/20">Pricing</a>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="hidden md:block text-gray-800 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white/20 font-semibold">
                Sign In
              </Button>
              <MorphingButton morphColor="#8b5cf6" className="shadow-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2">
                Get Started Free
              </MorphingButton>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6">
        {/* Extreme Visual Effects for Hero */}
        <HolographicDataStream 
          streamCount={8} 
          className="absolute inset-0 pointer-events-none"
        />
        <DNAHelixScroll 
          className="absolute right-10 top-20 opacity-30"
          helixHeight={600}
        />
        
        <motion.div 
          className="max-w-7xl mx-auto relative"
          style={{ y: y1, opacity }}
        >
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <AnimatedText delay={0.2}>
              <Badge className="mb-8 px-4 py-2 text-sm bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-purple-200 rounded-full">
                <Sparkles className="w-4 h-4 mr-2" />
                AI-Powered Career Transformation
              </Badge>
            </AnimatedText>

            {/* Main Headline */}
            <AnimatedText delay={0.4}>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 relative">
                <div className="absolute inset-0 bg-black/40 dark:bg-black/60 rounded-2xl -z-10 blur-3xl"></div>
                <TextRevealAnimation 
                  text="Don't Just Build a Resume." 
                  className="block mb-2 text-gray-900 dark:text-white text-shadow-lg"
                  delay={0.4}
                />
                <CyberpunkText 
                  text="Build Your Future." 
                  className="block text-5xl md:text-7xl"
                  glitchIntensity={0.3}
                  neonColor="#8b5cf6"
                />
              </h1>
            </AnimatedText>

            {/* Subtext */}
            <AnimatedText delay={0.6}>
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-black/30 dark:bg-black/50 rounded-xl -z-10 blur-2xl"></div>
                <p className="text-xl md:text-2xl text-gray-900 dark:text-gray-100 font-semibold leading-relaxed px-4 py-2 text-shadow-md">
                  Go from overlooked to in-demand. Our AI Career Architect transforms your experience 
                  into the professional identity that lands you the job you deserve.
                </p>
              </div>
            </AnimatedText>

            {/* CTA Buttons */}
            <AnimatedText delay={0.8}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                <MagneticHover strength={0.2}>
                  <MorphingButton morphColor="#8b5cf6" className="flex items-center">
                    Start Designing My Future
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </MorphingButton>
                </MagneticHover>
                
                <MagneticHover strength={0.15}>
                  <MorphingButton morphColor="#3b82f6" className="flex items-center bg-white/10 backdrop-blur-xl border border-white/20">
                    Watch Demo
                  </MorphingButton>
                </MagneticHover>
              </div>
            </AnimatedText>

            {/* Social Proof Numbers */}
            <AnimatedText delay={1.0}>
              <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto relative">
                <div className="absolute inset-0 bg-black/20 dark:bg-black/40 rounded-2xl -z-10 blur-2xl"></div>
                <div className="text-center relative z-10 p-4">
                  <motion.div 
                    className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-purple-700 bg-clip-text text-transparent mb-2 text-shadow-lg"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 1.2 }}
                  >
                    10,000+
                  </motion.div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Careers Transformed</div>
                </div>
                <div className="text-center relative z-10 p-4">
                  <motion.div 
                    className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent mb-2 text-shadow-lg"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 1.4 }}
                  >
                    89%
                  </motion.div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Interview Rate</div>
                </div>
                <div className="text-center relative z-10 p-4">
                  <motion.div 
                    className="text-4xl font-bold bg-gradient-to-r from-indigo-500 to-indigo-700 bg-clip-text text-transparent mb-2 text-shadow-lg"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, delay: 1.6 }}
                  >
                    $15k+
                  </motion.div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Avg Salary Increase</div>
                </div>
              </div>
            </AnimatedText>
          </div>
        </motion.div>
      </section>

      {/* Value Proposition Section */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <AnimatedText className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Transform Your Career Story
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Stop playing the resume lottery. Our AI understands what employers actually want 
              and transforms your experience into compelling career narratives.
            </p>
          </AnimatedText>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <ParallaxElement speed={0.2}>
              <FloatingCard delay={0.2}>
                <GlassmorphismCard className="text-center h-full" intensity={0.15}>
                  <FloatingIcon3D floatIntensity={1.2} className="mx-auto mb-6">
                    <motion.div
                      className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 5, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Brain className="w-8 h-8 text-white" />
                    </motion.div>
                  </FloatingIcon3D>
                  <h3 className="text-2xl font-bold mb-4">Translate Your Value</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Turn years of experience into the strategic language that recruiters and AI 
                    are actually looking for. Stop being misunderstood by algorithms.
                  </p>
                </GlassmorphismCard>
              </FloatingCard>
            </ParallaxElement>

            {/* Feature 2 */}
            <ParallaxElement speed={0.1}>
              <FloatingCard delay={0.4}>
                <GlassmorphismCard className="text-center h-full" intensity={0.15}>
                  <FloatingIcon3D floatIntensity={1.2} className="mx-auto mb-6">
                    <motion.div
                      className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: -5, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Target className="w-8 h-8 text-white" />
                    </motion.div>
                  </FloatingIcon3D>
                  <h3 className="text-2xl font-bold mb-4">Eliminate the Guesswork</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Get a data-driven blueprint to beat the resume black hole. Know exactly what skills 
                    and keywords to highlight for every single application.
                  </p>
                </GlassmorphismCard>
              </FloatingCard>
            </ParallaxElement>

            {/* Feature 3 */}
            <ParallaxElement speed={0.3}>
              <FloatingCard delay={0.6}>
                <GlassmorphismCard className="text-center h-full" intensity={0.15}>
                  <FloatingIcon3D floatIntensity={1.2} className="mx-auto mb-6">
                    <motion.div
                      className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center"
                      whileHover={{ rotate: 5, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Shield className="w-8 h-8 text-white" />
                    </motion.div>
                  </FloatingIcon3D>
                  <h3 className="text-2xl font-bold mb-4">Reclaim Your Confidence</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                    Walk into every application and interview with the unshakeable confidence 
                    that you are the ideal candidate for the role.
                  </p>
                </GlassmorphismCard>
              </FloatingCard>
            </ParallaxElement>
          </div>
        </div>
      </section>

      {/* Product Showcase Section */}
      <section className="relative z-10 py-24 px-6 bg-gradient-to-br from-gray-50 to-purple-50/30 dark:from-gray-900 dark:to-purple-950/30">
        <div className="max-w-7xl mx-auto">
          <AnimatedText className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              See Your Transformation in Seconds
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Watch our AI instantly deconstruct any role and architect a new, powerful resume 
              that makes you the inevitable choice.
            </p>
          </AnimatedText>

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Process Steps */}
            <div className="space-y-8">
              <motion.div
                className="flex items-start space-x-4"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                viewport={{ once: true }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">1. Upload Your Current Resume</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Drop in the document that's been letting you down. Our AI instantly analyzes 
                    your experience and identifies hidden strengths.
                  </p>
                </div>
              </motion.div>

              <motion.div
                className="flex items-start space-x-4"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Link className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">2. Add Your Dream Job</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Paste the link to a job you want. Our AI decodes the hidden requirements 
                    and maps them to your unique experience.
                  </p>
                </div>
              </motion.div>

              <motion.div
                className="flex items-start space-x-4"
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                viewport={{ once: true }}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">3. Receive Your Blueprint</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Get a powerful, strategic resume that speaks the language of leadership 
                    and positions you as the perfect candidate.
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Demo Preview */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-purple-100 dark:border-purple-900">
                {/* Mock Interface */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  </div>
                </div>
                
                <div className="p-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">Resume Analysis</div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-green-600">89% Match</span>
                      </div>
                    </div>

                    {/* Mock Progress Bars */}
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Leadership Experience</span>
                          <span className="text-purple-600">95%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <motion.div 
                            className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full"
                            initial={{ width: 0 }}
                            whileInView={{ width: "95%" }}
                            transition={{ duration: 1.5, delay: 0.5 }}
                            viewport={{ once: true }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Strategic Keywords</span>
                          <span className="text-blue-600">87%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <motion.div 
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full"
                            initial={{ width: 0 }}
                            whileInView={{ width: "87%" }}
                            transition={{ duration: 1.5, delay: 0.7 }}
                            viewport={{ once: true }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Impact Metrics</span>
                          <span className="text-indigo-600">92%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <motion.div 
                            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-2 rounded-full"
                            initial={{ width: 0 }}
                            whileInView={{ width: "92%" }}
                            transition={{ duration: 1.5, delay: 0.9 }}
                            viewport={{ once: true }}
                          />
                        </div>
                      </div>
                    </div>

                    <motion.div
                      className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/50 dark:to-blue-950/50 rounded-lg p-4"
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 1.2 }}
                      viewport={{ once: true }}
                    >
                      <div className="flex items-start space-x-3">
                        <Sparkles className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-sm mb-1">AI Recommendation</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Reframe "Managed marketing team" as "Led high-performing marketing team 
                            to execute integrated campaigns, driving 15% MQL increase YoY"
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <motion.div
                className="absolute -top-4 -right-4 w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <motion.div
                className="absolute -bottom-6 -left-6 w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials Section */}
      <section id="testimonials" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <AnimatedText className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Success Stories That Inspire
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Real professionals who transformed their careers with our AI Career Architect
            </p>
          </AnimatedText>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <FloatingCard delay={0.2}>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  "I went from feeling stuck and invisible to landing three interviews for senior roles 
                  in two weeks. This tool didn't just change my resume; it changed how I talk about myself. 
                  An absolute game-changer for any mid-career professional."
                </blockquote>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">SM</span>
                  </div>
                  <div>
                    <div className="font-semibold">Stephanie M.</div>
                    <div className="text-sm text-gray-500">Marketing Director</div>
                  </div>
                </div>
              </CardContent>
            </FloatingCard>

            {/* Testimonial 2 */}
            <FloatingCard delay={0.4}>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  "The AI analysis is terrifyingly accurate. It showed me exactly why I wasn't getting 
                  past the first screen. After using the Architect, I got a call back for a dream job 
                  I was previously rejected for. I start next month."
                </blockquote>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">DL</span>
                  </div>
                  <div>
                    <div className="font-semibold">David L.</div>
                    <div className="text-sm text-gray-500">Senior Product Manager</div>
                  </div>
                </div>
              </CardContent>
            </FloatingCard>

            {/* Testimonial 3 */}
            <FloatingCard delay={0.6}>
              <CardContent className="p-8">
                <div className="flex items-center mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <blockquote className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
                  "Finally, a tool that understands the strategic value I bring. The AI translated 
                  my 15 years of experience into compelling leadership language that recruiters 
                  actually respond to. Worth every penny."
                </blockquote>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">RC</span>
                  </div>
                  <div>
                    <div className="font-semibold">Rachel C.</div>
                    <div className="text-sm text-gray-500">Operations Director</div>
                  </div>
                </div>
              </CardContent>
            </FloatingCard>
          </div>

          {/* Trust Indicators */}
          <AnimatedText delay={0.8} className="text-center mt-16">
            <div className="flex items-center justify-center space-x-8 opacity-60">
              <span className="text-sm text-gray-500">As featured in:</span>
              <div className="flex items-center space-x-6">
                <div className="font-semibold text-gray-400">Forbes</div>
                <div className="font-semibold text-gray-400">Harvard Business Review</div>
                <div className="font-semibold text-gray-400">Fast Company</div>
              </div>
            </div>
          </AnimatedText>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="relative z-10 py-24 px-6 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center">
          <AnimatedText>
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Your career is too important to leave to chance.
            </h2>
          </AnimatedText>
          
          <AnimatedText delay={0.2}>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Stop applying. Start architecting.
            </p>
          </AnimatedText>

          <AnimatedText delay={0.4} className="mb-12">
            <MagneticButton className="bg-white text-purple-600 hover:bg-gray-50 shadow-xl">
              <Award className="w-5 h-5 mr-2" />
              Become Inevitable
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </MagneticButton>
          </AnimatedText>

          <AnimatedText delay={0.6}>
            <p className="text-white/70 text-sm">
              Join 10,000+ professionals who've transformed their careers • No credit card required
            </p>
          </AnimatedText>
        </div>

        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-20 left-20 w-2 h-2 bg-white/30 rounded-full"
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-40 right-32 w-3 h-3 bg-white/20 rounded-full"
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 5, repeat: Infinity, delay: 1 }}
          />
          <motion.div
            className="absolute bottom-32 left-1/4 w-1 h-1 bg-white/40 rounded-full"
            animate={{ scale: [1, 2, 1], opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, delay: 2 }}
          />
        </div>
      </section>
    </div>
  )
}
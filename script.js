// 🌧️ RESPONSIVE RAIN EFFECT ADDON - Scales with container size
class ResponsiveRainEffect {
    constructor() {
        this.canvas = document.getElementById('rainCanvas')
        this.ctx = this.canvas.getContext('2d')
        this.container = this.canvas.parentElement || document.body
        
        this.raindrops = []
        this.splashes = []
        this.animationId = null
        
        // Responsive scaling factors
        this.scaleFactor = 1
        this.containerWidth = 0
        this.containerHeight = 0
        this.baseUnit = 1 // Base unit for scaling (will be calculated)
        
        // Default settings (responsive values)
        this.settings = {
            intensity: 80,       // fixed number of drops
            speed: 1.5,         // speed multiplier
            dropColor: '#ffffff',
            dropSize: 2.0,      // relative thickness
            windDirection: 0,   // angle in degrees
            opacity: 60,        // percentage
            enableSplash: true
        }
        
        this.setupCanvas()
        this.setupEventListeners()
        this.calculateScaling()
        this.initRain()
        this.animate()
        
        console.log('🌧️ Responsive Rain Effect initialized')
    }
    
    setupCanvas() {
        const resizeCanvas = () => {
            // Use container size instead of window size
            const rect = this.container.getBoundingClientRect()
            this.containerWidth = rect.width
            this.containerHeight = rect.height
            
            // Set canvas size to match container
            this.canvas.width = this.containerWidth
            this.canvas.height = this.containerHeight
            
            // Update scaling and recreate drops
            this.calculateScaling()
            this.createRaindrops()
            
            console.log('🔄 Canvas resized:', this.containerWidth + 'x' + this.containerHeight, 'scale:', this.scaleFactor.toFixed(2))
        }
        
        resizeCanvas()
        
        // Use ResizeObserver for better iframe support
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(resizeCanvas)
            resizeObserver.observe(this.container)
        } else {
            // Fallback to window resize
            window.addEventListener('resize', resizeCanvas)
        }
    }
    
    calculateScaling() {
        // Calculate base unit as percentage of container diagonal
        const diagonal = Math.sqrt(this.containerWidth * this.containerWidth + this.containerHeight * this.containerHeight)
        this.baseUnit = Math.max(1, diagonal / 1000) // 1 unit = 1/1000 of diagonal
        this.scaleFactor = this.baseUnit
        
        console.log('📏 Scaling calculated - baseUnit:', this.baseUnit.toFixed(2), 'diagonal:', diagonal.toFixed(0) + 'px')
    }
    
    setupEventListeners() {
        // Listen for settings updates from MyWallpaper
        window.addEventListener('message', (event) => {
            if (event.data?.type === 'SETTINGS_UPDATE' && event.data?.settings) {
                this.updateSettings(event.data.settings)
            }
        })
    }
    
    updateSettings(newSettings) {
        console.log('🔧 Updating rain settings:', newSettings)
        
        const oldIntensity = this.settings.intensity
        Object.assign(this.settings, newSettings)
        
        // Recreate raindrops if intensity changed
        if (oldIntensity !== this.settings.intensity) {
            this.createRaindrops()
        }
        
        // Clear splashes if disabled
        if (!this.settings.enableSplash) {
            this.splashes = []
        }
    }
    
    createRaindrops() {
        this.raindrops = []
        
        // FIXED: Use intensity directly as number of drops, regardless of container size
        // Only the SIZE of drops will scale, not the quantity
        const dropCount = this.settings.intensity
        
        console.log('💧 Creating', dropCount, 'raindrops (fixed count, responsive size)')
        
        for (let i = 0; i < dropCount; i++) {
            this.raindrops.push(this.createRandomRaindrop())
        }
    }
    
    createRandomRaindrop() {
        const windRadians = (this.settings.windDirection * Math.PI) / 180
        const startOffset = Math.abs(this.containerHeight * Math.tan(windRadians))
        
        return {
            x: Math.random() * (this.containerWidth + startOffset * 2) - startOffset,
            y: Math.random() * -this.containerHeight * 0.5,
            speed: this.scaleFactor * (2 + Math.random() * 3), // Responsive speed
            length: this.scaleFactor * (8 + Math.random() * 12), // Responsive length
            opacity: 0.4 + Math.random() * 0.6,
            angle: windRadians
        }
    }
    
    createSplash(x, y) {
        if (!this.settings.enableSplash) return
        
        const splashCount = 2 + Math.round(Math.random() * 2)
        const splashSize = this.scaleFactor * (0.5 + Math.random())
        
        for (let i = 0; i < splashCount; i++) {
            this.splashes.push({
                x: x + (Math.random() - 0.5) * this.scaleFactor * 8,
                y: y,
                vx: (Math.random() - 0.5) * this.scaleFactor * 3,
                vy: -Math.random() * this.scaleFactor * 2 - this.scaleFactor,
                life: 15 + Math.random() * 15,
                maxLife: 30,
                size: splashSize
            })
        }
    }
    
    initRain() {
        this.createRaindrops()
    }
    
    animate() {
        // Clear with transparent background
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        
        this.updateRaindrops()
        this.drawRaindrops()
        
        if (this.settings.enableSplash) {
            this.updateSplashes()
            this.drawSplashes()
        }
        
        this.animationId = requestAnimationFrame(() => this.animate())
    }
    
    updateRaindrops() {
        this.raindrops.forEach(drop => {
            // Update position based on speed and wind
            drop.y += drop.speed * this.settings.speed
            drop.x += Math.sin(drop.angle) * drop.speed * this.settings.speed * 0.5
            
            // Check if drop hit the ground
            if (drop.y > this.containerHeight + this.scaleFactor * 10) {
                // Create splash effect
                if (drop.x >= -this.scaleFactor * 20 && drop.x <= this.containerWidth + this.scaleFactor * 20) {
                    this.createSplash(drop.x, this.containerHeight - this.scaleFactor * 2)
                }
                
                // Reset drop position
                this.resetRaindrop(drop)
            }
            
            // Reset if goes too far horizontally
            const margin = this.scaleFactor * 50
            if (drop.x < -margin || drop.x > this.containerWidth + margin) {
                this.resetRaindrop(drop)
            }
        })
    }
    
    resetRaindrop(drop) {
        const windRadians = (this.settings.windDirection * Math.PI) / 180
        const startOffset = Math.abs(this.containerHeight * Math.tan(windRadians))
        
        drop.x = Math.random() * (this.containerWidth + startOffset * 2) - startOffset
        drop.y = Math.random() * -this.containerHeight * 0.3 - this.scaleFactor * 20
        drop.speed = this.scaleFactor * (2 + Math.random() * 3)
        drop.angle = windRadians
    }
    
    updateSplashes() {
        for (let i = this.splashes.length - 1; i >= 0; i--) {
            const splash = this.splashes[i]
            
            splash.x += splash.vx
            splash.y += splash.vy
            splash.vy += this.scaleFactor * 0.15 // responsive gravity
            splash.life--
            
            if (splash.life <= 0) {
                this.splashes.splice(i, 1)
            }
        }
    }
    
    drawRaindrops() {
        // Responsive line width
        const lineWidth = Math.max(0.5, this.scaleFactor * this.settings.dropSize * 0.8)
        this.ctx.lineWidth = lineWidth
        this.ctx.lineCap = 'round'
        
        this.raindrops.forEach(drop => {
            const opacity = (this.settings.opacity / 100) * drop.opacity
            this.ctx.strokeStyle = this.hexToRgba(this.settings.dropColor, opacity)
            
            this.ctx.beginPath()
            this.ctx.moveTo(drop.x, drop.y)
            
            // Calculate end point based on length and angle
            const endX = drop.x - Math.sin(drop.angle) * drop.length
            const endY = drop.y - Math.cos(drop.angle) * drop.length
            
            this.ctx.lineTo(endX, endY)
            this.ctx.stroke()
        })
    }
    
    drawSplashes() {
        this.splashes.forEach(splash => {
            const opacity = (splash.life / splash.maxLife) * (this.settings.opacity / 100)
            this.ctx.fillStyle = this.hexToRgba(this.settings.dropColor, opacity)
            
            this.ctx.beginPath()
            this.ctx.arc(splash.x, splash.y, splash.size, 0, Math.PI * 2)
            this.ctx.fill()
        })
    }
    
    hexToRgba(hex, alpha) {
        // Handle both #RGB and #RRGGBB formats
        hex = hex.replace('#', '')
        
        let r, g, b
        
        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16)
            g = parseInt(hex[1] + hex[1], 16)
            b = parseInt(hex[2] + hex[2], 16)
        } else {
            r = parseInt(hex.slice(0, 2), 16)
            g = parseInt(hex.slice(2, 4), 16)
            b = parseInt(hex.slice(4, 6), 16)
        }
        
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId)
        }
    }
}

// Initialize responsive rain effect when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.rainEffect = new ResponsiveRainEffect()
})
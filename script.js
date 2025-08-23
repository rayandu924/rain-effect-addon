// 🌧️ RAIN EFFECT ADDON - Realistic rain animation
class RainEffect {
    constructor() {
        this.canvas = document.getElementById('rainCanvas')
        this.ctx = this.canvas.getContext('2d')
        this.raindrops = []
        this.splashes = []
        this.animationId = null
        
        // Default settings
        this.settings = {
            intensity: 80,
            speed: 2.0,
            dropColor: '#87CEEB',
            dropSize: 2,
            windDirection: 0,
            opacity: 70,
            enableSplash: true
        }
        
        this.setupCanvas()
        this.setupEventListeners()
        this.initRain()
        this.animate()
        
        console.log('🌧️ Rain Effect initialized')
    }
    
    setupCanvas() {
        const resizeCanvas = () => {
            this.canvas.width = window.innerWidth
            this.canvas.height = window.innerHeight
            this.createRaindrops() // Recreate drops on resize
        }
        
        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)
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
        
        // Update settings
        Object.assign(this.settings, newSettings)
        
        // Recreate raindrops if intensity changed
        if (this.raindrops.length !== this.settings.intensity) {
            this.createRaindrops()
        }
        
        // Clear splashes if disabled
        if (!this.settings.enableSplash) {
            this.splashes = []
        }
    }
    
    createRaindrops() {
        this.raindrops = []
        
        for (let i = 0; i < this.settings.intensity; i++) {
            this.raindrops.push(this.createRandomRaindrop())
        }
    }
    
    createRandomRaindrop() {
        return {
            x: Math.random() * (this.canvas.width + 100) - 50,
            y: Math.random() * -500,
            speed: this.settings.speed * (0.8 + Math.random() * 0.4),
            length: 10 + Math.random() * 20,
            opacity: 0.3 + Math.random() * 0.7
        }
    }
    
    createSplash(x, y) {
        if (!this.settings.enableSplash) return
        
        for (let i = 0; i < 3; i++) {
            this.splashes.push({
                x: x + (Math.random() - 0.5) * 10,
                y: y,
                vx: (Math.random() - 0.5) * 4,
                vy: -Math.random() * 3 - 1,
                life: 30,
                maxLife: 30,
                size: 1 + Math.random() * 2
            })
        }
    }
    
    initRain() {
        this.createRaindrops()
    }
    
    animate() {
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
        const windOffset = this.settings.windDirection * 0.1
        
        this.raindrops.forEach(drop => {
            drop.y += drop.speed * this.settings.speed
            drop.x += windOffset
            
            // Reset raindrop when it goes off screen
            if (drop.y > this.canvas.height + 50) {
                // Create splash effect
                this.createSplash(drop.x, this.canvas.height - 5)
                
                // Reset drop position
                drop.x = Math.random() * (this.canvas.width + 100) - 50
                drop.y = Math.random() * -200
                drop.speed = this.settings.speed * (0.8 + Math.random() * 0.4)
            }
            
            // Reset if goes too far horizontally
            if (drop.x < -100 || drop.x > this.canvas.width + 100) {
                drop.x = Math.random() * (this.canvas.width + 100) - 50
                drop.y = Math.random() * -200
            }
        })
    }
    
    updateSplashes() {
        for (let i = this.splashes.length - 1; i >= 0; i--) {
            const splash = this.splashes[i]
            
            splash.x += splash.vx
            splash.y += splash.vy
            splash.vy += 0.2 // gravity
            splash.life--
            
            if (splash.life <= 0) {
                this.splashes.splice(i, 1)
            }
        }
    }
    
    drawRaindrops() {
        this.ctx.strokeStyle = this.hexToRgba(this.settings.dropColor, this.settings.opacity / 100)
        this.ctx.lineWidth = this.settings.dropSize
        this.ctx.lineCap = 'round'
        
        this.raindrops.forEach(drop => {
            const opacity = (this.settings.opacity / 100) * drop.opacity
            this.ctx.strokeStyle = this.hexToRgba(this.settings.dropColor, opacity)
            
            this.ctx.beginPath()
            this.ctx.moveTo(drop.x, drop.y)
            this.ctx.lineTo(drop.x - this.settings.windDirection * 0.3, drop.y - drop.length)
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
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId)
        }
        window.removeEventListener('resize', this.resizeCanvas)
    }
}

// Initialize rain effect when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.rainEffect = new RainEffect()
})
# 🌧️ Rain Effect Addon

A realistic rain animation addon for MyWallpaper with customizable physics and visual effects.

## ✨ Features

- **Realistic Rain Physics** - Natural falling motion with gravity
- **Wind Simulation** - Configurable wind direction affecting rain angle  
- **Splash Effects** - Particle effects when raindrops hit the ground
- **Customizable Appearance** - Color, size, opacity, and intensity controls
- **Performance Optimized** - Smooth animation with efficient rendering

## ⚙️ Configuration Options

| Setting | Type | Description | Range | Default |
|---------|------|-------------|-------|---------|
| **Intensity** | Range | Number of raindrops | 10-200 | 80 |
| **Speed** | Range | Fall speed multiplier | 0.5-5.0 | 2.0 |
| **Drop Color** | Color | Raindrop color | Any hex color | #87CEEB |
| **Drop Size** | Range | Size of raindrops | 1-8 px | 2 |
| **Wind Direction** | Range | Wind angle effect | -30° to +30° | 0° |
| **Opacity** | Range | Rain transparency | 10-100% | 70% |
| **Enable Splash** | Checkbox | Show splash effects | On/Off | On |

## 🎮 Usage

1. Add the Rain Effect addon to your MyWallpaper setup
2. Adjust the settings to create your desired rain atmosphere:
   - **Light drizzle**: Low intensity (20-40), slow speed (1.0)
   - **Heavy storm**: High intensity (150+), fast speed (3.0+), wind effect
   - **Gentle rain**: Medium settings with splash effects enabled

## 🔧 Technical Details

- Pure JavaScript with HTML5 Canvas
- No external dependencies
- Responsive to window resizing
- Optimized particle system with object pooling
- Real-time settings updates via MessageAPI

## 📝 Version History

- **1.0.0** - Initial release with full rain simulation
import * as THREE from 'three'

export const useCelestialBodies = () => {
	const updateCelestialBodies = (
		scene: THREE.Scene,
		width: number,
		height: number,
		params: {
			sunPosition: number
			moonPosition: number
			isSunUp: boolean
			isMoonUp: boolean
			moonPhase: string
			moonIllumination: number
		}
	) => {
		const createMoonPhaseTexture = (phase: string, illumination: number, size = 256) => {
			const canvas = document.createElement('canvas')
			canvas.width = size
			canvas.height = size
			const ctx = canvas.getContext('2d')!
			const center = size / 2
			const radius = size * 0.4

			ctx.beginPath()
			ctx.arc(center, center, radius, 0, Math.PI * 2)
			ctx.fillStyle = 'rgba(25, 30, 50, 0.4)'
			ctx.fill()

			const isWaxing =
				phase.toLowerCase().includes('waxing') || phase.toLowerCase().includes('first')
			const isWaning =
				phase.toLowerCase().includes('waning') || phase.toLowerCase().includes('last')

			ctx.save()
			ctx.beginPath()
			ctx.arc(center, center, radius, 0, Math.PI * 2)
			ctx.clip()

			ctx.fillStyle = '#ffffee'

			const illum = illumination / 100

			if (illum > 0.05) {
				ctx.beginPath()
				if (illum >= 0.95) {
					ctx.arc(center, center, radius, 0, Math.PI * 2)
				} else {
					if (isWaxing) {
						ctx.arc(center, center, radius, -Math.PI / 2, Math.PI / 2, false)
					} else {
						ctx.arc(center, center, radius, Math.PI / 2, -Math.PI / 2, false)
					}

					const ellipseWidth = radius * Math.abs(1 - 2 * illum)
					if (illum < 0.5) {
						ctx.ellipse(
							center,
							center,
							ellipseWidth,
							radius,
							0,
							Math.PI / 2,
							-Math.PI / 2,
							isWaxing
						)
					} else {
						ctx.ellipse(
							center,
							center,
							ellipseWidth,
							radius,
							0,
							Math.PI / 2,
							-Math.PI / 2,
							!isWaxing
						)
					}
				}
				ctx.closePath()
				ctx.fill()
			}

			ctx.restore()

			ctx.globalAlpha = 0.08
			for (let i = 0; i < 12; i++) {
				ctx.beginPath()
				const ang = Math.random() * Math.PI * 2
				const dist = Math.random() * radius
				const rx = center + Math.cos(ang) * dist
				const ry = center + Math.sin(ang) * dist
				const rr = 2 + Math.random() * 6
				ctx.arc(rx, ry, rr, 0, Math.PI * 2)
				ctx.fillStyle = '#000'
				ctx.fill()
			}

			const tex = new THREE.CanvasTexture(canvas)
			tex.needsUpdate = true
			return tex
		}

		const createMoonGlowTexture = (size = 256) => {
			const canvas = document.createElement('canvas')
			canvas.width = size
			canvas.height = size
			const ctx = canvas.getContext('2d')!

			const grad = ctx.createRadialGradient(
				size / 2,
				size / 2,
				0,
				size / 2,
				size / 2,
				size / 2
			)
			grad.addColorStop(0, 'rgba(200,210,255,0.8)')
			grad.addColorStop(0.4, 'rgba(150,170,220,0.3)')
			grad.addColorStop(1, 'rgba(100,120,180,0)')
			ctx.fillStyle = grad
			ctx.fillRect(0, 0, size, size)

			const tex = new THREE.CanvasTexture(canvas)
			tex.needsUpdate = true
			return tex
		}

		const createSunTexture = (size = 1024) => {
			const canvas = document.createElement('canvas')
			canvas.width = size
			canvas.height = size
			const ctx = canvas.getContext('2d')!

			const grad = ctx.createRadialGradient(
				size / 2,
				size / 2,
				0,
				size / 2,
				size / 2,
				size / 2
			)
			grad.addColorStop(0, 'rgba(255, 255, 255, 1)')
			grad.addColorStop(0.15, 'rgba(255, 255, 230, 0.95)')
			grad.addColorStop(0.3, 'rgba(255, 240, 180, 0.5)')
			grad.addColorStop(0.6, 'rgba(255, 180, 100, 0.15)')
			grad.addColorStop(0.85, 'rgba(255, 120, 50, 0.05)')
			grad.addColorStop(1, 'rgba(255, 80, 0, 0)')
			ctx.fillStyle = grad
			ctx.fillRect(0, 0, size, size)

			const tex = new THREE.CanvasTexture(canvas)
			tex.needsUpdate = true
			return tex
		}

		// SUN
		let sun = scene.getObjectByName('sun-group')
		if (params.isSunUp) {
			if (!sun) {
				const sunGroup = new THREE.Group()
				sunGroup.name = 'sun-group'

				const sunTexture = createSunTexture(1024)

				// OUTER ATMOSPHERIC HAZE (TITANIC)
				const outerHazeMaterial = new THREE.SpriteMaterial({
					map: sunTexture,
					color: 0xffaa44,
					transparent: true,
					opacity: 0.12,
					blending: THREE.AdditiveBlending,
				})
				const outerHaze = new THREE.Sprite(outerHazeMaterial)
				outerHaze.scale.set(5000, 5000, 1)
				outerHaze.position.z = -3
				sunGroup.add(outerHaze)

				// SECONDARY GLOW
				const secondaryGlowMaterial = new THREE.SpriteMaterial({
					map: sunTexture,
					color: 0xffcc33,
					transparent: true,
					opacity: 0.3,
					blending: THREE.AdditiveBlending,
				})
				const secondaryGlow = new THREE.Sprite(secondaryGlowMaterial)
				secondaryGlow.scale.set(2500, 2500, 1)
				secondaryGlow.position.z = -2
				sunGroup.add(secondaryGlow)

				// PRIMARY RADIANCE
				const glowMaterial = new THREE.SpriteMaterial({
					map: sunTexture,
					color: 0xfff0aa,
					transparent: true,
					opacity: 0.5,
					blending: THREE.AdditiveBlending,
				})
				const glowSprite = new THREE.Sprite(glowMaterial)
				glowSprite.scale.set(1200, 1200, 1)
				glowSprite.position.z = -1
				sunGroup.add(glowSprite)

				// CORE
				const coreMaterial = new THREE.SpriteMaterial({
					map: sunTexture,
					color: 0xffffff,
					transparent: true,
					opacity: 1,
				})
				const coreSprite = new THREE.Sprite(coreMaterial)
				coreSprite.scale.set(600, 600, 1)
				sunGroup.add(coreSprite)

				// PointLight
				const sunLight = new THREE.PointLight(0xfff8dc, 2.5, 2500, 0.8)
				sunGroup.add(sunLight)

				scene.add(sunGroup)
				sun = sunGroup
			}

			const angle = Math.PI - params.sunPosition * Math.PI
			const x = Math.cos(angle) * (width * 0.48)
			const y = Math.sin(angle) * (height * 0.38)
			sun.position.set(x, y + height * 0.18, -50)
		} else {
			if (sun) scene.remove(sun)
		}

		// STARS
		let stars = scene.getObjectByName('stars-group')
		if (!params.isSunUp) {
			if (!stars) {
				const starCount = 200
				const starGeometry = new THREE.BufferGeometry()
				const starPositions = new Float32Array(starCount * 3)

				for (let i = 0; i < starCount; i++) {
					starPositions[i * 3] = Math.random() * width - width / 2
					starPositions[i * 3 + 1] = (Math.random() * height) / 2 + height * 0.1
					starPositions[i * 3 + 2] = -60
				}

				starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))

				const starMaterial = new THREE.PointsMaterial({
					color: 0xffffff,
					size: 2.5,
					transparent: true,
					opacity: 0.8,
					sizeAttenuation: false,
				})

				const starPoints = new THREE.Points(starGeometry, starMaterial)
				const starGroup = new THREE.Group()
				starGroup.name = 'stars-group'
				starGroup.add(starPoints)
				scene.add(starGroup)
				stars = starGroup
			}
		} else {
			if (stars) scene.remove(stars)
		}

		// MOON
		let moon = scene.getObjectByName('moon-group')
		if (params.isMoonUp) {
			if (!moon) {
				const moonGroup = new THREE.Group()
				moonGroup.name = 'moon-group'

				// MOON SURFAC
				const moonTexture = createMoonPhaseTexture(
					params.moonPhase,
					params.moonIllumination
				)
				const moonMaterial = new THREE.SpriteMaterial({
					map: moonTexture,
					transparent: true,
					opacity: 0.95,
				})
				const moonSprite = new THREE.Sprite(moonMaterial)
				moonSprite.scale.set(110, 110, 1)
				moonSprite.name = 'moon-surface'
				moonGroup.add(moonSprite)

				// MOON GLOW
				const glowTexture = createMoonGlowTexture(256)

				const glowMaterial = new THREE.SpriteMaterial({
					map: glowTexture,
					color: 0xccddff,
					transparent: true,
					opacity: 0.6,
					depthWrite: false,
					blending: THREE.AdditiveBlending,
				})
				const glowSprite = new THREE.Sprite(glowMaterial)
				glowSprite.scale.set(300, 300, 1)
				glowSprite.position.z = -1
				moonGroup.add(glowSprite)

				const outerGlowMaterial = new THREE.SpriteMaterial({
					map: glowTexture,
					color: 0x8899cc,
					transparent: true,
					opacity: 0.3,
					depthWrite: false,
					blending: THREE.AdditiveBlending,
				})
				const outerGlowSprite = new THREE.Sprite(outerGlowMaterial)
				outerGlowSprite.scale.set(500, 500, 1)
				outerGlowSprite.position.z = -2
				moonGroup.add(outerGlowSprite)

				scene.add(moonGroup)
				moon = moonGroup
			}

			// update texture if phase changed
			const surface = moon.children.find((c) => c.name === 'moon-surface') as THREE.Sprite
			if (
				surface &&
				surface.userData.lastPhase !== params.moonPhase + params.moonIllumination
			) {
				const oldTex = surface.material.map
				if (oldTex) oldTex.dispose()
				surface.material.map = createMoonPhaseTexture(
					params.moonPhase,
					params.moonIllumination
				)
				surface.userData.lastPhase = params.moonPhase + params.moonIllumination
			}

			const angle = Math.PI - params.moonPosition * Math.PI
			const x = Math.cos(angle) * (width * 0.4)
			const y = Math.sin(angle) * (height * 0.3)
			moon.position.set(x, y + height * 0.1, -50)
		} else {
			if (moon) scene.remove(moon)
		}
	}

	return {
		updateCelestialBodies,
	}
}

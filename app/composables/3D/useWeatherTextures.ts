import * as THREE from 'three'

export const useWeatherTextures = () => {
	const createParticleTexture = (
		type: 'snow' | 'rain' | 'glow' | 'splash',
		size = 64,
		dark = false
	) => {
		const canvas = document.createElement('canvas')
		if (type === 'rain') {
			canvas.width = Math.max(6, Math.floor(size / 6))
			canvas.height = size
			const ctx = canvas.getContext('2d')!
			const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
			if (dark) {
				grad.addColorStop(0, 'rgba(120,140,150,0.95)')
				grad.addColorStop(0.5, 'rgba(120,140,150,0.6)')
				grad.addColorStop(1, 'rgba(120,140,150,0)')
			} else {
				grad.addColorStop(0, 'rgba(200,220,255,0.95)')
				grad.addColorStop(0.5, 'rgba(200,220,255,0.7)')
				grad.addColorStop(1, 'rgba(200,220,255,0)')
			}
			ctx.fillStyle = grad
			ctx.fillRect(0, 0, canvas.width, canvas.height)
		} else if (type === 'splash') {
			canvas.width = size
			canvas.height = size
			const ctx = canvas.getContext('2d')!
			const grd = ctx.createRadialGradient(
				size / 2,
				size / 2,
				0,
				size / 2,
				size / 2,
				size / 2
			)
			const c = dark ? '150,170,190' : '200,220,255'
			grd.addColorStop(0, `rgba(${c}, 0.8)`)
			grd.addColorStop(0.5, `rgba(${c}, 0.2)`)
			grd.addColorStop(1, `rgba(${c}, 0)`)
			ctx.fillStyle = grd
			ctx.fillRect(0, 0, size, size)
		} else {
			canvas.width = size
			canvas.height = size
			const ctx = canvas.getContext('2d')!
			const grd = ctx.createRadialGradient(
				size / 2,
				size / 2,
				0,
				size / 2,
				size / 2,
				size / 2
			)

			if (type === 'glow') {
				grd.addColorStop(0, 'rgba(255,255,255,1)')
				grd.addColorStop(0.4, 'rgba(255,255,255,0.4)')
				grd.addColorStop(1, 'rgba(255,255,255,0)')
			} else if (dark) {
				grd.addColorStop(0, 'rgba(220,230,240,0.95)')
				grd.addColorStop(0.6, 'rgba(200,220,230,0.5)')
				grd.addColorStop(1, 'rgba(200,220,230,0)')
			} else {
				grd.addColorStop(0, 'rgba(255,255,255,1)')
				grd.addColorStop(0.6, 'rgba(240,240,255,0.6)')
				grd.addColorStop(1, 'rgba(240,240,255,0)')
			}
			ctx.fillStyle = grd
			ctx.fillRect(0, 0, size, size)
		}
		const tex = new THREE.CanvasTexture(canvas)
		tex.minFilter = THREE.LinearFilter
		tex.magFilter = THREE.LinearFilter
		tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
		tex.needsUpdate = true
		return tex
	}

	const createCloudTexture = (size = 128, dark = false) => {
		const canvas = document.createElement('canvas')
		canvas.width = size
		canvas.height = size
		const ctx = canvas.getContext('2d')!

		// Clear background
		ctx.clearRect(0, 0, size, size)

		const drawPuff = (x: number, y: number, radius: number, opacity: number) => {
			const grd = ctx.createRadialGradient(x, y, 0, x, y, radius)

			// cloud colors
			const r = dark ? 180 : 245
			const g = dark ? 190 : 250
			const b = dark ? 200 : 255

			grd.addColorStop(0, `rgba(${r},${g},${b},${opacity})`)
			grd.addColorStop(0.4, `rgba(${r},${g},${b},${opacity * 0.6})`)
			grd.addColorStop(0.8, `rgba(${r},${g},${b},${opacity * 0.1})`)
			grd.addColorStop(1, `rgba(${r},${g},${b},0)`)

			ctx.fillStyle = grd
			ctx.beginPath()
			ctx.arc(x, y, radius, 0, Math.PI * 2)
			ctx.fill()
		}

		// cloud layers
		drawPuff(size / 2, size / 2, size / 2, 0.6)

		for (let i = 0; i < 6; i++) {
			const angle = Math.random() * Math.PI * 2
			const dist = Math.random() * size * 0.25
			const x = size / 2 + Math.cos(angle) * dist
			const y = size / 2 + Math.sin(angle) * dist
			const radius = size * 0.3 + Math.random() * size * 0.2
			drawPuff(x, y, radius, 0.4)
		}

		const tex = new THREE.CanvasTexture(canvas)
		tex.minFilter = THREE.LinearFilter
		tex.magFilter = THREE.LinearFilter
		tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
		tex.needsUpdate = true
		return tex
	}

	const createLightningGeometry = () => {
		const geometry = new THREE.BufferGeometry()
		const points = []
		const segments = 5 + Math.floor(Math.random() * 10)

		for (let i = 0; i < segments; i++) {
			const x = Math.random() * 40 - 20
			const y = -100 + i * 20 + Math.random() * 15
			points.push(new THREE.Vector3(x, y, 0))
		}

		geometry.setFromPoints(points)
		return geometry
	}

	return {
		createParticleTexture,
		createCloudTexture,
		createLightningGeometry,
	}
}

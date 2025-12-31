import { ref } from 'vue'
import * as THREE from 'three'

export function useAISeasonalParticles() {
	const particlesGroup = ref<THREE.Group | null>(null)

	const createParticles = (
		scene: THREE.Scene,
		width: number,
		height: number,
		config: { type: string; color: string; count: number }
	) => {
		if (particlesGroup.value) {
			scene.remove(particlesGroup.value)
			// Dispose geometries and materials
			particlesGroup.value.traverse((obj) => {
				if (obj instanceof THREE.Mesh || obj instanceof THREE.Sprite) {
					if (obj.geometry) obj.geometry.dispose()
					if (obj.material) {
						if (Array.isArray(obj.material)) {
							obj.material.forEach((m) => m.dispose())
						} else {
							obj.material.dispose()
						}
					}
				}
			})
		}

		const group = new THREE.Group()
		group.name = 'ai-seasonal-particles'

		const { type, color, count } = config
		const particleColor = new THREE.Color(color)

		for (let i = 0; i < count; i++) {
			let particle: THREE.Object3D

			if (type === 'leaves' || type === 'petals') {
				// Create a simple plane or sphere for organic bits
				const geom = new THREE.PlaneGeometry(2 + Math.random() * 4, 2 + Math.random() * 4)
				const mat = new THREE.MeshBasicMaterial({
					color: particleColor,
					side: THREE.DoubleSide,
					transparent: true,
					opacity: 0.6 + Math.random() * 0.4,
				})
				particle = new THREE.Mesh(geom, mat)
			} else {
				// Default to glowy circles/sparks
				const canvas = document.createElement('canvas')
				canvas.width = 32
				canvas.height = 32
				const ctx = canvas.getContext('2d')!
				const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
				grad.addColorStop(0, 'rgba(255,255,255,1)')
				grad.addColorStop(1, 'rgba(255,255,255,0)')
				ctx.fillStyle = grad
				ctx.fillRect(0, 0, 32, 32)
				const tex = new THREE.CanvasTexture(canvas)

				const mat = new THREE.SpriteMaterial({
					map: tex,
					color: particleColor,
					transparent: true,
					blending: THREE.AdditiveBlending,
				})
				particle = new THREE.Sprite(mat)
				particle.scale.set(3, 3, 1)
			}

			particle.position.set(
				Math.random() * width - width / 2,
				Math.random() * height - height / 2,
				Math.random() * 100 - 50
			)

			// Random rotations and data for animation
			particle.rotation.set(
				Math.random() * Math.PI,
				Math.random() * Math.PI,
				Math.random() * Math.PI
			)

			particle.userData = {
				velocity: new THREE.Vector3(
					(Math.random() - 0.5) * 0.5,
					-0.2 - Math.random() * 0.5,
					(Math.random() - 0.5) * 0.2
				),
				rotationVelocity: new THREE.Vector3(
					Math.random() * 0.02,
					Math.random() * 0.02,
					Math.random() * 0.02
				),
			}

			group.add(particle)
		}

		scene.add(group)
		particlesGroup.value = group
	}

	const updateParticles = (delta: number, width: number, height: number) => {
		if (!particlesGroup.value) return

		particlesGroup.value.children.forEach((p) => {
			p.position.add(p.userData.velocity)
			p.rotation.x += p.userData.rotationVelocity.x
			p.rotation.y += p.userData.rotationVelocity.y

			// Wrap around
			if (p.position.y < -height / 2) {
				p.position.y = height / 2
				p.position.x = Math.random() * width - width / 2
			}
		})
	}

	return {
		particlesGroup,
		createParticles,
		updateParticles,
	}
}

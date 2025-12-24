<template>
	<div
		ref="container"
		class="interactive-weather-container pointer-events-none fixed inset-0 z-20"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { useTheme } from '~/composables/useTheme'
const { isDark } = useTheme()

const container = ref<HTMLElement | null>(null)
let snowTexture: THREE.Texture | null = null
let rainTexture: THREE.Texture | null = null

const createParticleTexture = (type: 'snow' | 'rain', size = 64, dark = isDark.value) => {
	const canvas = document.createElement('canvas')
	if (type === 'snow') {
		canvas.width = size
		canvas.height = size
		const ctx = canvas.getContext('2d')!
		const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
		if (dark) {
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
	} else {
		canvas.width = Math.max(6, Math.floor(size / 6))
		canvas.height = size
		const ctx = canvas.getContext('2d')!
		const grad = ctx.createLinearGradient(0, 0, 0, canvas.height)
		if (dark) {
			grad.addColorStop(0, 'rgba(120,140,150,0.9)')
			grad.addColorStop(0.5, 'rgba(120,140,150,0.6)')
			grad.addColorStop(1, 'rgba(120,140,150,0)')
		} else {
			grad.addColorStop(0, 'rgba(200,220,255,0.95)')
			grad.addColorStop(0.5, 'rgba(200,220,255,0.7)')
			grad.addColorStop(1, 'rgba(200,220,255,0)')
		}
		ctx.fillStyle = grad
		ctx.fillRect(0, 0, canvas.width, canvas.height)
	}
	const tex = new THREE.CanvasTexture(canvas)
	tex.minFilter = THREE.LinearFilter
	tex.magFilter = THREE.LinearFilter
	tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
	tex.needsUpdate = true
	return tex
}

let scene: THREE.Scene
let camera: THREE.OrthographicCamera
let renderer: THREE.WebGLRenderer
let animationFrameId: number
let clock: THREE.Clock
let hasStartedAnimating = false
let mousePosition = ref({ x: 0, y: 0 })

const props = defineProps({
	weatherType: {
		type: String,
		default: 'clear',
		validator: (value: string) => ['clear', 'rain', 'snow', 'cloudy', 'storm'].includes(value),
	},
	debugBorder: {
		type: Boolean,
		default: false,
	},
})

const emit = defineEmits(['element-clicked'])

const initScene = () => {
	console.debug('[WeatherElements] initScene')
	if (!container.value) {
		console.warn('[WeatherElements] container is not mounted yet.')
		return
	}

	scene = new THREE.Scene()
	scene.background = null

	const width = container.value.clientWidth
	const height = container.value.clientHeight
	camera = new THREE.OrthographicCamera(
		width / -2,
		width / 2,
		height / 2,
		height / -2,
		-1000,
		1000
	)
	camera.position.z = 100

	renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
	renderer.setSize(width, height)
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.setClearColor(0x000000, 0)
	renderer.domElement.style.opacity = isDark.value ? '0.28' : '0.6'
	renderer.domElement.style.pointerEvents = 'none'
	container.value.appendChild(renderer.domElement)

	container.value.addEventListener('mousemove', handleMouseMove)
	container.value.addEventListener('click', handleClick)

	console.debug('[WeatherElements] creating initial interactive elements for', props.weatherType)
	createInteractiveElements()

	clock = new THREE.Clock()

	animate()
}

const handleMouseMove = (event: MouseEvent) => {
	if (!container.value) return

	mousePosition.value = {
		x: (event.clientX / container.value.clientWidth) * 2 - 1,
		y: -(event.clientY / container.value.clientHeight) * 2 + 1,
	}
}

const handleClick = (event: MouseEvent) => {
	emit('element-clicked', {
		x: event.clientX,
		y: event.clientY,
		weatherType: props.weatherType,
	})
}

const createInteractiveElements = () => {
	while (scene.children.length > 0) {
		const child = scene.children[0]
		if (child) {
			scene.remove(child)
		}
	}

	switch (props.weatherType) {
		case 'clear':
			createSunnyElements()
			break
		case 'rain':
			createRainyElements()
			break
		case 'snow':
			createSnowyElements()
			break
		case 'cloudy':
			createCloudyElements()
			break
		case 'storm':
			createStormyElements()
			break
		default:
			createSunnyElements()
	}
}

const createSunnyElements = () => {
	for (let i = 0; i < 8; i++) {
		const angle = (i / 8) * Math.PI * 2
		const rayLength = 100 + Math.random() * 50

		const rayGeometry = new THREE.BufferGeometry()
		const rayMaterial = new THREE.LineBasicMaterial({
			color: 0xffff00,
			transparent: true,
			opacity: 0.6,
			linewidth: 2,
		})

		const points = []
		points.push(new THREE.Vector3(0, 0, 0))
		points.push(new THREE.Vector3(Math.cos(angle) * rayLength, Math.sin(angle) * rayLength, 0))

		rayGeometry.setFromPoints(points)
		const ray = new THREE.Line(rayGeometry, rayMaterial)

		ray.position.set(
			container.value ? container.value.clientWidth / 2 : 0,
			container.value ? container.value.clientHeight / 2 : 0,
			0
		)

		scene.add(ray)
	}

	for (let i = 0; i < 20; i++) {
		const particleGeometry = new THREE.SphereGeometry(2 + Math.random() * 3, 8, 8)
		const particleMaterial = new THREE.MeshBasicMaterial({
			color: Math.random() > 0.5 ? 0xffff00 : 0xffd700,
			transparent: true,
			opacity: 0.7,
		})
		const particle = new THREE.Mesh(particleGeometry, particleMaterial)

		particle.position.set(
			Math.random() * (container.value?.clientWidth || 800) -
				(container.value?.clientWidth || 800) / 2,
			Math.random() * (container.value?.clientHeight || 600) -
				(container.value?.clientHeight || 600) / 2,
			0
		)

		particle.userData.originalPosition = particle.position.clone()
		particle.userData.speed = Math.random() * 0.5 + 0.1
		particle.userData.phase = Math.random() * Math.PI * 2

		scene.add(particle)
	}
}

const createRainyElements = () => {
	if (!rainTexture) {
		rainTexture = createParticleTexture('rain', 96, isDark.value)
		if (rainTexture) {
			;(rainTexture as any).minFilter = THREE.LinearFilter
			;(rainTexture as any).magFilter = THREE.LinearFilter
			rainTexture.needsUpdate = true
		}
	}

	const width = container.value?.clientWidth || 800
	const height = container.value?.clientHeight || 600
	const rainCount = 400

	const rainGeometry = new THREE.BufferGeometry()
	const rainPositions = new Float32Array(rainCount * 3)
	const rainVelocities = new Float32Array(rainCount)

	for (let i = 0; i < rainCount; i++) {
		rainPositions[i * 3] = Math.random() * width - width / 2
		rainPositions[i * 3 + 1] = Math.random() * height - height / 2
		rainPositions[i * 3 + 2] = 0
		rainVelocities[i] = Math.random() * 0.5 + 0.4
	}

	rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3))

	const rainMaterial = new THREE.PointsMaterial({
		size: 10,
		map: rainTexture || undefined,
		transparent: true,
		opacity: 0.9,
		depthWrite: false,
		sizeAttenuation: false,
		color: isDark.value ? 0x5a6f7f : 0x9dbbff,
	})
	const rain = new THREE.Points(rainGeometry, rainMaterial)
	;(rain as any).velocities = rainVelocities
	rain.frustumCulled = false

	scene.add(rain)

	const umbrellaGeometry = new THREE.ConeGeometry(20, 15, 32)
	const umbrellaMaterial = new THREE.MeshBasicMaterial({
		color: 0xff0000,
		side: THREE.DoubleSide,
	})
	const umbrella = new THREE.Mesh(umbrellaGeometry, umbrellaMaterial)

	umbrella.position.set(0, -200, 0)
	umbrella.rotation.x = Math.PI

	const handleGeometry = new THREE.CylinderGeometry(2, 2, 30, 8)
	const handleMaterial = new THREE.MeshBasicMaterial({ color: 0x8b4513 })
	const handle = new THREE.Mesh(handleGeometry, handleMaterial)

	handle.position.set(0, -200, 0)
	handle.rotation.x = Math.PI / 2

	scene.add(umbrella)
	scene.add(handle)
}

const createSnowyElements = () => {
	if (!snowTexture) {
		snowTexture = createParticleTexture('snow', 96, isDark.value)
		if (snowTexture) {
			;(snowTexture as any).minFilter = THREE.LinearFilter
			;(snowTexture as any).magFilter = THREE.LinearFilter
			snowTexture.needsUpdate = true
		}
	}

	const width = container.value?.clientWidth || 800
	const height = container.value?.clientHeight || 600
	const snowCount = 180

	const snowGeometry = new THREE.BufferGeometry()
	const snowPositions = new Float32Array(snowCount * 3)
	const snowVelocities = new Float32Array(snowCount)

	for (let i = 0; i < snowCount; i++) {
		snowPositions[i * 3] = Math.random() * width - width / 2
		snowPositions[i * 3 + 1] = Math.random() * height - height / 2
		snowPositions[i * 3 + 2] = 0
		snowVelocities[i] = Math.random() * 0.08 + 0.02
	}

	snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3))

	const snowMaterial = new THREE.PointsMaterial({
		size: 8,
		map: snowTexture || undefined,
		transparent: true,
		opacity: 0.95,
		depthWrite: false,
		color: isDark.value ? 0xcfdbe6 : 0xffffff,
		sizeAttenuation: false,
	})
	const snow = new THREE.Points(snowGeometry, snowMaterial)
	;(snow as any).velocities = snowVelocities
	snow.frustumCulled = false

	scene.add(snow)

	const snowmanGroup = new THREE.Group()

	const bottomGeometry = new THREE.SphereGeometry(15, 16, 16)
	const bottomMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
	const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial)
	bottom.position.y = -15

	const middleGeometry = new THREE.SphereGeometry(10, 16, 16)
	const middleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
	const middle = new THREE.Mesh(middleGeometry, middleMaterial)
	middle.position.y = 5

	const headGeometry = new THREE.SphereGeometry(7, 16, 16)
	const headMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })
	const head = new THREE.Mesh(headGeometry, headMaterial)
	head.position.y = 20

	snowmanGroup.add(bottom)
	snowmanGroup.add(middle)
	snowmanGroup.add(head)

	snowmanGroup.position.set(
		(container.value?.clientWidth || 800) / 4,
		-(container.value?.clientHeight || 600) / 3,
		0
	)

	scene.add(snowmanGroup)
}

const createCloudyElements = () => {
	for (let i = 0; i < 10; i++) {
		const cloudGroup = new THREE.Group()

		for (let j = 0; j < 5; j++) {
			const cloudPartGeometry = new THREE.SphereGeometry(8 + Math.random() * 5, 16, 16)
			const cloudPartMaterial = new THREE.MeshBasicMaterial({
				color: 0xd3d3d3,
				transparent: true,
				opacity: 0.8,
			})
			const cloudPart = new THREE.Mesh(cloudPartGeometry, cloudPartMaterial)

			cloudPart.position.set(Math.random() * 20 - 10, Math.random() * 10 - 5, 0)

			cloudGroup.add(cloudPart)
		}

		cloudGroup.position.set(
			Math.random() * (container.value?.clientWidth || 800) -
				(container.value?.clientWidth || 800) / 2,
			Math.random() * (container.value?.clientHeight || 600) -
				(container.value?.clientHeight || 600) / 2,
			0
		)

		cloudGroup.userData.speed = Math.random() * 0.2 + 0.05
		cloudGroup.userData.direction = Math.random() > 0.5 ? 1 : -1

		scene.add(cloudGroup)
	}
}

const createStormyElements = () => {
	for (let i = 0; i < 3; i++) {
		const lightningGeometry = new THREE.BufferGeometry()
		const lightningMaterial = new THREE.LineBasicMaterial({
			color: 0xffff00,
			transparent: true,
			opacity: 0.7,
			linewidth: 3,
		})

		const points = []
		const segments = 5 + Math.floor(Math.random() * 5)

		for (let j = 0; j < segments; j++) {
			points.push(
				new THREE.Vector3(Math.random() * 50 - 25, -100 + j * 20 + Math.random() * 10, 0)
			)
		}

		lightningGeometry.setFromPoints(points)
		const lightning = new THREE.Line(lightningGeometry, lightningMaterial)

		lightning.position.set(
			Math.random() * (container.value?.clientWidth || 800) -
				(container.value?.clientWidth || 800) / 2,
			(container.value?.clientHeight || 600) / 2,
			0
		)

		lightning.userData.visible = Math.random() > 0.7
		lightning.userData.flashTimer = 0
		lightning.userData.flashDuration = Math.random() * 2 + 0.5

		scene.add(lightning)
	}

	for (let i = 0; i < 30; i++) {
		const dropGeometry = new THREE.PlaneGeometry(2, 15)
		const dropMaterial = new THREE.MeshBasicMaterial({
			color: 0xaaaaff,
			transparent: true,
			opacity: 0.6,
			side: THREE.DoubleSide,
		})
		const drop = new THREE.Mesh(dropGeometry, dropMaterial)

		drop.position.set(
			Math.random() * (container.value?.clientWidth || 800) -
				(container.value?.clientWidth || 800) / 2,
			Math.random() * (container.value?.clientHeight || 600) -
				(container.value?.clientHeight || 600) / 2,
			0
		)

		drop.userData.windOffset = Math.random() * 20 - 10
		drop.userData.speed = Math.random() * 3 + 2

		scene.add(drop)
	}
}

const animate = () => {
	if (!scene || !renderer) return

	const delta = clock.getDelta()
	const width = container.value?.clientWidth ?? 800
	const height = container.value?.clientHeight ?? 600

	if (!hasStartedAnimating) {
		console.debug('[WeatherElements] animation loop started')
		hasStartedAnimating = true
	}

	scene.children.forEach((obj) => {
		if (obj.type === 'Mesh' && obj.userData.originalPosition) {
			const originalPosition = obj.userData.originalPosition
			const speed = obj.userData.speed
			const phase = obj.userData.phase

			obj.position.y = originalPosition.y + Math.sin(phase + Date.now() * 0.001 * speed) * 10
			obj.userData.phase += 0.01
		}

		if (obj instanceof THREE.Points && (obj as any).velocities) {
			const positionsAttr = (obj.geometry as THREE.BufferGeometry)?.attributes?.position as
				| THREE.BufferAttribute
				| undefined
			const velocities = (obj as any).velocities as Float32Array
			if (positionsAttr && positionsAttr.array) {
				const positions: any = positionsAttr
				const arr = positions!.array as any
				const stride = positions!.itemSize || 3
				const count = positions!.count
				// @ts-ignore
				for (let i = 0; i < count; i++) {
					const idx = i * stride
					const x = arr[idx]
					const y = arr[idx + 1]
					if (y < -(height / 2) - 20) {
						arr[idx + 1] = height / 2 + Math.random() * 20
						arr[idx] = Math.random() * width - width / 2
					} else {
						// @ts-ignore
						arr[idx + 1] = y - velocities[i] * delta * 60
						arr[idx] = x + Math.sin(Date.now() * 0.001 + i) * 0.02
					}
				}
				positions!.needsUpdate = true
			}
		}

		if (obj instanceof THREE.Points && (obj as any).velocities) {
			const positionsAttr = (obj.geometry as THREE.BufferGeometry)?.attributes?.position as
				| THREE.BufferAttribute
				| undefined
			const velocities = (obj as any).velocities as Float32Array
			if (positionsAttr && positionsAttr.array) {
				const positions: any = positionsAttr
				const arr = positions!.array as any
				const stride = positions!.itemSize || 3
				const count = positions!.count
				for (let i = 0; i < count; i++) {
					const idx = i * stride
					const x = arr[idx]
					const y = arr[idx + 1]
					if (y < -(height / 2) - 10) {
						arr[idx + 1] = height / 2 + Math.random() * 10
						arr[idx] = Math.random() * width - width / 2
					} else {
						// @ts-ignore
						arr[idx + 1] = y - velocities[i] * delta * 20
						arr[idx] = x + Math.sin(Date.now() * 0.001 + i) * 0.35
					}
				}
				positions!.needsUpdate = true
			}
		}

		if (obj.type === 'Group' && obj.userData.direction) {
			const speed = obj.userData.speed
			const direction = obj.userData.direction

			obj.position.x += direction * speed * 0.1

			if (obj.position.x > (container.value?.clientWidth || 800) / 2 + 50) {
				obj.position.x = -((container.value?.clientWidth || 800) / 2) - 50
			} else if (obj.position.x < -((container.value?.clientWidth || 800) / 2) - 50) {
				obj.position.x = (container.value?.clientWidth || 800) / 2 + 50
			}
		}

		if (obj.type === 'Line' && obj.userData.flashTimer !== undefined) {
			const flashTimer = obj.userData.flashTimer
			const flashDuration = obj.userData.flashDuration

			obj.userData.flashTimer += 0.01

			if (Math.random() < 0.01) {
				obj.visible = true
				obj.userData.flashTimer = 0
			} else if (obj.userData.flashTimer > flashDuration) {
				obj.visible = false
			}
		}

		if (obj.type === 'Mesh' && obj.userData.windOffset !== undefined) {
			const speed = obj.userData.speed
			const windOffset = obj.userData.windOffset

			obj.position.y -= speed * 0.1
			obj.position.x += Math.sin(Date.now() * 0.001 + windOffset * 0.1) * 0.5

			if (obj.position.y < -((container.value?.clientHeight || 600) / 2) - 20) {
				obj.position.y = (container.value?.clientHeight || 600) / 2 + 10
				obj.position.x =
					Math.random() * (container.value?.clientWidth || 800) -
					(container.value?.clientWidth || 800) / 2
			}
		}
	})

	renderer.render(scene, camera)
	animationFrameId = requestAnimationFrame(animate)
}

const handleResize = () => {
	if (!container.value || !camera || !renderer) return

	const width = container.value.clientWidth
	const height = container.value.clientHeight

	camera.left = width / -2
	camera.right = width / 2
	camera.top = height / 2
	camera.bottom = height / -2
	camera.updateProjectionMatrix()

	renderer.setSize(width, height)
}

const cleanup = () => {
	console.debug('[WeatherElements] cleanup called')
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId)
	}

	if (container.value) {
		container.value.removeEventListener('mousemove', handleMouseMove)
		container.value.removeEventListener('click', handleClick)
	}

	if (renderer && container.value) {
		container.value.removeChild(renderer.domElement)
	}

	if (renderer) {
		renderer.dispose()
	}

	if (rainTexture) {
		try {
			rainTexture.dispose()
		} catch (e) {}
		rainTexture = null
	}
	if (snowTexture) {
		try {
			snowTexture.dispose()
		} catch (e) {}
		snowTexture = null
	}

	scene.traverse((object: THREE.Object3D) => {
		if (object instanceof THREE.Mesh) {
			if (object.geometry) {
				object.geometry.dispose()
			}
			if (object.material) {
				if (Array.isArray(object.material)) {
					object.material.forEach((material: THREE.Material) => material.dispose())
				} else {
					object.material.dispose()
				}
			}
		}
	})

	if (typeof document !== 'undefined') {
		const styleEl = document.getElementById('interactive-debug-styles')
		if (styleEl) {
			document.head.removeChild(styleEl)
		}
	}
}

watch(
	() => props.weatherType,
	(newWeatherType) => {
		createInteractiveElements()
	}
)

watch(
	() => isDark.value,
	(val) => {
		if (renderer && renderer.domElement) {
			renderer.domElement.style.opacity = val ? '0.28' : '0.6'
		}
	}
)

onMounted(() => {
	initScene()
	window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
	cleanup()
	window.removeEventListener('resize', handleResize)
})

defineExpose({
	updateWeather: createInteractiveElements,
	getScene: () => scene,
})
</script>

<style scoped>
.interactive-weather-container {
	pointer-events: none;
}

.interactive-weather-container canvas {
	pointer-events: none;
	opacity: 0.6;
}
</style>

<template>
	<div
		ref="container"
		:class="['interactive-weather-container', { 'debug-border': debugBorder }]"
		class="pointer-events-none fixed inset-0 z-20"></div>
	<div v-if="currentWeather" class="weather-display">
		<img :src="currentWeather.icon" :alt="currentWeather.text" class="weather-icon" />
		<span class="weather-text">{{ currentWeather.text }}</span>
	</div>
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
	}
	const tex = new THREE.CanvasTexture(canvas)
	tex.minFilter = THREE.LinearFilter
	tex.magFilter = THREE.LinearFilter
	tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
	tex.needsUpdate = true
	return tex
}

const createCloudTexture = (size = 128, dark = isDark.value) => {
	const canvas = document.createElement('canvas')
	canvas.width = size
	canvas.height = size
	const ctx = canvas.getContext('2d')!

	const imageData = ctx.createImageData(size, size)
	const data = imageData.data

	for (let i = 0; i < data.length; i += 4) {
		const x = (i / 4) % size
		const y = Math.floor(i / 4 / size)

		const noise =
			Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.5 +
			Math.sin(x * 0.05 + y * 0.03) * 0.3 +
			Math.random() * 0.2

		const value = (noise + 1) * 0.5
		const alpha = value * 0.8 + 0.2

		data[i] = dark ? 180 : 240
		data[i + 1] = dark ? 190 : 245
		data[i + 2] = dark ? 200 : 250
		data[i + 3] = alpha * 255
	}

	ctx.putImageData(imageData, 0, 0)

	const tex = new THREE.CanvasTexture(canvas)
	tex.minFilter = THREE.LinearFilter
	tex.magFilter = THREE.LinearFilter
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping
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

let scene: THREE.Scene
let camera: THREE.OrthographicCamera
let renderer: THREE.WebGLRenderer
let animationFrameId: number | null = null
let clock: THREE.Clock
let isAnimating = false
let isPaused = false
let cloudTexture: THREE.Texture | null = null

let mousePosition = ref({ x: 0, y: 0 })

const props = defineProps({
	weatherType: {
		type: String,
		default: 'clear',
		validator: (value: string) =>
			['clear', 'rain', 'snow', 'cloudy', 'storm', 'partly'].includes(value),
	},
	debugBorder: {
		type: Boolean,
		default: false,
	},
	wind: {
		type: Object as () => { x: number; y: number },
		default: () => ({ x: 0, y: 0 }),
	},
	particleSize: {
		type: Number,
		default: 1,
	},
	showGround: {
		type: Boolean,
		default: true,
	},
	interactive: {
		type: Boolean,
		default: true,
	},
	animationSpeed: {
		type: Number,
		default: 1,
	},
	intensity: {
		type: Number,
		default: 1,
	},
	currentWeather: {
		type: Object as () => { text: string; icon: string } | null,
		default: null,
	},
})

const emit = defineEmits(['element-clicked'])

const initScene = () => {
	if (!container.value) return

	try {
		scene = new THREE.Scene()
		scene.background = null

		applyFogForWeather(props.weatherType)

		const width = container.value.clientWidth
		const height = container.value.clientHeight
		camera = new THREE.OrthographicCamera(
			-width / 2,
			width / 2,
			height / 2,
			-height / 2,
			-1000,
			1000
		)
		camera.position.z = 100

		renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
		renderer.setSize(width, height)
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
		renderer.setClearColor(0x000000, 0)
		renderer.domElement.style.opacity = isDark.value ? '0.28' : '0.6'
		renderer.domElement.style.pointerEvents = 'none'
		container.value.appendChild(renderer.domElement)

		if (props.interactive) {
			container.value.addEventListener('mousemove', handleMouseMove)
			container.value.addEventListener('click', handleClick)
		}

		if (props.showGround) {
			createGroundPlane()
		}

		createInteractiveElements()

		clock = new THREE.Clock()
		animate()
	} catch (error) {
		console.error('Failed to initialize weather scene:', error)
		cleanup()
	}
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

const clearScene = () => {
	if (!scene) return
	while (scene.children.length > 0) {
		const child = scene.children[0]
		if (child) scene.remove(child)
	}

	if (props.showGround) createGroundPlane()
}

const applyFogForWeather = (weather: string) => {
	if (!scene) {
		return
	}
	if (['cloudy', 'storm'].includes(weather)) {
		scene.fog = new THREE.Fog(isDark.value ? 0x0a1620 : 0xdde6ef, 200, 800)
	} else if (weather === 'snow') {
		scene.fog = new THREE.Fog(isDark.value ? 0x08121a : 0xf0f4f8, 150, 700)
	} else {
		scene.fog = null
	}
}

const groundPlaneName = 'interactive-ground-plane'
const createGroundPlane = () => {
	if (!container.value || !scene) return
	if (scene.getObjectByName(groundPlaneName)) return

	const width = container.value.clientWidth
	const height = container.value.clientHeight
	const planeGeom = new THREE.PlaneGeometry(width * 2, 200, 32, 32)

	let color = 0x8ec07c
	let opacity = 0.13
	let texture: THREE.Texture | null = null

	switch (props.weatherType) {
		case 'clear':
		case 'cloudy':
			color = isDark.value ? 0x3a5a2a : 0x8ec07c
			opacity = 0.13
			break
		case 'rain':
			color = isDark.value ? 0x5a4a3a : 0x8b7b6b
			opacity = 0.17
			break
		case 'storm':
			color = isDark.value ? 0x3a3a3a : 0x6b6b6b
			opacity = 0.18
			break
		case 'snow':
			color = isDark.value ? 0xcfdbe6 : 0xffffff
			opacity = 0.22
			break
		default:
			color = isDark.value ? 0x3a5a2a : 0x8ec07c
			opacity = 0.13
	}

	const planeMat = new THREE.MeshBasicMaterial({
		color,
		transparent: true,
		opacity,
		depthWrite: false,
	})

	const plane = new THREE.Mesh(planeGeom, planeMat)
	plane.name = groundPlaneName
	plane.position.set(0, -height / 2 + 20, -1)
	scene.add(plane)
}

const createInteractiveElements = () => {
	if (!scene) return
	clearScene()

	applyFogForWeather(props.weatherType)

	switch (props.weatherType) {
		case 'clear':
			createSunnyElements()
			break
		case 'partly':
			createSunnyElements()
			createCloudyElements()
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
	if (!container.value) return

	const baseCount = props.weatherType === 'partly' ? 50 : 30
	const particleCount = Math.max(15, Math.floor(baseCount * props.intensity))
	for (let i = 0; i < particleCount; i++) {
		const size = 1.5 * props.particleSize + Math.random() * 4
		const particleGeometry = new THREE.SphereGeometry(size, 16, 16)

		const hue = 0.1 + Math.random() * 0.05
		const saturation = 0.8 + Math.random() * 0.2
		const lightness = 0.7 + Math.random() * 0.2
		const particleColor = new THREE.Color().setHSL(hue, saturation, lightness)

		const particleMaterial = new THREE.MeshBasicMaterial({
			color: particleColor,
			transparent: true,
			opacity: 0.5 + Math.random() * 0.4,
		})
		const particle = new THREE.Mesh(particleGeometry, particleMaterial)

		particle.position.set(
			Math.random() * (container.value.clientWidth || 800) -
				(container.value.clientWidth || 800) / 2,
			Math.random() * (container.value.clientHeight || 600) -
				(container.value.clientHeight || 600) / 2,
			0
		)

		particle.userData.originalPosition = particle.position.clone()
		particle.userData.speed = 0.1 + Math.random() * 0.6
		particle.userData.phase = Math.random() * Math.PI * 2
		particle.userData.amplitude = 5 + Math.random() * 15

		scene.add(particle)
	}
}

const createRainyElements = () => {
	if (!container.value) return

	const width = container.value.clientWidth
	const height = container.value.clientHeight
	const baseCount = 600
	const rainCount = Math.max(100, Math.floor(baseCount * clamp(props.intensity, 0.2, 2)))

	const rainGeometry = new THREE.BufferGeometry()
	const positions = []

	for (let i = 0; i < rainCount; i++) {
		const x = Math.random() * width - width / 2
		const y = Math.random() * height - height / 2
		const z = 0
		const length = 15 + Math.random() * 10

		positions.push(x, y, z)
		positions.push(x, y - length, z)
	}

	rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

	const rainMaterial = new THREE.LineBasicMaterial({
		color: isDark.value ? 0x5a6f7f : 0x9dbbff,
		transparent: true,
		opacity: 0.8,
		linewidth: 2,
	})

	const rain = new THREE.LineSegments(rainGeometry, rainMaterial)
	rain.frustumCulled = false

	const velocities = new Float32Array(rainCount)
	for (let i = 0; i < rainCount; i++) {
		velocities[i] = 1 + Math.random() * 2
	}
	;(rain as any).velocities = velocities

	scene.add(rain)

	const umbrellaGeometry = new THREE.ConeGeometry(
		20 * props.particleSize,
		15 * props.particleSize,
		32
	)
	const umbrellaMaterial = new THREE.MeshBasicMaterial({
		color: 0xff4d4d,
		side: THREE.DoubleSide,
		transparent: true,
		opacity: 0.95,
	})
	const umbrella = new THREE.Mesh(umbrellaGeometry, umbrellaMaterial)
	umbrella.position.set(0, -200 * props.particleSize, 0)
	umbrella.rotation.x = Math.PI
	scene.add(umbrella)

	for (let i = 0; i < 3; i++) {
		const puddleGeometry = new THREE.CircleGeometry(15 + Math.random() * 20, 32)
		const puddleMaterial = new THREE.MeshBasicMaterial({
			color: isDark.value ? 0x3a4a5a : 0x7d9dbf,
			transparent: true,
			opacity: 0.3 + Math.random() * 0.2,
		})
		const puddle = new THREE.Mesh(puddleGeometry, puddleMaterial)
		puddle.position.set(
			Math.random() * width - width / 2,
			-height / 2 + 10 + Math.random() * 20,
			0
		)
		puddle.rotation.x = Math.PI / 2
		scene.add(puddle)
	}
}

const createSnowyElements = () => {
	if (!container.value) return

	if (!snowTexture) {
		snowTexture = createParticleTexture(
			'snow',
			Math.max(48, Math.floor(96 * props.particleSize)),
			isDark.value
		)
		snowTexture.needsUpdate = true
	}

	const width = container.value.clientWidth
	const height = container.value.clientHeight
	const baseCount = 300
	const snowCount = Math.max(50, Math.floor(baseCount * clamp(props.intensity, 0.2, 2)))

	const snowGeometry = new THREE.BufferGeometry()
	const snowPositions = new Float32Array(snowCount * 3)
	const snowVelocities = new Float32Array(snowCount)
	const snowSizes = new Float32Array(snowCount)

	for (let i = 0; i < snowCount; i++) {
		snowPositions[i * 3] = Math.random() * width - width / 2
		snowPositions[i * 3 + 1] = Math.random() * height - height / 2
		snowPositions[i * 3 + 2] = 0
		snowVelocities[i] = 0.05 + Math.random() * 0.15
		snowSizes[i] = 6 * props.particleSize + Math.random() * 6
	}

	snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3))
	snowGeometry.setAttribute('size', new THREE.BufferAttribute(snowSizes, 1))

	const snowMaterial = new THREE.PointsMaterial({
		size: 8 * props.particleSize,
		map: snowTexture || undefined,
		transparent: true,
		opacity: 0.9,
		depthWrite: false,
		color: isDark.value ? 0xcfdbe6 : 0xffffff,
		sizeAttenuation: false,
	})
	const snow = new THREE.Points(snowGeometry, snowMaterial)
	;(snow as any).velocities = snowVelocities
	snow.frustumCulled = false

	scene.add(snow)

	const snowmanGroup = new THREE.Group()

	const bottomGeometry = new THREE.SphereGeometry(15 * props.particleSize, 16, 16)
	const bottomMaterial = new THREE.MeshBasicMaterial({
		color: isDark.value ? 0xcfdbe6 : 0xffffff,
		transparent: true,
		opacity: 0.95,
	})
	const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial)
	bottom.position.y = -15 * props.particleSize

	const middleGeometry = new THREE.SphereGeometry(10 * props.particleSize, 16, 16)
	const middleMaterial = new THREE.MeshBasicMaterial({
		color: isDark.value ? 0xcfdbe6 : 0xffffff,
		transparent: true,
		opacity: 0.95,
	})
	const middle = new THREE.Mesh(middleGeometry, middleMaterial)
	middle.position.y = 5 * props.particleSize

	const headGeometry = new THREE.SphereGeometry(7 * props.particleSize, 16, 16)
	const headMaterial = new THREE.MeshBasicMaterial({
		color: isDark.value ? 0xcfdbe6 : 0xffffff,
		transparent: true,
		opacity: 0.95,
	})
	const head = new THREE.Mesh(headGeometry, headMaterial)
	head.position.y = 20 * props.particleSize

	for (let i = 0; i < 3; i++) {
		const buttonGeometry = new THREE.SphereGeometry(1 * props.particleSize, 8, 8)
		const buttonMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 })
		const button = new THREE.Mesh(buttonGeometry, buttonMaterial)
		button.position.set(
			0,
			-5 * props.particleSize + i * 8 * props.particleSize,
			6 * props.particleSize
		)
		middle.add(button)
	}

	const noseGeometry = new THREE.ConeGeometry(1.5 * props.particleSize, 4 * props.particleSize, 8)
	const noseMaterial = new THREE.MeshBasicMaterial({ color: 0xff8c00 })
	const nose = new THREE.Mesh(noseGeometry, noseMaterial)
	nose.position.set(0, 0, 4 * props.particleSize)
	nose.rotation.x = Math.PI / 2
	head.add(nose)

	snowmanGroup.add(bottom)
	snowmanGroup.add(middle)
	snowmanGroup.add(head)

	snowmanGroup.position.set(
		(container.value.clientWidth || 800) / 4,
		-(container.value.clientHeight || 600) / 3,
		0
	)

	scene.add(snowmanGroup)

	for (let i = 0; i < 4; i++) {
		const pileGeometry = new THREE.SphereGeometry(8 + Math.random() * 12, 16, 16)
		const pileMaterial = new THREE.MeshBasicMaterial({
			color: isDark.value ? 0xcfdbe6 : 0xffffff,
			transparent: true,
			opacity: 0.8 + Math.random() * 0.2,
		})
		const pile = new THREE.Mesh(pileGeometry, pileMaterial)
		pile.position.set(
			Math.random() * width - width / 2,
			-height / 2 + 10 + Math.random() * 30,
			0
		)
		pile.scale.set(1, 0.3 + Math.random() * 0.4, 1)
		scene.add(pile)
	}
}

const createCloudyElements = () => {
	if (!container.value) return

	if (!cloudTexture) {
		cloudTexture = createCloudTexture(128, isDark.value)
	}

	const w = container.value.clientWidth || 800
	const h = container.value.clientHeight || 600
	const sunAnchorLeftX = -w * 0.25
	const sunAnchorRightX = w * 0.25
	const sunAnchorY = -h * 0.25

	const cloudCount = props.weatherType === 'partly' ? 4 : 8
	for (let i = 0; i < cloudCount; i++) {
		const cloudGroup = new THREE.Group()

		const partCount = 6 + Math.floor(Math.random() * 4)
		for (let j = 0; j < partCount; j++) {
			const size = 6 + Math.random() * 8
			const cloudPartGeometry = new THREE.SphereGeometry(size, 16, 16)

			const cloudPartMaterial = new THREE.MeshBasicMaterial({
				map: cloudTexture,
				transparent: true,
				opacity: 0.6 + Math.random() * 0.3,
			})
			const cloudPart = new THREE.Mesh(cloudPartGeometry, cloudPartMaterial)
			cloudPart.position.set(Math.random() * 30 - 15, Math.random() * 15 - 7.5, 0)
			cloudPart.scale.set(1, 0.6 + Math.random() * 0.4, 1)
			cloudGroup.add(cloudPart)
		}

		if (props.weatherType === 'partly' && i < 2) {
			const anchorX = i === 0 ? sunAnchorLeftX : sunAnchorRightX
			cloudGroup.position.set(
				anchorX + (Math.random() * (w * 0.12) - w * 0.06),
				sunAnchorY + (Math.random() * (h * 0.12) - h * 0.06),
				0
			)
			cloudGroup.userData.scaleFactor = 1.0 + Math.random() * 0.6
			cloudGroup.children.forEach((child: any) => {
				if (child.material) {
					child.material.opacity = 0.4 + Math.random() * 0.3
					child.material.color.set(isDark.value ? 0x6e7c86 : 0xd1dbe8)
				}
			})
		} else {
			cloudGroup.position.set(Math.random() * w - w / 2, Math.random() * h - h / 2, 0)
			cloudGroup.userData.scaleFactor = 0.8 + Math.random() * 0.4
		}

		cloudGroup.userData.speed = 0.03 + Math.random() * 0.15
		cloudGroup.userData.direction = Math.random() > 0.5 ? 1 : -1
		cloudGroup.scale.set(
			cloudGroup.userData.scaleFactor,
			cloudGroup.userData.scaleFactor,
			cloudGroup.userData.scaleFactor
		)

		scene.add(cloudGroup)
	}
}

const createStormyElements = () => {
	if (!container.value) return

	for (let i = 0; i < 5; i++) {
		const lightningGeometry = createLightningGeometry()
		const lightningMaterial = new THREE.LineBasicMaterial({
			color: 0xffffcc,
			transparent: true,
			opacity: 0.85,
			linewidth: 2 + Math.random() * 2,
		})

		const lightning = new THREE.Line(lightningGeometry, lightningMaterial)

		lightning.position.set(
			Math.random() * (container.value.clientWidth || 800) -
				(container.value.clientWidth || 800) / 2,
			(container.value.clientHeight || 600) / 2 + 50,
			0
		)

		lightning.userData.visible = Math.random() > 0.8
		lightning.userData.flashTimer = 0
		lightning.userData.flashDuration = 0.3 + Math.random() * 1.5
		lightning.userData.flashProbability = 0.005 + Math.random() * 0.01

		scene.add(lightning)
	}

	for (let i = 0; i < 50; i++) {
		const dropGeometry = new THREE.CylinderGeometry(
			0.5 * props.particleSize,
			0.5 * props.particleSize,
			20 * props.particleSize,
			8
		)
		const dropMaterial = new THREE.MeshBasicMaterial({
			color: isDark.value ? 0x88aaff : 0xaaaaff,
			transparent: true,
			opacity: 0.5 + Math.random() * 0.3,
			side: THREE.DoubleSide,
		})
		const drop = new THREE.Mesh(dropGeometry, dropMaterial)

		drop.position.set(
			Math.random() * (container.value.clientWidth || 800) -
				(container.value.clientWidth || 800) / 2,
			Math.random() * (container.value.clientHeight || 600) -
				(container.value.clientHeight || 600) / 2,
			0
		)
		drop.rotation.x = Math.PI / 2

		drop.userData.windOffset = Math.random() * 30 - 15
		const baseSpeed = 0.5 + props.intensity * 1.5
		const speedRange = 0.5 + props.intensity * 1.5
		drop.userData.speed = baseSpeed + Math.random() * speedRange
		drop.userData.rotationSpeed = 0.01 + Math.random() * 0.03

		scene.add(drop)
	}

	for (let i = 0; i < 3; i++) {
		const stormCloudGroup = new THREE.Group()

		for (let j = 0; j < 8; j++) {
			const cloudPartGeometry = new THREE.SphereGeometry(10 + Math.random() * 15, 16, 16)
			const cloudPartMaterial = new THREE.MeshBasicMaterial({
				color: isDark.value ? 0x3a3a4a : 0x5a5a6a,
				transparent: true,
				opacity: 0.4 + Math.random() * 0.3,
			})
			const cloudPart = new THREE.Mesh(cloudPartGeometry, cloudPartMaterial)
			cloudPart.position.set(Math.random() * 50 - 25, Math.random() * 20 - 10, 0)
			cloudPart.scale.set(1, 0.4 + Math.random() * 0.3, 1)
			stormCloudGroup.add(cloudPart)
		}

		stormCloudGroup.position.set(
			Math.random() * (container.value.clientWidth || 800) -
				(container.value.clientWidth || 800) / 2,
			(container.value.clientHeight || 600) / 2 - 100,
			-10
		)
		stormCloudGroup.userData.speed = 0.01 + Math.random() * 0.05
		stormCloudGroup.userData.direction = Math.random() > 0.5 ? 1 : -1

		scene.add(stormCloudGroup)
	}
}

const animate = () => {
	if (!scene || !renderer || !clock) return

	animationFrameId = requestAnimationFrame(animate)

	if (isPaused) {
		if (!isAnimating) {
			renderer.render(scene, camera)
		}
		return
	}

	const delta = clock.getDelta()
	const width = container.value?.clientWidth ?? 800
	const height = container.value?.clientHeight ?? 600

	if (!isAnimating) {
		isAnimating = true
	}

	scene.children.forEach((obj) => {
		if (obj.type === 'Mesh' && obj.userData.originalPosition) {
			const originalPosition = obj.userData.originalPosition
			const speed = obj.userData.speed
			const phase = obj.userData.phase

			obj.position.y = originalPosition.y + Math.sin(phase + Date.now() * 0.001 * speed) * 10
			obj.userData.phase += 0.01
		}

		if (obj instanceof THREE.LineSegments && (obj as any).velocities) {
			const positionsAttr = obj.geometry.attributes.position
			const velocities = (obj as any).velocities as Float32Array
			const arr = positionsAttr.array as Float32Array

			for (let i = 0; i < velocities.length; i++) {
				const idx = i * 6
				let x1 = arr[idx]!
				let y1 = arr[idx + 1]!
				let z1 = arr[idx + 2]!
				let x2 = arr[idx + 3]!
				let y2 = arr[idx + 4]!
				let z2 = arr[idx + 5]!

				x1 += (props.wind?.x || 0) * delta * 10
				y1 -= velocities[i]! * delta * 60
				z1 += (props.wind?.y || 0) * delta * 10
				x2 += (props.wind?.x || 0) * delta * 10
				y2 -= velocities[i]! * delta * 60
				z2 += (props.wind?.y || 0) * delta * 10

				if (y2 < -(height / 2) - 40) {
					const newX = Math.random() * width - width / 2
					const length = 15 + Math.random() * 10
					arr[idx]! = newX
					arr[idx + 1]! = height / 2 + Math.random() * 20
					arr[idx + 2]! = Math.random() * 20 - 10
					arr[idx + 3]! = newX
					arr[idx + 4]! = arr[idx + 1]! - length
					arr[idx + 5]! = arr[idx + 2]!
				} else {
					arr[idx]! = x1
					arr[idx + 1]! = y1
					arr[idx + 2]! = z1
					arr[idx + 3]! = x2
					arr[idx + 4]! = y2
					arr[idx + 5]! = z2
				}
			}
			positionsAttr.needsUpdate = true
		}

		if (obj instanceof THREE.Points && (obj as any).velocities) {
			const positionsAttr = (obj.geometry as THREE.BufferGeometry)?.attributes?.position as
				| THREE.BufferAttribute
				| undefined
			const velocities = (obj as any).velocities as Float32Array
			if (positionsAttr?.array) {
				const arr = positionsAttr.array as Float32Array
				const stride = positionsAttr.itemSize || 3
				const count = positionsAttr.count

				for (let i = 0; i < count; i++) {
					const idx = i * stride
					const x = arr[idx]!
					let y = arr[idx + 1]!

					arr[idx] =
						x + (props.wind?.x || 0) * delta + Math.sin(Date.now() * 0.001 + i) * 0.05
					y = y - velocities[i]! * delta * 60 - (props.wind?.y || 0) * delta * 10
					if (y < -(height / 2) - 40) {
						arr[idx + 1] = height / 2 + Math.random() * 20
						arr[idx] = Math.random() * width - width / 2
					} else {
						arr[idx + 1] = y
					}
				}
				positionsAttr.needsUpdate = true
			}
		}

		if (obj.type === 'Group' && obj.userData.direction) {
			const speed = obj.userData.speed
			const direction = obj.userData.direction
			obj.position.x +=
				(direction * speed * 0.1 + (props.wind?.x || 0) * 0.05) * props.animationSpeed
			if (obj.position.x > (container.value?.clientWidth || 800) / 2 + 50) {
				obj.position.x = -((container.value?.clientWidth || 800) / 2) - 50
			} else if (obj.position.x < -((container.value?.clientWidth || 800) / 2) - 50) {
				obj.position.x = (container.value?.clientWidth || 800) / 2 + 50
			}
		}

		if (obj.type === 'Line' && obj.userData.flashTimer !== undefined) {
			obj.userData.flashTimer += delta
			if (Math.random() < 0.01) {
				obj.visible = true
				obj.userData.flashTimer = 0
			} else if (obj.userData.flashTimer > obj.userData.flashDuration) {
				obj.visible = false
			}
		}

		if (obj.type === 'Mesh' && obj.userData.windOffset !== undefined) {
			const speed = obj.userData.speed || 1
			const windOffset = obj.userData.windOffset || 0
			const rotationSpeed = obj.userData.rotationSpeed || 0

			obj.position.y -= speed * 0.05 * delta * 60
			obj.position.x +=
				Math.sin(Date.now() * 0.001 + windOffset * 0.1) * 0.5 + (props.wind?.x || 0) * 0.1

			if (rotationSpeed) {
				obj.rotation.z += rotationSpeed * delta
			}

			if (obj.position.y < -((container.value?.clientHeight || 600) / 2) - 20) {
				obj.position.y = (container.value?.clientHeight || 600) / 2 + 10
				obj.position.x =
					Math.random() * (container.value?.clientWidth || 800) -
					(container.value?.clientWidth || 800) / 2
			}
		}

		if (obj.type === 'Mesh' && obj.userData.originalPosition && obj.userData.amplitude) {
			const originalPosition = obj.userData.originalPosition
			const speed = obj.userData.speed
			const phase = obj.userData.phase
			const amplitude = obj.userData.amplitude

			obj.position.y =
				originalPosition.y + Math.sin(phase + Date.now() * 0.001 * speed) * amplitude
			obj.position.x =
				originalPosition.x +
				Math.cos(phase + Date.now() * 0.0005 * speed) * (amplitude * 0.3)
			obj.userData.phase += 0.01
		}
	})

	renderer.render(scene, camera)
}

const handleResize = () => {
	if (!container.value || !camera || !renderer) return

	const width = container.value.clientWidth
	const height = container.value.clientHeight

	camera.left = -width / 2
	camera.right = width / 2
	camera.top = height / 2
	camera.bottom = -height / 2
	camera.updateProjectionMatrix()

	renderer.setSize(width, height)

	const ground = scene.getObjectByName(groundPlaneName) as THREE.Mesh | undefined
	if (ground && container.value) {
		ground.position.set(0, -container.value.clientHeight / 2 + 20, -1)
		ground.geometry = new THREE.PlaneGeometry(width * 2, 200, 32, 32)
	}
}

const cleanup = () => {
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId)
		animationFrameId = null
	}
	if (container.value) {
		container.value.removeEventListener('mousemove', handleMouseMove)
		container.value.removeEventListener('click', handleClick)
	}
	if (renderer && container.value && renderer.domElement && renderer.domElement.parentElement) {
		renderer.domElement.parentElement.removeChild(renderer.domElement)
	}
	if (renderer) {
		try {
			renderer.dispose()
		} catch {}
	}
	if (rainTexture) {
		try {
			rainTexture.dispose()
		} catch {}
		rainTexture = null
	}
	if (snowTexture) {
		try {
			snowTexture.dispose()
		} catch {}
		snowTexture = null
	}

	if (cloudTexture) {
		try {
			cloudTexture.dispose()
		} catch {}
		cloudTexture = null
	}

	if (scene) {
		scene.traverse((object: THREE.Object3D) => {
			if (object instanceof THREE.Mesh) {
				try {
					if (object.geometry) (object.geometry as any).dispose?.()
				} catch {}
				try {
					if (object.material) {
						if (Array.isArray(object.material)) {
							object.material.forEach((m) => (m as any).dispose?.())
						} else {
							;(object.material as any).dispose?.()
						}
					}
				} catch {}
			}
		})
	}

	if (typeof document !== 'undefined') {
		const styleEl = document.getElementById('interactive-debug-styles')
		if (styleEl) {
			document.head.removeChild(styleEl)
		}
	}
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

watch(
	() => props.weatherType,
	(newWeatherType) => {
		applyFogForWeather(newWeatherType)
		createInteractiveElements()
	}
)

watch(
	() => isDark.value,
	(val) => {
		if (renderer && renderer.domElement) {
			renderer.domElement.style.opacity = val ? '0.28' : '0.6'
		}
		const ground = scene?.getObjectByName(groundPlaneName) as THREE.Mesh | undefined
		if (ground) {
			;(ground.material as THREE.MeshBasicMaterial).color.set(
				isDark.value ? 0x071219 : 0xeceff6
			)
		}
		if (rainTexture) {
			rainTexture.dispose()
			rainTexture = null
		}
		if (snowTexture) {
			snowTexture.dispose()
			snowTexture = null
		}
		if (cloudTexture) {
			cloudTexture.dispose()
			cloudTexture = null
		}
		createInteractiveElements()
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

const setWind = (w: { x: number; y: number }) => {
	;(props as any).wind = { x: w.x || 0, y: w.y || 0 }
}

const setIntensity = (i: number) => {
	const val = clamp(i, 0.2, 2)
	;(props as any).intensity = val
	createInteractiveElements()
}

const setParticleSize = (s: number) => {
	const val = Math.max(0.2, s)
	;(props as any).particleSize = val
	createInteractiveElements()
}

const setAnimationSpeed = (s: number) => {
	const val = Math.max(0.1, Math.min(2.0, s))
	;(props as any).animationSpeed = val
}

const pause = () => {
	isPaused = true
}

const resume = () => {
	isPaused = false
}

defineExpose({
	updateWeather: createInteractiveElements,
	getScene: () => scene,
	setWind,
	setIntensity,
	setParticleSize,
	setAnimationSpeed,
	pause,
	resume,
})
</script>

<style scoped>
.interactive-weather-container {
	pointer-events: none;
}

.debug-border {
	pointer-events: none;
	border: 1px dashed rgba(255, 255, 255, 0.06);
}

.interactive-weather-container canvas {
	pointer-events: none;
	opacity: 0.6;
}

.weather-display {
	position: fixed;
	top: 20px;
	right: 20px;
	display: flex;
	align-items: center;
	gap: 8px;
	background: rgba(0, 0, 0, 0.5);
	padding: 8px 12px;
	border-radius: 8px;
	color: white;
	font-size: 14px;
	z-index: 30;
}

.weather-icon {
	width: 32px;
	height: 32px;
}

.weather-text {
	font-weight: 500;
}
</style>

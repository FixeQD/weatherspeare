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
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import * as THREE from 'three'
import { useTheme } from '~/composables/useTheme'
import { useWeatherTextures } from '~/composables/3D/useWeatherTextures'
import { useCelestialBodies } from '~/composables/3D/useCelestialBodies'
import { useAISeasonalParticles } from '~/composables/3D/useAISeasonalParticles'
import { useWeatherStore } from '~/stores/weatherStore'

const { isDark } = useTheme()
const { createParticleTexture, createCloudTexture, createLightningGeometry } = useWeatherTextures()
const { updateCelestialBodies: updateBodies } = useCelestialBodies()
const { createParticles: createAIParticles, updateParticles: updateAIParticles } =
	useAISeasonalParticles()
const weatherStore = useWeatherStore()

const container = ref<HTMLElement | null>(null)
let snowTexture: THREE.Texture | null = null
let rainTexture: THREE.Texture | null = null
let splashTexture: THREE.Texture | null = null

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
	sunPosition: {
		type: Number,
		default: 0, // 0 = sunrise, 0.5 = zenith, 1 = sunset
	},
	moonPosition: {
		type: Number,
		default: 0,
	},
	isSunUp: {
		type: Boolean,
		default: true,
	},
	isMoonUp: {
		type: Boolean,
		default: false,
	},
	moonPhase: {
		type: String,
		default: 'Full Moon',
	},
	moonIllumination: {
		type: Number,
		default: 100,
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
		watch(
			() => [props.sunPosition, props.moonPosition, props.isSunUp, props.isMoonUp],
			() => {
				updateCelestialBodies()
			}
		)

		watch(
			() => weatherStore.sceneConfig,
			(newConfig) => {
				if (newConfig?.seasonalEffect?.active) {
					createAIParticles(scene, width, height, newConfig.seasonalEffect)
				}
			},
			{ immediate: true }
		)

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

	updateCelestialBodies()

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

const updateCelestialBodies = () => {
	if (!scene || !container.value) return

	const width = container.value.clientWidth || 800
	const height = container.value.clientHeight || 600

	updateBodies(scene, width, height, {
		sunPosition: props.sunPosition,
		moonPosition: props.moonPosition,
		isSunUp: props.isSunUp,
		isMoonUp: props.isMoonUp,
		moonPhase: props.moonPhase,
		moonIllumination: props.moonIllumination,
	})
}

const createSunnyElements = () => {
	if (!container.value) return

	const baseCount = props.weatherType === 'partly' ? 50 : 30
	const particleCount = Math.max(15, Math.floor(baseCount * props.intensity))

	const glowTexture = createParticleTexture('glow', 64)

	for (let i = 0; i < particleCount; i++) {
		const hue = 0.1 + Math.random() * 0.05
		const saturation = 0.8 + Math.random() * 0.2
		const lightness = 0.7 + Math.random() * 0.2
		const particleColor = new THREE.Color().setHSL(hue, saturation, lightness)

		const particleMaterial = new THREE.SpriteMaterial({
			map: glowTexture,
			color: particleColor,
			transparent: true,
			opacity: 0.5 + Math.random() * 0.4,
			blending: THREE.AdditiveBlending,
		})
		const particle = new THREE.Sprite(particleMaterial)

		const size = 1.0 * props.particleSize + Math.random() * 2
		particle.scale.set(size, size, 1)

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
	const splashCount = 150
	const splashGeometry = new THREE.BufferGeometry()
	const splashPositions = new Float32Array(splashCount * 3)
	const splashSizes = new Float32Array(splashCount)
	const splashAlphas = new Float32Array(splashCount)

	for (let i = 0; i < splashCount; i++) {
		splashPositions[i * 3] = Math.random() * width - width / 2
		splashPositions[i * 3 + 1] = -height / 2 + Math.random() * 20
		splashPositions[i * 3 + 2] = 10
		splashSizes[i] = 2 + Math.random() * 3
		splashAlphas[i] = Math.random()
	}
	splashGeometry.setAttribute('position', new THREE.BufferAttribute(splashPositions, 3))
	splashGeometry.setAttribute('size', new THREE.BufferAttribute(splashSizes, 1))
	splashGeometry.setAttribute('alpha', new THREE.BufferAttribute(splashAlphas, 1))

	if (!splashTexture) {
		splashTexture = createParticleTexture('splash', 32, isDark.value)
	}

	const splashMaterial = new THREE.PointsMaterial({
		color: isDark.value ? 0x88aabb : 0xaaccff,
		size: 5,
		map: splashTexture,
		transparent: true,
		opacity: 0.8,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	})

	const splashes = new THREE.Points(splashGeometry, splashMaterial)
	splashes.name = 'splashes'
	scene.add(splashes)
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
		;(snowSizes as any)[i] = Math.random() * Math.PI * 2
	}

	// We need a phase array for sway
	const snowPhases = new Float32Array(snowCount)
	for (let i = 0; i < snowCount; i++) {
		snowPhases[i] = Math.random() * Math.PI * 2
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
	;(snow as any).phases = snowPhases
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

	const cloudCount = props.weatherType === 'partly' ? 3 : 8
	for (let i = 0; i < cloudCount; i++) {
		const cloudGroup = new THREE.Group()

		const partCount = 8 + Math.floor(Math.random() * 4)
		for (let j = 0; j < partCount; j++) {
			const size = 8 + Math.random() * 10
			const cloudPartGeometry = new THREE.SphereGeometry(size, 16, 16)

			const cloudPartMaterial = new THREE.MeshBasicMaterial({
				map: cloudTexture,
				transparent: true,
				opacity: 0.5 + Math.random() * 0.3,
				depthWrite: false,
			})
			const cloudPart = new THREE.Mesh(cloudPartGeometry, cloudPartMaterial)
			cloudPart.position.set(
				Math.random() * 40 - 20,
				Math.random() * 20 - 10,
				Math.random() * 10 - 5
			)
			cloudPart.scale.set(1, 0.7 + Math.random() * 0.3, 1)
			cloudGroup.add(cloudPart)
		}

		if (props.weatherType === 'partly' && i < 2) {
			const anchorX = i === 0 ? sunAnchorLeftX : sunAnchorRightX
			cloudGroup.position.set(
				anchorX + (Math.random() * (w * 0.12) - w * 0.06),
				sunAnchorY + (Math.random() * (h * 0.12) - h * 0.06),
				0
			)
			cloudGroup.userData.scaleFactor = 0.8 + Math.random() * 0.4
			cloudGroup.children.forEach((child: any) => {
				if (child.material) {
					child.material.opacity = 0.3 + Math.random() * 0.2
					child.material.color.set(isDark.value ? 0x6e7c86 : 0xd1dbe8)
				}
			})
		} else {
			cloudGroup.position.set(Math.random() * w - w / 2, Math.random() * h - h / 2, 0)
			cloudGroup.userData.scaleFactor = 0.6 + Math.random() * 0.4
		}

		cloudGroup.userData.speed = 0.01 + Math.random() * 0.04
		cloudGroup.userData.direction = Math.random() > 0.5 ? 1 : -1
		cloudGroup.userData.rotationSpeed = (Math.random() - 0.5) * 0.01
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

	for (let i = 0; i < 5; i++) {
		const stormCloudGroup = new THREE.Group()

		const partCount = 12 + Math.floor(Math.random() * 6)
		for (let j = 0; j < partCount; j++) {
			const size = 12 + Math.random() * 16
			const cloudPartGeometry = new THREE.SphereGeometry(size, 16, 16)
			const cloudPartMaterial = new THREE.MeshBasicMaterial({
				color: isDark.value ? 0x2a2a3a : 0x4a4a5a,
				transparent: true,
				opacity: 0.5 + Math.random() * 0.4,
				depthWrite: false,
			})
			const cloudPart = new THREE.Mesh(cloudPartGeometry, cloudPartMaterial)
			cloudPart.position.set(
				Math.random() * 60 - 30,
				Math.random() * 30 - 15,
				Math.random() * 20 - 10
			)
			cloudPart.scale.set(1, 0.5 + Math.random() * 0.4, 1)
			stormCloudGroup.add(cloudPart)
		}

		stormCloudGroup.position.set(
			Math.random() * (container.value.clientWidth || 800) -
				(container.value.clientWidth || 800) / 2,
			(container.value.clientHeight || 600) / 2 - 100,
			-10
		)
		stormCloudGroup.userData.speed = 0.02 + Math.random() * 0.08
		stormCloudGroup.userData.direction = Math.random() > 0.5 ? 1 : -1
		stormCloudGroup.userData.rotationSpeed = (Math.random() - 0.5) * 0.02

		scene.add(stormCloudGroup)
	}
}

const animate = () => {
	if (!scene || !renderer || !clock) return

	animationFrameId = requestAnimationFrame(animate)

	updateCelestialBodies()

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

	const aiConfig = weatherStore.sceneConfig
	if (aiConfig?.seasonalEffect?.active) {
		updateAIParticles(delta, width, height)
	}

	scene.children.forEach((obj) => {
		if ((obj.type === 'Mesh' || obj.type === 'Sprite') && obj.userData.originalPosition) {
			const originalPosition = obj.userData.originalPosition
			const speed = obj.userData.speed
			const phase = obj.userData.phase

			const windX = (props.wind?.x || 0) * 20

			obj.position.x = originalPosition.x + Math.sin(phase + Date.now() * 0.0005) * 5 + windX
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

				const vel = velocities[i]
				const vx = props.wind?.x || 0
				const vy = props.wind?.y || 0

				x1 += vx * delta * 10
				if (vel !== undefined) y1 -= vel * delta * 60
				z1 += vy * delta * 10
				x2 += vx * delta * 10
				if (vel !== undefined) y2 -= vel * delta * 60
				z2 += vy * delta * 10

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

		if (obj.name === 'splashes') {
			const geometry = (obj as THREE.Points).geometry
			if (geometry && geometry.attributes.position && geometry.attributes.alpha) {
				const positions = geometry.attributes.position.array as Float32Array
				const alphas = geometry.attributes.alpha.array as Float32Array
				const count = positions.length / 3

				for (let i = 0; i < count; i++) {
					const alphaVal = alphas[i]
					if (alphaVal !== undefined) {
						alphas[i] = alphaVal - 0.05
						if (alphas[i]! <= 0) {
							alphas[i] = 1
							positions[i * 3] = Math.random() * width - width / 2
							positions[i * 3 + 1] = -height / 2 + Math.random() * 10
						}
					}
				}
				geometry.attributes.alpha.needsUpdate = true
			}
		}

		if (obj instanceof THREE.Points && (obj as any).velocities && (obj as any).phases) {
			const positionsAttr = (obj.geometry as THREE.BufferGeometry)?.attributes?.position as
				| THREE.BufferAttribute
				| undefined
			const velocities = (obj as any).velocities as Float32Array
			if (positionsAttr?.array) {
				const arr = positionsAttr.array as Float32Array
				const stride = positionsAttr.itemSize || 3
				const count = positionsAttr.count

				const w = container.value?.clientWidth || 800
				const h = container.value?.clientHeight || 600

				for (let i = 0; i < count; i++) {
					const idx = i * stride
					const x = arr[idx]!
					let y = arr[idx + 1]!

					arr[idx] =
						x + (props.wind?.x || 0) * delta + Math.sin(Date.now() * 0.001 + i) * 0.05
					y = y - velocities[i]! * delta * 60 - (props.wind?.y || 0) * delta * 10
					if (y < -(h / 2) - 40) {
						arr[idx + 1] = h / 2 + Math.random() * 20
						arr[idx] = Math.random() * w - w / 2
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
			const rotationSpeed = obj.userData.rotationSpeed || 0

			obj.position.x +=
				(direction * speed * 0.1 + (props.wind?.x || 0) * 0.05) * props.animationSpeed

			if (rotationSpeed) {
				if (obj instanceof THREE.Sprite) {
					obj.material.rotation += rotationSpeed * delta
				} else {
					obj.rotation.z += rotationSpeed * delta
				}
			}

			const w = container.value?.clientWidth || 800
			if (obj.position.x > w / 2 + 100) {
				obj.position.x = -(w / 2) - 100
			} else if (obj.position.x < -(w / 2) - 100) {
				obj.position.x = w / 2 + 100
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
				if (obj instanceof THREE.Sprite) {
					obj.material.rotation += rotationSpeed * delta
				} else {
					obj.rotation.z += rotationSpeed * delta
				}
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

<template>
	<div
		ref="sceneContainer"
		class="three-scene-container pointer-events-none fixed inset-0 z-10"
		:style="{
			opacity: 0.5,
			outline: props.debugBorder ? '3px dashed rgba(255,0,0,0.9)' : 'none',
		}"></div>
	<div
		v-if="props.debugBorder"
		class="three-debug-label fixed top-2 left-2 z-50 rounded bg-black/40 px-2 py-1 text-xs text-red-400">
		ThreeScene debug border enabled
	</div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as THREE from 'three'
import { useTheme } from '~/composables/useTheme'
const { isDark } = useTheme()
// @ts-ignore
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
// @ts-ignore
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
// @ts-ignore
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'

const sceneContainer = ref<HTMLElement | null>(null)
const scrollPosition = ref({ x: 0, y: 0 })

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let animationFrameId: number
let clock: THREE.Clock
let composer: any = null
let bloomPass: any = null
const BLOOM_PARAMS = {
	strength: 0.25,
	radius: 0.3,
	threshold: 0.3,
}
let hasStartedAnimating = false
let hemiLight: THREE.HemisphereLight
let ambientLight: THREE.AmbientLight
let directionalLight: THREE.DirectionalLight

let skyTexture: THREE.Texture | null = null
let sunHaloTexture: THREE.Texture | null = null
let sunLight: THREE.PointLight | null = null
let halo: THREE.Sprite | null = null

let weatherObjects: THREE.Object3D[] = []

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
	windDegree: {
		type: Number,
		default: 0,
	},
})

const emit = defineEmits(['scene-ready'])

const getPalette = (weather: string, dark = false): [string, string, string] => {
	switch (weather) {
		case 'clear':
			return dark ? ['#071427', '#030b11', '#01060a'] : ['#bfe7ff', '#7fb4dd', '#56718f']
		case 'rain':
		case 'cloudy':
			return dark ? ['#1b2a33', '#0d1b24', '#071018'] : ['#7a92ab', '#4a6b87', '#17242a']
		case 'storm':
			return dark ? ['#07090b', '#020305', '#000000'] : ['#4a4a4a', '#303233', '#0f1112']
		case 'snow':
			return dark ? ['#1b2730', '#12202a', '#091219'] : ['#dbeefe', '#9fbfe0', '#6f8a9b']
		default:
			return dark ? ['#071427', '#030b11', '#01060a'] : ['#bfe7ff', '#7fb4dd', '#56718f']
	}
}

const createGradientTexture = (
	w = 1024,
	h = 1024,
	dark = false,
	palette?: [string, string, string]
) => {
	const canvas = document.createElement('canvas')
	canvas.width = w
	canvas.height = h
	const ctx = canvas.getContext('2d')!
	const grad = ctx.createLinearGradient(0, 0, 0, h)
	if (palette && palette.length === 3) {
		grad.addColorStop(0, palette[0])
		grad.addColorStop(0.6, palette[1])
		grad.addColorStop(1, palette[2])
	} else if (dark) {
		grad.addColorStop(0, '#071427')
		grad.addColorStop(0.6, '#030b11')
		grad.addColorStop(1, '#01060a')
	} else {
		grad.addColorStop(0, '#bfe7ff')
		grad.addColorStop(0.6, '#7fb4dd')
		grad.addColorStop(1, '#56718f')
	}
	ctx.fillStyle = grad
	ctx.fillRect(0, 0, w, h)
	const tex = new THREE.CanvasTexture(canvas)
	tex.needsUpdate = true
	;(tex as any).__paletteTarget = (palette && palette[2]) || null
	return tex
}

const createSpriteTexture = (size = 512) => {
	const canvas = document.createElement('canvas')
	canvas.width = size
	canvas.height = size
	const ctx = canvas.getContext('2d')!

	const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
	grad.addColorStop(0, 'rgba(255,255,255,0.9)')
	grad.addColorStop(0.6, 'rgba(255,140,30,0.25)')
	grad.addColorStop(1, 'rgba(0,0,0,0)')
	ctx.fillStyle = grad
	ctx.fillRect(0, 0, size, size)
	const tex = new THREE.CanvasTexture(canvas)
	tex.needsUpdate = true
	return tex
}

const initScene = () => {
	console.debug('[ThreeScene] initScene called')
	if (!sceneContainer.value) {
		console.warn('[ThreeScene] sceneContainer is not mounted yet.')
		return
	}

	scene = new THREE.Scene()
	console.debug('[ThreeScene] scene created')

	skyTexture = createGradientTexture(1024, 1024, isDark.value)
	scene.background = skyTexture
	scene.fog = new THREE.Fog(isDark.value ? 0x0b1418 : 0x17242a, 8, 60)

	function applyTheme(dark: boolean) {
		if (skyTexture) {
			try {
				skyTexture.dispose()
			} catch (e) {}
			skyTexture = null
		}
		skyTexture = createGradientTexture(1024, 1024, dark)
		scene.background = skyTexture

		const fogColor = dark ? 0x0b1418 : 0x17242a
		if (scene.fog) {
			const f = scene.fog as THREE.Fog
			f.color.setHex(fogColor)
			f.near = 8
			f.far = 60
		} else {
			scene.fog = new THREE.Fog(fogColor, 8, 60)
		}

		if (hemiLight) {
			hemiLight.color.setHex(dark ? 0x283f54 : 0x87bfff)
			;(hemiLight as any).groundColor.setHex(dark ? 0x081116 : 0x444140)
		}
		if (ambientLight) ambientLight.intensity = dark ? 0.22 : 0.28
		if (directionalLight) directionalLight.intensity = dark ? 0.6 : 0.7

		if (bloomPass) {
			bloomPass.strength = dark ? 0.18 : BLOOM_PARAMS.strength
			bloomPass.radius = dark ? 0.2 : BLOOM_PARAMS.radius
			bloomPass.threshold = dark ? 0.6 : BLOOM_PARAMS.threshold
		}

		renderer.domElement.style.opacity = dark ? '0.22' : '0.35'
	}

	camera = new THREE.PerspectiveCamera(
		75,
		sceneContainer.value.clientWidth / sceneContainer.value.clientHeight,
		0.1,
		1000
	)
	camera.position.z = 5
	console.debug('[ThreeScene] camera positioned at', camera.position)

	renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
	renderer.setSize(sceneContainer.value.clientWidth, sceneContainer.value.clientHeight)
	renderer.setPixelRatio(window.devicePixelRatio)
	renderer.domElement.style.opacity = '0.35'
	renderer.domElement.style.pointerEvents = 'none'
	renderer.setClearColor(0x000000, 0)
	sceneContainer.value.appendChild(renderer.domElement)
	console.debug('[ThreeScene] renderer appended to container', renderer.domElement)

	// @ts-ignore
	composer = new EffectComposer(renderer)
	// @ts-ignore
	const renderPass = new RenderPass(scene, camera)
	// @ts-ignore
	bloomPass = new UnrealBloomPass(
		new THREE.Vector2(sceneContainer.value.clientWidth, sceneContainer.value.clientHeight),
		BLOOM_PARAMS.strength,
		BLOOM_PARAMS.radius,
		BLOOM_PARAMS.threshold
	)
	composer.addPass(renderPass)
	composer.addPass(bloomPass)

	clock = new THREE.Clock()

	hemiLight = new THREE.HemisphereLight(0x87bfff, 0x444140, 0.6)
	scene.add(hemiLight)

	ambientLight = new THREE.AmbientLight(0xffffff, 0.28)
	scene.add(ambientLight)

	directionalLight = new THREE.DirectionalLight(0xffffff, isDark.value ? 0.6 : 0.7)
	directionalLight.position.set(5, 10, 7)
	directionalLight.castShadow = false
	scene.add(directionalLight)

	applyTheme(isDark.value)
	watch(isDark, (val) => applyTheme(val))

	if (props.debugBorder) {
		const axesHelper = new THREE.AxesHelper(5)
		scene.add(axesHelper)
		console.debug('[ThreeScene] axes helper added')
	}

	console.debug('[ThreeScene] creating initial weather objects for', props.weatherType)
	createWeatherObjects()

	animate()

	emit('scene-ready')
	console.debug('[ThreeScene] scene-ready emitted')

	if (props.debugBorder && typeof document !== 'undefined') {
		const styleId = 'three-debug-styles'
		if (!document.getElementById(styleId)) {
			const styleEl = document.createElement('style')
			styleEl.id = styleId
			styleEl.innerHTML = `
				.three-scene-container { outline: 3px dashed rgba(255,0,0,0.9) !important; }
				.interactive-weather-container { outline: 3px dashed rgba(0,255,0,0.9) !important; }
				.three-debug-label { position: fixed; top: 8px; left: 8px; z-index: 9999; font-size: 12px; color: rgba(255,255,255,0.95); background: rgba(0,0,0,0.36); padding: 4px 8px; border-radius: 4px; }
			`
			document.head.appendChild(styleEl)
			console.debug('[ThreeScene] debug styles injected')
		}
	}
}

const createWeatherObjects = (clearPrev = true, initialOpacity = 1, forcedType?: string) => {
	if (clearPrev) {
		weatherObjects.forEach((obj) => scene.remove(obj))
		weatherObjects = []
	}

	const target = forcedType || props.weatherType

	switch (target) {
		case 'clear':
			createClearSky(initialOpacity)
			break
		case 'partly':
			createPartlyCloudySky(initialOpacity)
			break
		case 'rain':
			break
		case 'snow':
			createSnow(initialOpacity)
			break
		case 'cloudy':
			createCloudySky(initialOpacity)
			break
		case 'storm':
			createStorm(initialOpacity)
			break
		default:
			createClearSky(initialOpacity)
	}
}

const fadeTransitionToWeather = (target: string, duration = 800) => {
	if (!sceneContainer.value) {
		createWeatherObjects(true, 1, target)
		return
	}

	const overlay = document.createElement('div')
	overlay.style.position = 'absolute'
	overlay.style.inset = '0'
	overlay.style.background = isDark.value ? '#000' : '#fff'
	overlay.style.opacity = '0'
	overlay.style.transition = `opacity ${duration}ms ease`
	overlay.style.pointerEvents = 'none'
	overlay.style.zIndex = '9999'
	sceneContainer.value.appendChild(overlay)

	void overlay.offsetWidth
	overlay.style.opacity = '1'

	const onFadeIn = () => {
		overlay.removeEventListener('transitionend', onFadeIn)

		const palette = getPalette(target, isDark.value)
		const newSky = createGradientTexture(1024, 1024, isDark.value, palette)
		if (skyTexture) {
			try {
				skyTexture.dispose()
			} catch (e) {}
		}
		skyTexture = newSky
		scene.background = newSky
		if (scene.fog) {
			const f = scene.fog as THREE.Fog
			f.color.set(palette[2])
			f.near = 8
			f.far = 60
		} else {
			scene.fog = new THREE.Fog(palette[2], 8, 60)
		}

		createWeatherObjects(true, 1, target)

		requestAnimationFrame(() => {
			overlay.style.opacity = '0'
		})

		const onFadeOut = () => {
			overlay.removeEventListener('transitionend', onFadeOut)
			if (overlay.parentElement) overlay.parentElement.removeChild(overlay)
		}
		overlay.addEventListener('transitionend', onFadeOut)
	}

	overlay.addEventListener('transitionend', onFadeIn)
}

const createClearSky = (initialOpacity = 1, targetGroup?: THREE.Group) => {
	const target = targetGroup || new THREE.Group()

	const sunGeometry = new THREE.SphereGeometry(1.4, 32, 32)
	const sunMaterial = new THREE.MeshBasicMaterial({
		color: 0xffd085,
		transparent: true,
		opacity: initialOpacity,
	})
	const sun = new THREE.Mesh(sunGeometry, sunMaterial)
	sun.position.set(2, 2, -3)
	target.add(sun)

	sunLight = new THREE.PointLight(0xfff2c2, isDark.value ? 0.4 : 0.8, 80, 2)
	sunLight.position.copy(sun.position)
	target.add(sunLight)

	sunHaloTexture = createSpriteTexture(512)
	const spriteMaterial = new THREE.SpriteMaterial({
		map: sunHaloTexture,
		color: 0xffffff,
		transparent: true,
		opacity: 0.55 * initialOpacity,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	})
	halo = new THREE.Sprite(spriteMaterial)
	halo.scale.set(6, 6, 1)
	halo.position.copy(sun.position)
	target.add(halo)

	if (!targetGroup) {
		scene.add(target)
		target.children.forEach((child) => weatherObjects.push(child))
	}

	return target
}

const createPartlyCloudySky = (initialOpacity = 1, targetGroup?: THREE.Group) => {
	const target = targetGroup || new THREE.Group()

	const sunGeometry = new THREE.SphereGeometry(1.4, 32, 32)
	const sunMaterial = new THREE.MeshBasicMaterial({
		color: 0xffd085,
		transparent: true,
		opacity: 0.7 * initialOpacity,
	})
	const sun = new THREE.Mesh(sunGeometry, sunMaterial)
	sun.position.set(2, 2, -3)
	target.add(sun)

	const sunLight = new THREE.PointLight(0xfff0c0, 0.4, 8)
	sunLight.position.copy(sun.position)
	target.add(sunLight)

	sunHaloTexture = sunHaloTexture || createSpriteTexture(512)
	const spriteMaterial = new THREE.SpriteMaterial({
		map: sunHaloTexture,
		color: 0xffffff,
		transparent: true,
		opacity: 0.4 * initialOpacity,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	})
	const localHalo = new THREE.Sprite(spriteMaterial)
	localHalo.scale.set(5, 5, 1)
	localHalo.position.copy(sun.position)
	target.add(localHalo)

	const cloudCount = 10
	for (let i = 0; i < cloudCount; i++) {
		const cloud = createCloud(initialOpacity)
		if (i < 2) {
			const x = sun.position.x + (Math.random() * 1.8 - 0.9)
			const y = sun.position.y + (Math.random() * 1.2 - 0.6)
			const z = -2 + Math.random() * 1
			cloud.position.set(x, y, z)
		} else {
			cloud.position.set(
				Math.random() * 10 - 5,
				Math.random() * 3 + 0.5,
				Math.random() * -6 - 2
			)
		}

		cloud.children.forEach((child: any) => {
			if (child.material) {
				child.material.opacity = 0.7 + Math.random() * 0.3
				child.material.color.set(0xc0c0c0)
			}
		})

		target.add(cloud)
	}

	if (!targetGroup) {
		scene.add(target)
		target.children.forEach((child) => weatherObjects.push(child))
	}

	return target
}

const createCloud = (initialOpacity = 1) => {
	const cloudGroup = new THREE.Group()

	for (let i = 0; i < 6; i++) {
		const cloudPartGeometry = new THREE.SphereGeometry(1.0 + Math.random() * 0.9, 16, 16)
		const baseColor = 0xe6eef6
		const cloudPartMaterial = new THREE.MeshPhysicalMaterial({
			color: baseColor,
			roughness: 0.92,
			metalness: 0.0,
			transmission: 0.0,
			opacity: initialOpacity,
			transparent: true,
		})
		const cloudPart = new THREE.Mesh(cloudPartGeometry, cloudPartMaterial)

		cloudPart.position.set(
			Math.random() * 2.0 - 1.0,
			Math.random() * 0.8,
			Math.random() * 1.6 - 0.8
		)

		cloudGroup.add(cloudPart)
	}

	cloudGroup.scale.set(1.3, 1.3, 1.3)
	cloudGroup.userData.speed = 0.02 + Math.random() * 0.03
	cloudGroup.userData.floatOffset = Math.random() * 10

	return cloudGroup
}

const createSnow = (initialOpacity = 1, targetGroup?: THREE.Group) => {
	const snowCount = 800
	const snowGeometry = new THREE.BufferGeometry()

	const createSnowTexture = () => {
		const canvas = document.createElement('canvas')
		canvas.width = 64
		canvas.height = 64
		const ctx = canvas.getContext('2d')!
		ctx.fillStyle = 'white'
		ctx.fillRect(0, 0, 64, 64)
		ctx.strokeStyle = 'white'
		ctx.lineWidth = 2
		ctx.beginPath()
		ctx.moveTo(32, 16)
		ctx.lineTo(32, 48)
		ctx.moveTo(16, 32)
		ctx.lineTo(48, 32)
		ctx.moveTo(20, 20)
		ctx.lineTo(44, 44)
		ctx.moveTo(44, 20)
		ctx.lineTo(20, 44)
		ctx.stroke()
		const tex = new THREE.CanvasTexture(canvas)
		tex.needsUpdate = true
		return tex
	}

	const snowTexture = createSnowTexture()

	const snowMaterial = new THREE.PointsMaterial({
		color: 0xffffff,
		size: 0.18,
		transparent: true,
		opacity: initialOpacity * 0.8,
		blending: THREE.AdditiveBlending,
		depthWrite: false,
		map: snowTexture,
		alphaTest: 0.1,
	})

	const snowPositions = new Float32Array(snowCount * 3)
	const snowVelocities = new Float32Array(snowCount)
	const snowSizes = new Float32Array(snowCount)

	for (let i = 0; i < snowCount; i++) {
		snowPositions[i * 3] = Math.random() * 40 - 20
		snowPositions[i * 3 + 1] = Math.random() * 10 + 10
		snowPositions[i * 3 + 2] = Math.random() * -20 - 5
		snowVelocities[i] = Math.random() * 0.2 + 0.1
		snowSizes[i] = Math.random() * 0.05 + 0.03
	}

	snowGeometry.setAttribute('position', new THREE.BufferAttribute(snowPositions, 3))
	snowGeometry.setAttribute('size', new THREE.BufferAttribute(snowSizes, 1))

	const snow = new THREE.Points(snowGeometry, snowMaterial)

	;(snow as any).velocities = snowVelocities
	snow.frustumCulled = false

	if (targetGroup) {
		targetGroup.add(snow)
	} else {
		scene.add(snow)
		weatherObjects.push(snow)
	}

	return snow
}

const createCloudySky = () => {
	scene.background = new THREE.Color(0xa9a9a9)

	for (let i = 0; i < 15; i++) {
		const cloud = createCloud()
		cloud.position.set(Math.random() * 15 - 7.5, Math.random() * 4 + 1, Math.random() * -15 - 5)
		cloud.children.forEach((child: any) => {
			if (child.material) {
				child.material.color.set(0xd3d3d3)
			}
		})
		scene.add(cloud)
		weatherObjects.push(cloud)
	}
}

const createStorm = () => {
	scene.background = new THREE.Color(0x696969)

	for (let i = 0; i < 20; i++) {
		const cloud = createCloud()
		cloud.position.set(Math.random() * 20 - 10, Math.random() * 5 + 1, Math.random() * -20 - 5)
		cloud.children.forEach((child: any) => {
			if (child.material) {
				child.material.color.set(0x808080)
			}
		})
		scene.add(cloud)
		weatherObjects.push(cloud)
	}

	const lightningGeometry = new THREE.BufferGeometry()
	const lightningMaterial = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 })

	const lightningPoints = []
	lightningPoints.push(new THREE.Vector3(0, 5, -10))
	lightningPoints.push(new THREE.Vector3(1, 3, -10))
	lightningPoints.push(new THREE.Vector3(0.5, 2, -10))
	lightningPoints.push(new THREE.Vector3(1.5, 0, -10))

	lightningGeometry.setFromPoints(lightningPoints)
	const lightning = new THREE.Line(lightningGeometry, lightningMaterial)
	scene.add(lightning)
	weatherObjects.push(lightning)
}

const animate = () => {
	if (!scene || !camera || !renderer) return

	if (!hasStartedAnimating) {
		console.debug('[ThreeScene] animation loop started')
		hasStartedAnimating = true
	}

	const delta = clock.getDelta()

	if (camera) {
		camera.position.set(0, 5 + scrollPosition.value.y * 0.005, 5)
		camera.lookAt(0, 0, 0)
	}

	weatherObjects.forEach((obj) => {
		if (obj instanceof THREE.Group && obj.children.length > 0) {
			const cSpeed = (obj as any).userData?.speed ?? 0.025
			const floatOffset = (obj as any).userData?.floatOffset ?? 0
			obj.position.x +=
				Math.cos(clock.getElapsedTime() * 0.1 + floatOffset) * delta * cSpeed * 5
			obj.position.y += Math.sin(clock.getElapsedTime() * 0.5 + floatOffset) * delta * 0.02
			obj.rotation.y += delta * 0.03
		}
	})

	if (composer) {
		composer.render()
	} else {
		renderer.render(scene, camera)
	}
	animationFrameId = requestAnimationFrame(animate)
}

const handleResize = () => {
	if (!sceneContainer.value || !camera || !renderer) return

	const width = sceneContainer.value.clientWidth
	const height = sceneContainer.value.clientHeight
	camera.aspect = width / height
	camera.updateProjectionMatrix()
	renderer.setSize(width, height)
	if (composer) composer.setSize(width, height)
}

const handleScroll = () => {
	scrollPosition.value = {
		x: window.scrollX,
		y: window.scrollY,
	}
}

const cleanup = () => {
	if (animationFrameId) {
		cancelAnimationFrame(animationFrameId)
	}

	if (renderer && sceneContainer.value) {
		sceneContainer.value.removeChild(renderer.domElement)
	}

	if (renderer) {
		renderer.dispose()
	}
	if (composer) {
		try {
			composer.dispose()
		} catch (e) {}
		composer = null
		bloomPass = null
	}

	if (skyTexture) {
		try {
			skyTexture.dispose()
		} catch (e) {}
		skyTexture = null
	}
	if (sunHaloTexture) {
		try {
			sunHaloTexture.dispose()
		} catch (e) {}
		sunHaloTexture = null
	}

	scene.traverse((object: THREE.Object3D) => {
		if (object instanceof THREE.Mesh) {
			const mesh = object as THREE.Mesh
			if (mesh.geometry) {
				mesh.geometry.dispose()
			}
			if (mesh.material) {
				if (Array.isArray(mesh.material)) {
					mesh.material.forEach((material) => {
						if (material && (material as THREE.Material).dispose) {
							;(material as THREE.Material).dispose()
						}
					})
				} else {
					;(mesh.material as THREE.Material).dispose()
				}
			}
		}
	})
}

if (typeof document !== 'undefined') {
	const styleEl = document.getElementById('three-debug-styles')
	if (styleEl) {
		document.head.removeChild(styleEl)
	}
}

watch(
	() => props.weatherType,
	(newWeatherType) => {
		fadeTransitionToWeather(newWeatherType, 900)
	}
)

onMounted(() => {
	initScene()
	window.addEventListener('resize', handleResize)
	window.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
	cleanup()
	window.removeEventListener('resize', handleResize)
	window.removeEventListener('scroll', handleScroll)
})

defineExpose({
	updateWeather: createWeatherObjects,
	getScene: () => scene,
	getCamera: () => camera,
})
</script>

<style scoped>
.three-scene-container {
	pointer-events: none;
}
</style>

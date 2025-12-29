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
	isNight: {
		type: Boolean,
		default: false,
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

	console.debug('[ThreeScene] background initialized for', props.weatherType)
	// createWeatherObjects() // Removed

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

const fadeTransitionToWeather = (target: string, duration = 800) => {
	if (!sceneContainer.value) {
		// createWeatherObjects(true, 1, target) // Removed
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

		// createWeatherObjects(true, 1, target) // Removed

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

	// weatherObjects loop removed as it's now handled by WeatherElements.vue

	if (composer) {
		composer.render()
	} else if (renderer && scene && camera) {
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

	if (scene) {
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
}

if (typeof document !== 'undefined') {
	const styleEl = document.getElementById('three-debug-styles')
	if (styleEl) {
		document.head.removeChild(styleEl)
	}
}

watch([() => props.weatherType, () => props.isNight], ([newWeatherType]) => {
	fadeTransitionToWeather(newWeatherType as string, 900)
})

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
	getScene: () => scene,
	getCamera: () => camera,
})
</script>

<style scoped>
.three-scene-container {
	pointer-events: none;
}
</style>

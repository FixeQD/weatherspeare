<template>
	<div class="relative min-h-screen overflow-hidden">
		<div class="transition-weather fixed inset-0 z-0" :class="weatherGradientClass"></div>

		<ClientOnly>
			<ThreeScene
				v-if="show3DScene"
				:weather-type="currentWeatherType"
				:is-night="isNightAtLocation"
				:debug-border="false"
				@scene-ready="onSceneReady" />

			<Suspense>
				<WeatherElements
					v-if="show3DScene"
					:weather-type="currentWeatherType"
					:debug-border="false"
					:sun-position="sunPosition"
					:moon-position="moonPosition"
					:is-sun-up="isSunUp"
					:is-moon-up="isMoonUp"
					:moon-phase="moonPhase"
					:moon-illumination="moonIllumination" />
				<template #fallback>
					<div></div>
				</template>
			</Suspense>
		</ClientOnly>

		<div class="relative z-30 min-h-screen">
			<div class="container mx-auto px-4 py-8">
				<WeatherHeader />

				<main class="mt-8">
					<ClientOnly>
						<WeatherSearchSection />
					</ClientOnly>

					<div class="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
						<div class="lg:col-span-2">
							<WeatherMainDisplay />
						</div>
						<div class="lg:col-span-1">
							<WeatherSidebar />
						</div>
					</div>

					<MonologueSection class="mt-12" />
				</main>

				<WeatherFooter />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import WeatherHeader from './components/weather/WeatherHeader.vue'
import WeatherSearchSection from './components/weather/WeatherSearch.vue'
import WeatherMainDisplay from './components/weather/WeatherDisplay.vue'
import WeatherSidebar from './components/weather/WeatherSidebar.vue'
import MonologueSection from './components/shakespeare/MonologueDisplay.vue'
import WeatherFooter from './components/shared/WeatherFooter.vue'
import ThreeScene from './components/3D/ThreeScene.vue'

import { useAstronomy } from './composables/useAstronomy'
import { useTheme } from './composables/useTheme'

const weatherStore = useWeatherStore()
const { setAstronomyData, getSunProgress, getMoonProgress, astronomyData } = useAstronomy()
const { isDark } = useTheme()

const sunPosition = ref(0)
const moonPosition = ref(0)
const isSunUp = ref(true)
const isMoonUp = ref(false)
const moonPhase = ref('Full Moon')
const moonIllumination = ref(100)

const WeatherElements = defineAsyncComponent(() => import('./components/3D/WeatherElements.vue'))
const show3DScene = ref(true)
const sceneReady = ref(false)

const mapWeatherTo3DType = (weatherCondition: string): string => {
	const condition = weatherCondition.toLowerCase()

	if (condition.includes('rain') || condition.includes('drizzle')) {
		return 'rain'
	} else if (condition.includes('snow')) {
		return 'snow'
	} else if (condition.includes('thunder') || condition.includes('storm')) {
		return 'storm'
	} else if (condition.includes('partly')) {
		return 'partly'
	} else if (condition.includes('cloud') || condition.includes('overcast')) {
		return 'cloudy'
	} else if (condition.includes('clear') || condition.includes('sunny')) {
		return 'clear'
	}

	return 'clear'
}

const currentWeatherType = computed(() => {
	if (!weatherStore.weatherData?.weather?.[0]?.main) {
		return 'clear'
	}

	return mapWeatherTo3DType(weatherStore.weatherData.weather[0].main)
})

const weatherGradientClass = computed(() => {
	const type = currentWeatherType.value
	const gradientMap: Record<string, string> = {
		clear: 'weather-gradient-clear',
		partly: 'weather-gradient-cloudy',
		cloudy: 'weather-gradient-cloudy',
		rain: 'weather-gradient-rain',
		storm: 'weather-gradient-storm',
		snow: 'weather-gradient-snow',
	}
	return gradientMap[type] || 'weather-gradient-clear'
})

const isNightAtLocation = computed(() => {
	const data = weatherStore.weatherData
	if (!data) return false

	return data.isDay === false
})

const onSceneReady = () => {
	sceneReady.value = true
}

watch(
	() => weatherStore.weatherData,
	(newWeatherData) => {
		if (newWeatherData) {
			if (sceneReady.value) console.debug('Weather changed, updating 3D scene')

			if (newWeatherData.astro) {
				setAstronomyData({
					sunrise: newWeatherData.astro.sunrise,
					sunset: newWeatherData.astro.sunset,
					moonrise: newWeatherData.astro.moonrise,
					moonset: newWeatherData.astro.moonset,
					moonPhase: newWeatherData.astro.moonPhase,
					moonIllumination: newWeatherData.astro.moonIllumination,
					isMoonUp: newWeatherData.astro.isMoonUp,
					isSunUp: newWeatherData.astro.isSunUp,
					isDay: newWeatherData.isDay,
					localtime: newWeatherData.localtime,
					localtimeEpoch: newWeatherData.dt, // approx
				})

				sunPosition.value = getSunProgress()
				moonPosition.value = getMoonProgress()
				isSunUp.value = newWeatherData.astro.isSunUp
				isMoonUp.value = newWeatherData.astro.isMoonUp
				moonPhase.value = newWeatherData.astro.moonPhase
				moonIllumination.value = newWeatherData.astro.moonIllumination

				// Recalculate periodically just in case
			}
		}
	},
	{ deep: true, immediate: true }
)

watch(
	isNightAtLocation,
	(isNight) => {
		if (import.meta.client) {
			const updateTheme = () => {
				console.debug('Theme switching to:', isNight ? 'dark' : 'light')
				isDark.value = isNight
				if (isNight) {
					document.documentElement.classList.add('dark')
				} else {
					document.documentElement.classList.remove('dark')
				}
			}

			// @ts-ignore
			if (document.startViewTransition) {
				// @ts-ignore
				document.startViewTransition(updateTheme)
			} else {
				updateTheme()
			}
		}
	},
	{ immediate: true }
)
</script>

<style>
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
	transition: all 0.3s ease;
}
.slide-up-enter-from {
	opacity: 0;
	transform: translateY(20px);
}
.slide-up-leave-to {
	opacity: 0;
	transform: translateY(-20px);
}
</style>

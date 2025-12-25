<template>
	<div class="space-y-6">
		<!-- Current Weather Card -->
		<Card v-if="weatherData" class="overflow-hidden shadow-lg">
			<div
				class="relative overflow-hidden p-0 text-white"
				:class="getWeatherGradient(weatherData.weather[0].main)">
				<!-- Weather background animation -->
				<div class="absolute inset-0 opacity-20">
					<div
						v-for="i in 5"
						:key="i"
						class="animate-float absolute rounded-full bg-white/30"
						:style="{
							width: `${Math.random() * 50 + 20}px`,
							height: `${Math.random() * 50 + 20}px`,
							top: `${Math.random() * 100}%`,
							left: `${Math.random() * 100}%`,
							animationDelay: `${i * 0.5}s`,
						}"></div>
				</div>

				<div class="relative z-10 p-6">
					<div class="flex items-start justify-between">
						<div>
							<h2 class="text-3xl font-bold">
								{{ weatherData.name }}, {{ weatherData.sys.country }}
							</h2>
							<p class="text-lg opacity-90">{{ formattedDate }}</p>
							<p class="mt-1 text-sm opacity-80">{{ formattedTime }}</p>
						</div>
						<div class="text-right">
							<div class="flex items-center gap-2">
								<IconWrapper
									:icon="getWeatherIcon(weatherData.weather[0].main)"
									class="h-10 w-10" />
								<span class="text-2xl font-semibold">{{
									weatherData.weather[0].main
								}}</span>
							</div>
							<p class="text-sm opacity-80">
								{{ weatherData.weather[0].description }}
							</p>
						</div>
					</div>

					<div class="mt-6 flex items-end justify-between">
						<div>
							<div class="text-6xl font-bold">
								{{ Math.round(weatherData.main.temp) }}°C
							</div>
							<div class="text-sm opacity-80">
								Feels like {{ Math.round(weatherData.main.feels_like) }}°C
							</div>
						</div>
						<div class="text-right">
							<div class="flex items-center gap-2">
								<Droplet class="h-5 w-5" />
								<span>{{ weatherData.main.humidity }}%</span>
							</div>
							<div class="flex items-center gap-2">
								<Wind class="h-5 w-5" />
								<span>{{ Math.round(weatherData.wind.speed * 3.6) }} km/h</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			<CardContent class="p-6">
				<WeatherDetails :weather-data="weatherData" />
			</CardContent>
		</Card>

		<!-- Loading State -->
		<Card v-else-if="loading" class="py-12 text-center">
			<CardContent>
				<LoadingSpinner class="mx-auto mb-4" />
				<p class="text-gray-600 dark:text-gray-300">
					Fetching weather data for {{ currentCity }}...
				</p>
			</CardContent>
		</Card>

		<!-- Error State -->
		<WeatherError v-else-if="error" :error="error" @retry="retryFetch" />

		<!-- Empty State -->
		<Card v-else class="py-12 text-center">
			<CardContent>
				<CloudOff class="mx-auto mb-4 h-12 w-12 text-gray-400" />
				<h3 class="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
					No weather data
				</h3>
				<p class="text-gray-600 dark:text-gray-300">Search for a city to get started</p>
			</CardContent>
		</Card>
	</div>
</template>

<style scoped>
.animate-float {
	animation: float 6s ease-in-out infinite;
}

@keyframes float {
	0%,
	100% {
		transform: translateY(0px);
	}
	50% {
		transform: translateY(-20px);
	}
}
</style>

<script setup lang="ts">
import { computed } from 'vue'
import { CloudOff, Droplet, Wind } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'
import WeatherDetails from './WeatherDetails.vue'
import WeatherError from './WeatherError.vue'
import LoadingSpinner from '../shared/LoadingSpinner.vue'
import IconWrapper from '../shared/IconWrapper.vue'
import { useWeatherStore } from '@/stores/weatherStore'

const weatherStore = useWeatherStore()

const weatherData = computed(() => weatherStore.weatherData)
const loading = computed(() => weatherStore.loading)
const error = computed(() => weatherStore.error)
const currentCity = computed(() => weatherStore.currentCity)

const formattedDate = computed(() => {
	if (!weatherData.value?.dt) return ''
	return new Date(weatherData.value.dt * 1000).toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})
})

const formattedTime = computed(() => {
	if (!weatherData.value?.dt) return ''
	return new Date(weatherData.value.dt * 1000).toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
	})
})

const getWeatherGradient = (condition: string) => {
	const gradients: Record<string, string> = {
		Clear: 'bg-gradient-to-r from-yellow-400 to-orange-500',
		Clouds: 'bg-gradient-to-r from-blue-300 to-gray-400',
		Rain: 'bg-gradient-to-r from-blue-500 to-cyan-600',
		Thunderstorm: 'bg-gradient-to-r from-gray-700 to-blue-900',
		Snow: 'bg-gradient-to-r from-blue-200 to-cyan-300',
		Drizzle: 'bg-gradient-to-r from-blue-400 to-gray-500',
		Mist: 'bg-gradient-to-r from-gray-300 to-gray-500',
		Fog: 'bg-gradient-to-r from-gray-300 to-gray-500',
		Haze: 'bg-gradient-to-r from-yellow-200 to-orange-300',
	}
	return gradients[condition] || 'bg-gradient-to-r from-blue-500 to-cyan-600'
}

const getWeatherIcon = (condition: string) => {
	const icons: Record<string, string> = {
		Clear: 'sun',
		Clouds: 'cloud',
		Rain: 'cloud-rain',
		Thunderstorm: 'cloud-lightning',
		Snow: 'snowflake',
		Drizzle: 'cloud-drizzle',
		Mist: 'cloud-fog',
		Fog: 'cloud-fog',
		Haze: 'cloud-fog',
	}
	return icons[condition] || 'cloud'
}

const retryFetch = () => {
	if (currentCity.value) {
		weatherStore.fetchWeather(currentCity.value)
	}
}
</script>

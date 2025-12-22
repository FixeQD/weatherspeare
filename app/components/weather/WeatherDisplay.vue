<template>
	<div class="space-y-6">
		<!-- Current Weather Card -->
		<Card v-if="weatherData" class="overflow-hidden">
			<div
				class="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
				<div class="absolute inset-0 bg-black/10" />
				<div class="relative z-10">
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
									class="h-8 w-8" />
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
							<div class="text-lg">Humidity: {{ weatherData.main.humidity }}%</div>
							<div class="text-lg">
								Wind: {{ Math.round(weatherData.wind.speed * 3.6) }} km/h
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

<script setup lang="ts">
import { computed } from 'vue'
import { CloudOff } from 'lucide-vue-next'
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

<template>
	<div class="space-y-6">
		<!-- Forecast Card -->
		<Card v-if="weatherData">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Calendar class="h-5 w-5" />
					<span>5-Day Forecast</span>
				</CardTitle>
				<CardDescription>Weather outlook for the next days</CardDescription>
			</CardHeader>
			<CardContent>
				<div v-if="forecastLoading" class="py-8 text-center">
					<LoadingSpinner class="mx-auto mb-4" />
					<p class="text-gray-600 dark:text-gray-300">Loading forecast...</p>
				</div>
				<div v-else-if="forecastError" class="py-8 text-center text-red-500">
					<p>{{ forecastError }}</p>
					<Button @click="fetchForecast" variant="outline" size="sm" class="mt-2">
						Retry
					</Button>
				</div>
				<div v-else class="space-y-4">
					<div
						v-for="day in forecast"
						:key="day.dt"
						class="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
						<div class="flex items-center gap-3">
							<p class="w-16 font-medium">{{ formatDay(day.dt) }}</p>
							<IconWrapper
								:icon="getWeatherIcon(day.weather[0].main)"
								class="h-8 w-8" />
							<span class="text-sm text-gray-500 dark:text-gray-400">
								{{ day.weather[0].main }}
							</span>
						</div>
						<div class="text-right">
							<div class="font-semibold">
								{{ Math.round(day.temp.max) }}° / {{ Math.round(day.temp.min) }}°
							</div>
							<div class="text-sm text-gray-500 dark:text-gray-400">
								{{ Math.round(day.pop * 100) }}% rain
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Weather History -->
		<Card v-if="weatherHistory.length > 0">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<History class="h-5 w-5" />
					<span>Recent Searches</span>
				</CardTitle>
				<CardDescription>Your weather search history</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-3">
					<div
						v-for="historyItem in weatherHistory"
						:key="historyItem.id"
						class="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
						<div class="flex items-center gap-3">
							<IconWrapper
								:icon="getWeatherIcon(historyItem.weather[0].main)"
								class="h-6 w-6" />
							<div>
								<p class="font-medium">{{ historyItem.name }}</p>
								<p class="text-sm text-gray-500 dark:text-gray-400">
									{{ formatDate(historyItem.dt) }}
								</p>
							</div>
						</div>
						<div class="text-right">
							<div class="font-semibold">
								{{ Math.round(historyItem.main.temp) }}°C
							</div>
							<div class="text-sm text-gray-500 dark:text-gray-400">
								{{ historyItem.weather[0].main }}
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Additional Info -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<Info class="h-5 w-5" />
					<span>Weather Tips</span>
				</CardTitle>
				<CardDescription>Seasonal advice based on current weather</CardDescription>
			</CardHeader>
			<CardContent>
				<div class="space-y-4">
					<div
						v-if="weatherData"
						class="flex items-start gap-3 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
						<Lightbulb class="mt-1 h-5 w-5 flex-shrink-0 text-blue-500" />
						<div>
							<h4 class="mb-1 font-semibold">Today's Recommendation</h4>
							<p class="text-sm text-gray-600 dark:text-gray-300">
								{{ getWeatherRecommendation() }}
							</p>
						</div>
					</div>

					<div
						class="flex items-start gap-3 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
						<Leaf class="mt-1 h-5 w-5 flex-shrink-0 text-green-500" />
						<div>
							<h4 class="mb-1 font-semibold">Air Quality</h4>
							<p class="text-sm text-gray-600 dark:text-gray-300">
								Check local air quality for outdoor activities
							</p>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { Calendar, History, Info, Lightbulb, Leaf } from 'lucide-vue-next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import LoadingSpinner from '../shared/LoadingSpinner.vue'
import IconWrapper from '../shared/IconWrapper.vue'
import { useWeatherStore } from '@/stores/weatherStore'

const weatherStore = useWeatherStore()

const weatherData = computed(() => weatherStore.weatherData)
const forecast = computed(() => weatherStore.forecast)
const forecastLoading = computed(() => weatherStore.forecastLoading)
const forecastError = computed(() => weatherStore.forecastError)
const weatherHistory = computed(() => weatherStore.weatherHistory)

onMounted(() => {
	if (weatherData.value) {
		fetchForecast()
	}
})

const fetchForecast = async () => {
	if (weatherData.value) {
		await weatherStore.fetchForecast(weatherData.value.coord.lat, weatherData.value.coord.lon)
	}
}

const formatDay = (timestamp: number) => {
	return new Date(timestamp * 1000).toLocaleDateString('en-US', { weekday: 'short' })
}

const formatDate = (timestamp: number) => {
	return new Date(timestamp * 1000).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
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

const getWeatherRecommendation = () => {
	if (!weatherData.value) return 'Search for a city to get weather recommendations'

	const temp = weatherData.value.main.temp
	const weather = weatherData.value.weather[0].main

	if (temp > 30) {
		return 'Hot day! Stay hydrated, wear sunscreen, and avoid direct sun during peak hours.'
	} else if (temp > 20) {
		return 'Warm weather. Perfect for outdoor activities with light clothing.'
	} else if (temp > 10) {
		return 'Mild temperature. A light jacket might be comfortable for evening walks.'
	} else if (temp > 0) {
		return 'Cool weather. Bundle up with warm layers and enjoy the crisp air.'
	} else {
		return 'Cold day! Wear warm, insulated clothing and be cautious of icy conditions.'
	}
}
</script>

<template>
	<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
		<Card class="text-center">
			<CardContent class="p-4">
				<div class="text-2xl font-bold">{{ Math.round(weatherData.main.temp_max) }}°C</div>
				<div class="mt-1 text-sm text-gray-500 dark:text-gray-400">Max Temp</div>
			</CardContent>
		</Card>

		<Card class="text-center">
			<CardContent class="p-4">
				<div class="text-2xl font-bold">{{ Math.round(weatherData.main.temp_min) }}°C</div>
				<div class="mt-1 text-sm text-gray-500 dark:text-gray-400">Min Temp</div>
			</CardContent>
		</Card>

		<Card class="text-center">
			<CardContent class="p-4">
				<div class="text-2xl font-bold">{{ weatherData.main.pressure }} hPa</div>
				<div class="mt-1 text-sm text-gray-500 dark:text-gray-400">Pressure</div>
			</CardContent>
		</Card>

		<Card class="text-center">
			<CardContent class="p-4">
				<div class="text-2xl font-bold">{{ weatherData.visibility / 1000 }} km</div>
				<div class="mt-1 text-sm text-gray-500 dark:text-gray-400">Visibility</div>
			</CardContent>
		</Card>

		<Card class="text-center">
			<CardContent class="p-4">
				<div class="text-2xl font-bold">{{ weatherData.clouds.all }}%</div>
				<div class="mt-1 text-sm text-gray-500 dark:text-gray-400">Cloudiness</div>
			</CardContent>
		</Card>

		<Card class="text-center">
			<CardContent class="p-4">
				<div class="text-2xl font-bold">{{ weatherData.wind.deg }}°</div>
				<div class="mt-1 text-sm text-gray-500 dark:text-gray-400">Wind Direction</div>
			</CardContent>
		</Card>
	</div>

	<div class="mt-6">
		<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold">
			<Sunrise class="h-5 w-5" />
			<span>Sunrise & Sunset</span>
		</h3>
		<div class="grid grid-cols-2 gap-4">
			<Card class="text-center">
				<CardContent class="p-4">
					<Sunrise class="mx-auto mb-2 h-8 w-8 text-yellow-500" />
					<div class="font-semibold">{{ formatTime(weatherData.sys.sunrise) }}</div>
					<div class="text-sm text-gray-500 dark:text-gray-400">Sunrise</div>
				</CardContent>
			</Card>
			<Card class="text-center">
				<CardContent class="p-4">
					<Sunset class="mx-auto mb-2 h-8 w-8 text-orange-500" />
					<div class="font-semibold">{{ formatTime(weatherData.sys.sunset) }}</div>
					<div class="text-sm text-gray-500 dark:text-gray-400">Sunset</div>
				</CardContent>
			</Card>
		</div>
	</div>

	<div class="mt-6">
		<h3 class="mb-3 flex items-center gap-2 text-lg font-semibold">
			<MapPin class="h-5 w-5" />
			<span>Location Details</span>
		</h3>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<Card>
				<CardContent class="p-4">
					<div class="text-sm text-gray-500 dark:text-gray-400">Coordinates</div>
					<div class="font-semibold">
						{{ weatherData.coord.lat.toFixed(2) }}°N,
						{{ weatherData.coord.lon.toFixed(2) }}°E
					</div>
				</CardContent>
			</Card>
			<Card>
				<CardContent class="p-4">
					<div class="text-sm text-gray-500 dark:text-gray-400">Timezone</div>
					<div class="font-semibold">UTC{{ formatTimezone(weatherData.timezone) }}</div>
				</CardContent>
			</Card>
		</div>
	</div>
</template>

<script setup lang="ts">
import { Sunrise, Sunset, MapPin } from 'lucide-vue-next'
import { Card, CardContent } from '@/components/ui/card'

interface WeatherData {
	coord: {
		lon: number
		lat: number
	}
	main: {
		temp: number
		feels_like: number
		temp_min: number
		temp_max: number
		pressure: number
		humidity: number
	}
	wind: {
		speed: number
		deg: number
	}
	clouds: {
		all: number
	}
	sys: {
		country: string
		sunrise: number
		sunset: number
	}
	visibility: number
	dt: number
	timezone: number
	name: string
	weather: Array<{
		main: string
		description: string
		icon: string
	}>
}

const props = defineProps<{
	weatherData: WeatherData
}>()

const formatTime = (timestamp: number) => {
	return new Date(timestamp * 1000).toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
	})
}

const formatTimezone = (offset: number) => {
	const hours = Math.floor(offset / 3600)
	const minutes = Math.floor((offset % 3600) / 60)
	const sign = hours >= 0 ? '+' : '-'
	return `${sign}${Math.abs(hours).toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}
</script>

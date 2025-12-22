<template>
	<div class="mx-auto max-w-md">
		<Card class="shadow-lg transition-shadow hover:shadow-xl">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<CloudRain class="h-5 w-5" />
					<span>Weather Search</span>
				</CardTitle>
				<CardDescription> Enter a city to get weather</CardDescription>
			</CardHeader>
			<CardContent>
				<form @submit.prevent="handleSubmit" class="space-y-4">
					<div class="relative">
						<Search
							class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
						<Input
							v-model="city"
							placeholder="e.g., London, Paris, Tokyo"
							:disabled="loading"
							class="pl-10" />
					</div>
					<Button type="submit" class="w-full" :disabled="!city.trim() || loading">
						<Loader2 v-if="loading" class="mr-2 h-4 w-4 animate-spin" />
						<span>{{ loading ? 'Loading...' : 'Get Weather' }}</span>
					</Button>
				</form>

				<div v-if="recentCities.length > 0" class="mt-6">
					<p class="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">
						Recent searches:
					</p>
					<div class="flex flex-wrap gap-2">
						<Button
							v-for="recentCity in recentCities"
							:key="recentCity"
							@click="
								() => {
									city = recentCity
									handleSubmit()
								}
							"
							variant="outline"
							size="sm"
							class="flex items-center gap-1">
							<Clock class="h-3 w-3" />
							{{ recentCity }}
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CloudRain, Search, Loader2, Clock } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useWeatherStore } from '@/stores/weatherStore'

const city = ref('')
const weatherStore = useWeatherStore()

const loading = computed(() => weatherStore.loading || weatherStore.shakespeareLoading)
const recentCities = computed(() => weatherStore.recentCities)

const handleSubmit = async () => {
	if (!city.value.trim()) {
		return
	}

	await weatherStore.fetchWeather(city.value.trim())
	if (weatherStore.weatherData) {
		await weatherStore.generateMonologue()
	}
}
</script>

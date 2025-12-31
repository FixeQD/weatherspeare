import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useWeather } from '@/composables/useWeather'
import { useShakespeare } from '@/composables/useShakespeare'
import { useSceneAI } from '@/composables/3D/useSceneAI'

export const useWeatherStore = defineStore('weather', () => {
	const {
		weatherData,
		forecastData,
		loading,
		forecastLoading,
		error,
		forecastError,
		fetchWeather,
		fetchForecast,
	} = useWeather()

	const {
		monologue,
		loading: shakespeareLoading,
		error: shakespeareError,
		generateMonologue,
	} = useShakespeare()

	const {
		sceneConfig,
		loading: sceneAILoading,
		error: sceneAIError,
		generateSceneConfig,
	} = useSceneAI()

	const currentCity = ref('')
	const recentCities = ref<string[]>([])
	const weatherHistory = ref<any[]>([])

	const forecast = computed(() => forecastData.value || [])

	// Actions
	const setCurrentCity = (city: string) => {
		currentCity.value = city

		if (!recentCities.value.includes(city)) {
			recentCities.value = [city, ...recentCities.value.slice(0, 4)] // Keep max 5
		}
	}

	const addToHistory = (weather: any) => {
		if (!weather) return

		const historyItem = {
			id: Date.now(),
			...weather,
			timestamp: Date.now(),
		}

		weatherHistory.value = [historyItem, ...weatherHistory.value.slice(0, 4)] // Keep max 5
	}

	const fetchWeatherWithHistory = async (city: string) => {
		setCurrentCity(city)
		// Reset state for new search
		monologue.value = ''
		shakespeareError.value = null

		await fetchWeather(city)

		if (weatherData.value) {
			addToHistory(weatherData.value)
			await fetchForecast(weatherData.value.coord.lat, weatherData.value.coord.lon)
			generateSceneConfig(weatherData.value).catch((e) =>
				console.error('Store: AI Scene generation failed', e)
			)
		}
	}

	const generateWeatherMonologue = async () => {
		if (weatherData.value) {
			await generateMonologue(weatherData.value)
		}
	}

	const initFromLocalStorage = () => {
		if (!import.meta.client) return
		try {
			const savedCities = localStorage.getItem('recentCities')
			if (savedCities) {
				recentCities.value = JSON.parse(savedCities)
			}

			const savedHistory = localStorage.getItem('weatherHistory')
			if (savedHistory) {
				weatherHistory.value = JSON.parse(savedHistory)
			}
		} catch (error) {
			console.error('Failed to load from localStorage:', error)
		}
	}

	const saveToLocalStorage = () => {
		if (!import.meta.client) return
		try {
			localStorage.setItem('recentCities', JSON.stringify(recentCities.value))
			localStorage.setItem('weatherHistory', JSON.stringify(weatherHistory.value))
		} catch (error) {
			console.error('Failed to save to localStorage:', error)
		}
	}

	initFromLocalStorage()

	watch(
		[recentCities, weatherHistory],
		() => {
			saveToLocalStorage()
		},
		{ deep: true }
	)

	return {
		weatherData,
		forecast,
		monologue,
		loading,
		forecastLoading,
		shakespeareLoading,
		error,
		forecastError,
		shakespeareError,
		currentCity,
		recentCities,
		weatherHistory,
		sceneConfig,
		sceneAIError,
		fetchWeather: fetchWeatherWithHistory,
		fetchForecast,
		generateMonologue: generateWeatherMonologue,
	}
})

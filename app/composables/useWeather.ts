import { ref } from 'vue'
import axios from 'axios'

export function useWeather() {
	const weatherData = ref<any | null>(null)
	const forecastData = ref<any | null>(null)
	const loading = ref(false)
	const forecastLoading = ref(false)
	const error = ref<string | null>(null)
	const forecastError = ref<string | null>(null)

	const fetchWeather = async (city: string) => {
		loading.value = true
		error.value = null
		try {
			const config = useRuntimeConfig()
			const response = await axios.get(
				`http://api.weatherapi.com/v1/current.json?key=${config.public.WEATHER_API_KEY}&q=${city}&aqi=no`
			)
			weatherData.value = {
				name: response.data.location.name,
				sys: {
					country: response.data.location.country,
					sunrise: 0,
					sunset: 0,
				},
				weather: [
					{
						main: response.data.current.condition.text,
						description: response.data.current.condition.text,
					},
				],
				main: {
					temp: response.data.current.temp_c,
					feels_like: response.data.current.feelslike_c,
					humidity: response.data.current.humidity,
					temp_min: response.data.current.temp_c,
					temp_max: response.data.current.temp_c,
					pressure: response.data.current.pressure_mb,
				},
				wind: {
					speed: response.data.current.wind_kph / 3.6, // Convert km/h to m/s
					deg: response.data.current.wind_degree,
				},
				clouds: { all: response.data.current.cloud },
				visibility: response.data.current.vis_km * 1000, // Convert km to meters
				dt: response.data.current.last_updated_epoch,
				timezone: 0,
				coord: { lat: response.data.location.lat, lon: response.data.location.lon },
			}
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to fetch weather data'
		} finally {
			loading.value = false
		}
	}

	const fetchForecast = async (lat: number, lon: number) => {
		forecastLoading.value = true
		forecastError.value = null
		try {
			const config = useRuntimeConfig()
			const response = await axios.get(
				`http://api.weatherapi.com/v1/forecast.json?key=${config.public.WEATHER_API_KEY}&q=${lat},${lon}&days=5&aqi=no&alerts=no`
			)

			forecastData.value = response.data.forecast.forecastday.slice(1, 6).map((day: any) => ({
				dt: new Date(day.date).getTime() / 1000,
				temp: { max: day.day.maxtemp_c, min: day.day.mintemp_c },
				weather: [{ main: day.day.condition.text }],
				pop: day.day.daily_chance_of_rain / 100,
			}))
		} catch (err) {
			forecastError.value =
				err instanceof Error ? err.message : 'Failed to fetch forecast data'
		} finally {
			forecastLoading.value = false
		}
	}

	return {
		weatherData,
		forecastData,
		loading,
		forecastLoading,
		error,
		forecastError,
		fetchWeather,
		fetchForecast,
	}
}

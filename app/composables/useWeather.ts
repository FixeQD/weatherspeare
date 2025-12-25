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
				`http://api.weatherapi.com/v1/forecast.json?key=${config.public.WEATHER_API_KEY}&q=${city}&days=1&aqi=no&alerts=no`
			)

			const location = response.data.location
			const current = response.data.current
			const astro = response.data.forecast.forecastday[0].astro

			weatherData.value = {
				name: location.name,
				sys: {
					country: location.country,
					sunrise: astro.sunrise,
					sunset: astro.sunset,
				},
				weather: [
					{
						main: current.condition.text,
						description: current.condition.text,
					},
				],
				main: {
					temp: current.temp_c,
					feels_like: current.feelslike_c,
					humidity: current.humidity,
					temp_min: current.temp_c,
					temp_max: current.temp_c,
					pressure: current.pressure_mb,
				},
				wind: {
					speed: current.wind_kph / 3.6,
					deg: current.wind_degree,
				},
				clouds: { all: current.cloud },
				visibility: current.vis_km * 1000,
				dt: current.last_updated_epoch,
				timezone: location.tz_id,
				coord: { lat: location.lat, lon: location.lon },
				isDay: current.is_day === 1,
				astro: {
					sunrise: astro.sunrise,
					sunset: astro.sunset,
					moonrise: astro.moonrise,
					moonset: astro.moonset,
					moonPhase: astro.moon_phase,
					moonIllumination: astro.moon_illumination,
					isMoonUp: astro.is_moon_up === 1,
					isSunUp: astro.is_sun_up === 1,
				},
				localtime: location.localtime,
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

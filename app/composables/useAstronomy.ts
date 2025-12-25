// SPDX-License-Identifier: MIT
import { ref } from 'vue'
import axios from 'axios'

export interface AstronomyData {
	sunrise: string
	sunset: string
	moonrise: string
	moonset: string
	moonPhase: string
	moonIllumination: number
	isMoonUp: boolean
	isSunUp: boolean
	isDay: boolean
	localtime: string
	localtimeEpoch: number
}

export function useAstronomy() {
	const astronomyData = ref<AstronomyData | null>(null)
	const loading = ref(false)
	const error = ref<string | null>(null)

	const parseTimeToMinutes = (timeStr: string): number => {
		const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
		if (!match) return 0

		let hours = parseInt(match[1]!)
		const minutes = parseInt(match[2]!)
		const period = match[3]!.toUpperCase()

		if (period === 'PM' && hours !== 12) hours += 12
		if (period === 'AM' && hours === 12) hours = 0

		return hours * 60 + minutes
	}

	const fetchAstronomy = async (query: string) => {
		loading.value = true
		error.value = null

		try {
			const config = useRuntimeConfig()
			const response = await axios.get(
				`http://api.weatherapi.com/v1/forecast.json?key=${config.public.WEATHER_API_KEY}&q=${query}&days=1&aqi=no&alerts=no`
			)

			const location = response.data.location
			const astro = response.data.forecast.forecastday[0].astro
			const current = response.data.current

			astronomyData.value = {
				sunrise: astro.sunrise,
				sunset: astro.sunset,
				moonrise: astro.moonrise,
				moonset: astro.moonset,
				moonPhase: astro.moon_phase,
				moonIllumination: astro.moon_illumination,
				isMoonUp: astro.is_moon_up === 1,
				isSunUp: astro.is_sun_up === 1,
				isDay: current.is_day === 1,
				localtime: location.localtime,
				localtimeEpoch: location.localtime_epoch,
			}
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to fetch astronomy data'
		} finally {
			loading.value = false
		}
	}

	const getSunriseMinutes = () => {
		if (!astronomyData.value) return 0
		return parseTimeToMinutes(astronomyData.value.sunrise)
	}

	const getSunsetMinutes = () => {
		if (!astronomyData.value) return 0
		return parseTimeToMinutes(astronomyData.value.sunset)
	}

	const getCurrentMinutes = () => {
		if (!astronomyData.value) return 0
		const time = astronomyData.value.localtime.split(' ')[1]
		if (!time) return 0
		const [hours, minutes] = time.split(':').map(Number)
		return (hours ?? 0) * 60 + (minutes ?? 0)
	}

	const getSunProgress = () => {
		if (!astronomyData.value || !astronomyData.value.isDay) return 0

		const sunrise = getSunriseMinutes()
		const sunset = getSunsetMinutes()
		const current = getCurrentMinutes()

		if (current < sunrise || current > sunset) return 0

		return (current - sunrise) / (sunset - sunrise)
	}

	return {
		astronomyData,
		loading,
		error,
		fetchAstronomy,
		getSunriseMinutes,
		getSunsetMinutes,
		getCurrentMinutes,
		getSunProgress,
	}
}

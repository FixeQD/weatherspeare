import { ref } from 'vue'
import { useRuntimeConfig } from '#app'

export function useGeolocation() {
	const geoLoading = ref(false)
	const geonError = ref<string | null>(null)

	const fetchCurLoc = async (): Promise<{ lat: number; lon: number } | null> => {
		geoLoading.value = true
		geonError.value = null

		return new Promise((resolve) => {
			if (!navigator.geolocation) {
				geonError.value = 'Geolocation is not supported by your browser'
				geoLoading.value = false
				resolve(null)
				return
			}

			const success = (position: GeolocationPosition) => {
				geoLoading.value = false
				resolve({
					lat: position.coords.latitude,
					lon: position.coords.longitude,
				})
			}

			const error = (err: GeolocationPositionError) => {
				geoLoading.value = false

				switch (err.code) {
					case err.PERMISSION_DENIED:
						geonError.value = 'Permission to access location was denied'
						break
					case err.POSITION_UNAVAILABLE:
						geonError.value = 'Location information is unavailable'
						break
					case err.TIMEOUT:
						geonError.value = 'The request to get user location timed out'
						break
					default:
						geonError.value = 'An unknown error occurred'
				}

				resolve(null)
			}

			navigator.geolocation.getCurrentPosition(success, error, {
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 0,
			})
		})
	}

	const getCityFromCoords = async (lat: number, lon: number): Promise<string | null> => {
		try {
			const config = useRuntimeConfig()
			const response = await fetch(
				`http://api.weatherapi.com/v1/current.json?key=${config.public.WEATHER_API_KEY}&q=${lat},${lon}&aqi=no`
			)

			if (!response.ok) {
				throw new Error('Failed to fetch location data')
			}

			const data = await response.json()
			return data.location.name
		} catch (error) {
			console.error('Failed to get city from coordinates:', error)
			return null
		}
	}

	return {
		geoLoading,
		geonError,
		fetchCurLoc,
		getCityFromCoords,
	}
}

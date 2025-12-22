<template>
	<header class="mb-8 text-center">
		<h1 class="mb-2 text-4xl font-bold text-gray-900 dark:text-white">Weatherspeare</h1>
		<p class="text-lg text-gray-600 dark:text-gray-300">
			Transform daily weather forecasts into Shakespearean monologues
		</p>

		<div class="mt-4 flex items-center justify-center gap-4">
			<button
				@click="toggleTheme"
				class="rounded-full bg-white/20 p-2 transition-colors hover:bg-white/30 dark:bg-gray-700/20 dark:hover:bg-gray-700/30"
				title="Toggle dark mode">
				<Sun v-if="isDark" class="h-5 w-5 text-yellow-500" />
				<Moon v-else class="h-5 w-5 text-blue-500" />
			</button>

			<button
				@click="handleGeo"
				class="rounded-full bg-white/20 p-2 transition-colors hover:bg-white/30 dark:bg-gray-700/20 dark:hover:bg-gray-700/30"
				title="Use current location"
				:disabled="geoLoading">
				<Compass v-if="!geoLoading" class="h-5 w-5" />
				<Loader2 v-else class="h-5 w-5 animate-spin" />
			</button>
		</div>
	</header>
</template>

<script setup lang="ts">
import { Sun, Moon, Compass, Loader2 } from 'lucide-vue-next'
import { useTheme } from '@/composables/useTheme'
import { useGeolocation } from '@/composables/useGeolocation'

const { isDark, toggleTheme } = useTheme()
const { geoLoading, fetchCurLoc } = useGeolocation()

const handleGeo = async () => {
	try {
		const position = await fetchCurLoc()
		if (position) {
			console.debug('Current location:', position)
		}
	} catch (error) {
		console.error('Geolocation error:', error)
	}
}
</script>

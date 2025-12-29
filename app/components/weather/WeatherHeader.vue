<template>
	<header class="mb-8 text-center">
		<div class="mb-4 flex items-center justify-center gap-2">
			<Cloud class="h-8 w-8 text-blue-500" />
			<h1 class="text-4xl font-bold text-gray-900 dark:text-white">Weatherspeare</h1>
		</div>
		<p class="text-lg text-gray-600 dark:text-gray-300">
			Transform daily weather forecasts into Shakespearean monologues
		</p>

		<div class="mt-6 flex items-center justify-center gap-4">
			<Badge variant="outline" class="gap-1">
				<Sun class="h-4 w-4" />
				<span>{{ currentDate }}</span>
			</Badge>

			<Button
				@click="handleGeo"
				variant="outline"
				size="icon"
				class="rounded-full"
				title="Use current location"
				:disabled="geoLoading">
				<Compass v-if="!geoLoading" class="h-5 w-5" />
				<Loader2 v-else class="h-5 w-5 animate-spin" />
				<span class="sr-only">Use current location</span>
			</Button>
		</div>
	</header>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Sun, Compass, Loader2, Cloud } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useGeolocation } from '@/composables/useGeolocation'

const { geoLoading, fetchCurLoc } = useGeolocation()

const currentDate = computed(() => {
	return new Date().toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})
})

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

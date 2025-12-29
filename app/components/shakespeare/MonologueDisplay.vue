```
<template>
	<Card
		ref="cardRef"
		v-if="weatherData"
		class="glass-strong overflow-hidden rounded-2xl border-0 shadow-xl transition-all duration-300 hover:shadow-2xl">
		<CardHeader class="relative pb-2">
			<CardTitle class="flex items-center gap-2">
				<Theater class="h-5 w-5" />
				<span>Shakespearean Monologue</span>
			</CardTitle>
			<CardDescription>Behold the weather's dramatic rendition</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="mb-4 flex items-center justify-between">
				<div class="flex items-center gap-2">
					<Button
						@click="copyToClipboard"
						variant="ghost"
						size="sm"
						class="h-8 w-8 p-0"
						:disabled="!monologue"
						:class="{ 'cursor-not-allowed opacity-50': !monologue }">
						<Copy v-if="!copied" class="h-4 w-4" />
						<Check v-else class="h-4 w-4 text-green-500" />
					</Button>
					<Button
						@click="toggleFullscreen"
						variant="ghost"
						size="sm"
						class="h-8 w-8 p-0"
						:disabled="!monologue"
						:class="{ 'cursor-not-allowed opacity-50': !monologue }">
						<Expand v-if="!isFullscreen" class="h-4 w-4" />
						<Minimize v-else class="h-4 w-4" />
					</Button>
				</div>
				<div class="flex items-center gap-2">
					<select
						v-model="selectedLanguage"
						:disabled="shakespeareLoading"
						class="w-40 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800">
						<option v-for="lang in languages" :key="lang.code" :value="lang.code">
							{{ lang.name }}
						</option>
					</select>
					<Button
						@click="regenerateMonologue"
						variant="outline"
						size="sm"
						:disabled="shakespeareLoading || !monologue"
						:class="{ 'cursor-not-allowed opacity-50': !monologue }">
						<RefreshCw v-if="!shakespeareLoading" class="mr-2 h-4 w-4" />
						<Loader2 v-else class="mr-2 h-4 w-4 animate-spin" />
						<span>{{ shakespeareLoading ? 'Generating...' : 'Regenerate' }}</span>
					</Button>
				</div>
			</div>

			<div
				v-if="monologue"
				class="prose dark:prose-invert max-w-none"
				:class="{
					'min-h-[200px]': true,
					'text-lg leading-relaxed': true,
					'rounded-lg bg-gray-50 p-4 dark:bg-gray-800': true,
				}">
				<p v-for="(paragraph, index) in formattedMonologue" :key="index" class="mb-4">
					{{ paragraph }}
				</p>
			</div>

			<div
				v-else-if="!shakespeareLoading"
				class="flex min-h-[200px] flex-col items-center justify-center rounded-lg bg-gray-50/50 p-8 text-center dark:bg-gray-800/50">
				<Theater class="mb-4 h-12 w-12 text-gray-400 opacity-20" />
				<p class="mb-6 text-gray-500">
					The stage is set, the weather awaits its poetic voice.
				</p>
				<Button
					@click="regenerateMonologue"
					size="lg"
					class="bg-blue-600 px-8 hover:bg-blue-700">
					Generate Shakespearean Monologue
				</Button>
			</div>

			<div
				v-else
				class="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
				<CreativeAILoader />
			</div>

			<div v-if="weatherData" class="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
				<p class="text-sm text-gray-500 dark:text-gray-400">
					Inspired by weather in {{ weatherData.name }}, {{ weatherData.sys.country }} -
					{{ weatherData.weather[0].main }}, {{ Math.round(weatherData.main.temp) }}°C
				</p>
			</div>
		</CardContent>
	</Card>

	<!-- Error State -->
	<Card
		v-else-if="shakespeareError"
		class="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
		<CardContent class="pt-6 text-center">
			<AlertTriangle class="mx-auto mb-4 h-12 w-12 text-red-500 dark:text-red-400" />
			<h3 class="mb-2 text-xl font-semibold text-red-600 dark:text-red-400">
				Monologue Generation Failed
			</h3>
			<p class="mb-4 text-red-600 dark:text-red-400">
				{{ shakespeareError }}
			</p>
			<Button
				@click="regenerateMonologue"
				variant="outline"
				class="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30">
				<RefreshCw class="mr-2 h-4 w-4" />
				Try Again
			</Button>
		</CardContent>
	</Card>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import {
	Theater,
	Copy,
	Check,
	Expand,
	Minimize,
	RefreshCw,
	Loader2,
	AlertTriangle,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import CreativeAILoader from './AILoader.vue'
import LoadingSpinner from '../shared/LoadingSpinner.vue'
import { useWeatherStore } from '@/stores/weatherStore'
import { useShakespeare } from '@/composables/useShakespeare'
import { useClipboard } from '@vueuse/core'

const weatherStore = useWeatherStore()
const {
	generateMonologue: generateShakespeareMonologue,
	monologue: shakespeareMonologue,
	loading: shakespeareGenLoading,
	error: shakespeareGenError,
} = useShakespeare()

const monologue = computed(() => weatherStore.monologue || shakespeareMonologue.value)
const shakespeareLoading = computed(
	() => weatherStore.shakespeareLoading || shakespeareGenLoading.value
)
const shakespeareError = computed(() => weatherStore.shakespeareError || shakespeareGenError.value)
const weatherData = computed(() => weatherStore.weatherData)

const { copy, copied } = useClipboard()
const isFullscreen = ref(false)
const cardRef = ref()
const selectedLanguage = ref('en')
const languages = ref([] as { code: string; name: string }[])

onMounted(async () => {
	const handleFullscreenChange = () => {
		isFullscreen.value = !!document.fullscreenElement
	}
	document.addEventListener('fullscreenchange', handleFullscreenChange)
	onUnmounted(() => {
		document.removeEventListener('fullscreenchange', handleFullscreenChange)
	})

	try {
		const response = await fetch('https://libretranslate.com/languages')
		const data = await response.json()
		languages.value = data.map((lang: any) => ({ code: lang.code, name: lang.name }))
	} catch (error) {
		console.error('Failed to fetch languages:', error)
		languages.value = [
			{ code: 'en', name: 'English' },
			{ code: 'pl', name: 'Polish' },
			{ code: 'fr', name: 'French' },
			{ code: 'es', name: 'Spanish' },
		]
	}
})

const formattedMonologue = computed(() => {
	if (!monologue.value) return []
	return monologue.value.split('\n\n').filter((p) => p.trim().length > 0)
})

const copyToClipboard = () => {
	if (monologue.value) {
		copy(monologue.value)
	}
}

const toggleFullscreen = () => {
	if (!document.fullscreenElement) {
		cardRef.value?.$el.requestFullscreen()
	} else {
		document.exitFullscreen()
	}
}

const regenerateMonologue = async () => {
	if (weatherData.value) {
		const langName =
			languages.value.find((lang) => lang.code === selectedLanguage.value)?.name ||
			selectedLanguage.value
		await generateShakespeareMonologue(weatherData.value, langName)
		if (shakespeareMonologue.value) {
			weatherStore.monologue = shakespeareMonologue.value
		}
	}
}
</script>

<style scoped>
.prose :deep(p) {
	margin-bottom: 1em;
	line-height: 1.6;
}

.prose :deep(p:first-letter) {
	font-size: 1.5em;
	font-weight: bold;
	margin-right: 0.1em;
}
</style>

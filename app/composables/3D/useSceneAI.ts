import { ref } from 'vue'
import axios from 'axios'
import { SCENE_AI_SYSTEM_PROMPT, getSceneUserPrompt } from './scenePrompts'

export interface SceneConfig {
	skyPalette: [string, string, string]
	fogColor: string
	bloom: {
		strength: number
		radius: number
		threshold: number
	}
	lighting: {
		ambientIntensity: number
		directionalIntensity: number
		lightColor: string
	}
	weatherDynamics: {
		particleIntensity: number
		windEffect: number
	}
	seasonalEffect: {
		active: boolean
		type: string
		color: string
		count: number
		reason: string
	}
}

export function useSceneAI() {
	const sceneConfig = ref<SceneConfig | null>(null)
	const loading = ref(false)
	const error = ref<string | null>(null)

	const generateSceneConfig = async (weatherData: any) => {
		loading.value = true
		error.value = null
		try {
			const config = useRuntimeConfig()
			const baseUrl = config.public.OPENAI_API_BASE_URL || 'https://api.openai.com/v1'
			const model = config.public.OPENAI_MODEL || 'gpt-4o'
			const date = new Date().toLocaleString()

			const response = await axios.post(
				`${baseUrl}/chat/completions`,
				{
					model: model,
					messages: [
						{ role: 'system', content: SCENE_AI_SYSTEM_PROMPT },
						{ role: 'user', content: getSceneUserPrompt(weatherData, date) },
					],
					max_tokens: 1000,
					temperature: 0.7,
					response_format: { type: 'json_object' },
				},
				{
					headers: {
						'Authorization': `Bearer ${config.public.OPENAI_API_KEY}`,
						'Content-Type': 'application/json',
					},
				}
			)

			const content = response.data.choices[0]?.message?.content
			if (content) {
				sceneConfig.value = JSON.parse(content) as SceneConfig
			}
		} catch (err) {
			console.warn('AI Scene Config failed:', err)
			// DON'T set error.value to avoid blocking the main UI
			sceneConfig.value = null
		} finally {
			loading.value = false
		}
	}

	return {
		sceneConfig,
		loading,
		error,
		generateSceneConfig,
	}
}

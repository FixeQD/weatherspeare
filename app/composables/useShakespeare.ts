import { ref } from 'vue'
import axios from 'axios'

export function useShakespeare() {
	const monologue = ref('')
	const loading = ref(false)
	const error = ref<string | null>(null)

	const generateMonologue = async (weatherData: any, language: string = 'English') => {
		loading.value = true
		error.value = null
		try {
			const config = useRuntimeConfig()
			const baseUrl = config.public.OPENAI_API_BASE_URL || 'https://api.openai.com/v1'
			const prompt =
				'Transform this weather forecast into an absurd Shakespearean monologue. Make it dramatic, use archaic language like "thou", "thee", "hath", exaggerate the weather conditions comically (e.g., rain as tears of the gods, sun as fiery chariot), include references to Elizabethan theater, Shakespeare plays, or historical figures. The monologue should be spoken by a character reacting to the weather, perhaps a jester or a tragic hero. Keep it around 200-300 words. Make it quirky and humorous. Generate the monologue in ' +
				language +
				' language.\n\nWeather data: ' +
				JSON.stringify(weatherData) +
				'\n\nRespond only with the monologue text, no explanations.'

			const response = await axios.post(
				`${baseUrl}/chat/completions`,
				{
					model: config.public.OPENAI_MODEL || 'gpt-4',
					messages: [{ role: 'user', content: prompt }],
					max_tokens: 500,
					temperature: 0.8,
				},
				{
					headers: {
						'Authorization': `Bearer ${config.public.OPENAI_API_KEY}`,
						'Content-Type': 'application/json',
					},
				}
			)

			monologue.value = response.data.choices[0]?.message?.content?.trim() || ''
		} catch (err) {
			error.value = err instanceof Error ? err.message : 'Failed to generate monologue'
		} finally {
			loading.value = false
		}
	}

	return {
		monologue,
		loading,
		error,
		generateMonologue,
	}
}

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
				`Generate monologue in ${language}. ` +
				`Context: Transform the following weather forecast into a witty, ironic, and dramatically exaggerated monologue in the style of Shakespeare (or the equivalent baroque/archaic literary style of the target language). ` +
				`Tone: Mock-serious, biting irony, humorous despair, or manic joy. The speaker should be a dramatic character (jester, tragic hero) reacting to the weather with cosmic significance. ` +
				`Instructions: ` +
				`1. Use archaic/poetic vocabulary appropriate for ${language} (e.g., Old English for English, Staropolski for Polish, Molière-esque for French). Do NOT use English literal archaisms like "thou/hath" unless the target language IS English. ` +
				`2. Exaggerate the weather comically (e.g. 10 degrees is "freezing death", mist is "ghostly shround"). ` +
				`3. Be ironic and entertaining. Make the user laugh at the drama. ` +
				`4. Translate/Adapt any names or terms to fit the ${language} flow naturally. ` +
				`5. Length: 200-300 words. ` +
				`\n\nWeather data: ` +
				JSON.stringify(weatherData) +
				`\n\nRespond ONLY with the monologue text.`

			const response = await axios.post(
				`${baseUrl}/chat/completions`,
				{
					model: config.public.OPENAI_MODEL || 'gpt-4',
					messages: [{ role: 'user', content: prompt }],
					max_tokens: 1000,
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

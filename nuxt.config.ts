// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
	compatibilityDate: '2025-07-15',
	devtools: { enabled: true },
	modules: ['@nuxtjs/tailwindcss', 'shadcn-nuxt', '@pinia/nuxt'],
	shadcn: {
		prefix: '',
		componentDir: '@/components/ui',
	},
	runtimeConfig: {
		public: {
			WEATHER_API_KEY: process.env.WEATHER_API_KEY,
			OPENAI_API_KEY: process.env.OPENAI_API_KEY,
			OPENAI_API_BASE_URL: process.env.OPENAI_API_BASE_URL,
			OPENAI_MODEL: process.env.OPENAI_MODEL,
		},
	},
})

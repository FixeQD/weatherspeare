import { ref, onMounted } from 'vue'

export function useTheme() {
	const isDark = ref(false)

	const toggleTheme = () => {
		isDark.value = !isDark.value
		updateThemeClass()
		saveThemePreference()
	}

	const updateThemeClass = () => {
		if (isDark.value) {
			document.documentElement.classList.add('dark')
		} else {
			document.documentElement.classList.remove('dark')
		}
	}

	const loadThemePreference = () => {
		try {
			const savedTheme = localStorage.getItem('theme')
			if (savedTheme) {
				isDark.value = savedTheme === 'dark'
			} else {
				isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
			}
			updateThemeClass()
		} catch (error) {
			console.error('Failed to load theme preference:', error)
		}
	}

	const saveThemePreference = () => {
		try {
			localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
		} catch (error) {
			console.error('Failed to save theme preference:', error)
		}
	}

	const watchSystemTheme = () => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		mediaQuery.addEventListener('change', (e) => {
			if (localStorage.getItem('theme') === null) {
				isDark.value = e.matches
				updateThemeClass()
			}
		})
	}

	onMounted(() => {
		loadThemePreference()
		watchSystemTheme()
	})

	return {
		isDark,
		toggleTheme,
	}
}

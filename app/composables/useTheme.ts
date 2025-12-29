// SPDX-License-Identifier: MIT
import { ref, onMounted } from 'vue'

const isDark = ref(false)

export function useTheme() {
	const updateThemeClass = () => {
		if (!import.meta.client) return
		if (isDark.value) {
			document.documentElement.classList.add('dark')
		} else {
			document.documentElement.classList.remove('dark')
		}
	}

	const initTheme = () => {
		if (!import.meta.client) return
		isDark.value = document.documentElement.classList.contains('dark')
	}

	onMounted(() => {
		initTheme()
	})

	return {
		isDark,
	}
}

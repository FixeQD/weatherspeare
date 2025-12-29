<template>
	<div class="flex flex-col items-center justify-center py-12 text-center">
		<!-- Magic Aura / Pulse -->
		<div class="relative mb-8">
			<div
				class="absolute inset-0 animate-ping rounded-full bg-blue-500/20 duration-[3000ms]"></div>
			<div
				class="absolute inset-0 animate-pulse rounded-full bg-indigo-500/30 duration-[2000ms]"></div>
			<div
				class="glass-strong relative flex h-20 w-20 items-center justify-center rounded-full border border-white/20 shadow-2xl">
				<Theater class="h-10 w-10 text-blue-400" />

				<!-- Shimmering Particles -->
				<div
					v-for="i in 8"
					:key="i"
					class="animate-ai-particle absolute h-1 w-1 rounded-full bg-white"
					:style="{
						top: '50%',
						left: '50%',
						animationDelay: `${i * 0.4}s`,
						transform: `rotate(${i * 45}deg) translateY(-40px)`,
					}"></div>
			</div>
		</div>

		<!-- Theatrical Messages -->
		<div class="h-8 overflow-hidden">
			<TransitionGroup name="fade-slide" tag="div" class="relative">
				<p
					:key="currentMessageIndex"
					class="text-lg font-medium text-gray-700 italic dark:text-gray-300">
					{{ loadingMessages[currentMessageIndex] }}
				</p>
			</TransitionGroup>
		</div>

		<p class="mt-2 text-sm text-gray-400 dark:text-gray-500">
			The AI quill danceth upon the digital parchment...
		</p>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Theater } from 'lucide-vue-next'

const loadingMessages = [
	'Dipping the quill in the ink of clouds...',
	'Summoning the muse of distant storms...',
	'Weaving the winds into iambic pentameter...',
	'Consulting the oracle of the high seas...',
	'Polishing the metaphors of thunder...',
	'Setting the digital stage for drama...',
	"Translating the rain's tears into verse...",
]

const currentMessageIndex = ref(0)
let timer: any = null

onMounted(() => {
	timer = setInterval(() => {
		currentMessageIndex.value = (currentMessageIndex.value + 1) % loadingMessages.length
	}, 2500)
})

onUnmounted(() => {
	if (timer) clearInterval(timer)
})
</script>

<style scoped>
.animate-ai-particle {
	animation: ai-particle 2s infinite ease-in-out;
	opacity: 0;
}

@keyframes ai-particle {
	0% {
		transform: rotate(var(--tw-rotate)) translateY(-30px) scale(0);
		opacity: 0;
	}
	50% {
		opacity: 1;
		transform: rotate(var(--tw-rotate)) translateY(-50px) scale(1.5);
	}
	100% {
		transform: rotate(var(--tw-rotate)) translateY(-70px) scale(0);
		opacity: 0;
	}
}

.fade-slide-enter-active,
.fade-slide-leave-active {
	transition: all 0.5s ease;
}

.fade-slide-enter-from {
	opacity: 0;
	transform: translateY(10px);
}

.fade-slide-leave-to {
	opacity: 0;
	transform: translateY(-10px);
}
</style>

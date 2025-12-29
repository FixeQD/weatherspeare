<template>
	<div
		class="scroll-parallax-container pointer-events-none fixed inset-0 -z-5"
		:style="parallaxStyle">
		<slot></slot>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps({
	speed: {
		type: Number,
		default: 0.5,
	},
	direction: {
		type: String,
		default: 'vertical',
		validator: (value: string) => ['vertical', 'horizontal', 'both'].includes(value),
	},
	smooth: {
		type: Boolean,
		default: true,
	},
	damping: {
		type: Number,
		default: 0.1,
	},
})

const targetScroll = ref({ x: 0, y: 0 })
const currentScroll = ref({ x: 0, y: 0 })
let animationFrameId: number | null = null

const handleScroll = () => {
	targetScroll.value = {
		x: window.scrollX,
		y: window.scrollY,
	}
}

const updateLoop = () => {
	if (props.smooth) {
		const dx = targetScroll.value.x - currentScroll.value.x
		const dy = targetScroll.value.y - currentScroll.value.y

		if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
			currentScroll.value.x += dx * props.damping
			currentScroll.value.y += dy * props.damping
		}
	} else {
		currentScroll.value = { ...targetScroll.value }
	}

	animationFrameId = requestAnimationFrame(updateLoop)
}

const parallaxStyle = computed(() => {
	const transformX = props.direction.includes('horizontal')
		? currentScroll.value.x * props.speed
		: 0

	const transformY = props.direction.includes('vertical')
		? currentScroll.value.y * props.speed
		: 0

	return {
		transform: `translate3d(${transformX}px, ${transformY}px, 0)`,
		willChange: 'transform',
	}
})

onMounted(() => {
	window.addEventListener('scroll', handleScroll, { passive: true })
	// Initialize position
	targetScroll.value = { x: window.scrollX, y: window.scrollY }
	currentScroll.value = { ...targetScroll.value }
	updateLoop()
})

onBeforeUnmount(() => {
	window.removeEventListener('scroll', handleScroll)
	if (animationFrameId) cancelAnimationFrame(animationFrameId)
})

defineExpose({
	currentScroll,
})
</script>

<style scoped>
.scroll-parallax-container {
	transition: none;
}
</style>

<template>
	<div class="scroll-parallax-container fixed inset-0 pointer-events-none -z-5">
		<slot></slot>
	</div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

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
})

const scrollPosition = ref({ x: 0, y: 0 })

const handleScroll = () => {
	scrollPosition.value = {
		x: window.scrollX,
		y: window.scrollY,
	}
}

const getParallaxStyle = () => {
	const transformX = props.direction.includes('horizontal')
		? scrollPosition.value.x * props.speed
		: 0

	const transformY = props.direction.includes('vertical')
		? scrollPosition.value.y * props.speed
		: 0

	return {
		transform: `translate3d(${transformX}px, ${transformY}px, 0)`,
		willChange: 'transform',
	}
}

onMounted(() => {
	window.addEventListener('scroll', handleScroll, { passive: true })
})

onBeforeUnmount(() => {
	window.removeEventListener('scroll', handleScroll)
})

defineExpose({
	scrollPosition,
})
</script>

<style scoped>
.scroll-parallax-container {
	transition: transform 0.1s ease-out;
}
</style>

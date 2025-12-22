<template>
	<div class="relative min-h-screen overflow-hidden">
		<div
			class="relative min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 transition-colors duration-300 dark:from-gray-900 dark:to-gray-800">
			<div class="container mx-auto px-4 py-8">
				<WeatherHeader />

				<main class="mt-8">
					<WeatherSearchSection />

					<div class="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
						<div class="lg:col-span-2">
							<WeatherMainDisplay />
						</div>
						<div class="lg:col-span-1">
							<WeatherSidebar />
						</div>
					</div>

					<MonologueSection class="mt-12" />
				</main>

				<WeatherFooter />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import WeatherHeader from './components/weather/WeatherHeader.vue'
import WeatherSearchSection from './components/weather/WeatherSearch.vue'
import WeatherMainDisplay from './components/weather/WeatherDisplay.vue'
import WeatherSidebar from './components/weather/WeatherSidebar.vue'
import MonologueSection from './components/shakespeare/MonologueDisplay.vue'
import WeatherFooter from './components/shared/WeatherFooter.vue'
</script>

<style>
/* Global transitions and animations */
.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
	transition: all 0.3s ease;
}
.slide-up-enter-from {
	opacity: 0;
	transform: translateY(20px);
}
.slide-up-leave-to {
	opacity: 0;
	transform: translateY(-20px);
}
</style>

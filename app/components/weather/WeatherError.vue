<template>
	<Card class="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
		<CardContent class="pt-6 text-center">
			<AlertTriangle class="mx-auto mb-4 h-12 w-12 text-red-500 dark:text-red-400" />
			<h3 class="mb-2 text-xl font-semibold text-red-600 dark:text-red-400">
				Error Loading Weather
			</h3>
			<p class="mb-4 text-red-600 dark:text-red-400">
				{{ error }}
			</p>
			<Button
				@click="$emit('retry')"
				variant="outline"
				class="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30">
				<RefreshCw class="mr-2 h-4 w-4" />
				Retry
			</Button>
		</CardContent>
	</Card>
</template>

<script setup lang="ts">
import { AlertTriangle, RefreshCw } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

defineProps<{
	error: string
}>()

defineEmits(['retry'])
</script>

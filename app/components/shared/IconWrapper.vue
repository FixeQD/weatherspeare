<template>
	<component :is="getIconComponent()" v-bind="$attrs" class="text-current" />
</template>

<script setup lang="ts">
import {
	Sun,
	Moon,
	Cloud,
	CloudRain,
	CloudLightning,
	Snowflake,
	CloudDrizzle,
	CloudFog,
	Compass,
	Search,
	Loader2,
	AlertTriangle,
	RefreshCw,
	Clock,
	Calendar,
	History,
	Info,
	Lightbulb,
	Leaf,
	Sunrise,
	Sunset,
	MapPin,
	Theater,
	Copy,
	Check,
	Expand,
	Minimize,
} from 'lucide-vue-next'

const props = defineProps<{
	icon: string
}>()

const getIconComponent = () => {
	const icons: Record<string, any> = {
		'sun': Sun,
		'moon': Moon,
		'cloud': Cloud,
		'cloud-rain': CloudRain,
		'cloud-lightning': CloudLightning,
		'snowflake': Snowflake,
		'cloud-drizzle': CloudDrizzle,
		'cloud-fog': CloudFog,
		'compass': Compass,
		'search': Search,
		'loader': Loader2,
		'alert-triangle': AlertTriangle,
		'refresh-cw': RefreshCw,
		'clock': Clock,
		'calendar': Calendar,
		'history': History,
		'info': Info,
		'lightbulb': Lightbulb,
		'leaf': Leaf,
		'sunrise': Sunrise,
		'sunset': Sunset,
		'map-pin': MapPin,
		'theater': Theater,
		'copy': Copy,
		'check': Check,
		'expand': Expand,
		'minimize': Minimize,
	}

	return icons[props.icon] || Cloud
}
</script>

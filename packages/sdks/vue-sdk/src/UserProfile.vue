<!-- eslint-disable vue/multi-word-component-names -->
<template>
	<div>
		<descope-user-profile-widget
			:project-id="projectId"
			:base-url="baseUrl"
			:base-static-url="baseStaticUrl"
			:theme.attr="theme"
			:debug.attr="debug"
			:widget-id="widgetId"
			@logout="onLogout"
		/>
	</div>
</template>

<script setup lang="ts">
import '@descope/user-profile-widget';
import { useOptions } from './hooks';
const emit = defineEmits(['logout']);

const onLogout = (e: Event) => emit('logout', e);

defineProps({
	widgetId: {
		type: String,
		required: true
	},
	theme: {
		type: String
	},
	debug: {
		type: Boolean
	}
});

const { projectId, baseUrl, baseStaticUrl } = useOptions();
</script>

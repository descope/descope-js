<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div>
    <descope-applications-portal-widget
      :project-id="projectId"
      :base-url="baseUrl"
      :base-static-url="baseStaticUrl"
      :base-cdn-url="baseCdnUrl"
      :theme.attr="theme"
      :debug.attr="debug"
      :widget-id="widgetId"
      :style-id="styleId"
      @ready="onReady"
    />
  </div>
</template>

<script setup lang="ts">
import '@descope/applications-portal-widget';
import { useOptions } from './hooks';

defineProps({
  widgetId: {
    type: String,
    required: true,
  },
  theme: {
    type: String,
  },
  styleId: {
    type: String,
  },
  debug: {
    type: Boolean,
  },
});

const emit = defineEmits<{
  (e: 'ready', payload: CustomEvent<Record<string, never>>): void;
}>();

const { projectId, baseUrl, baseStaticUrl, baseCdnUrl } = useOptions();

const onReady = (e: CustomEvent<Record<string, never>>) => emit('ready', e);
</script>

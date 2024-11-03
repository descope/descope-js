<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div>
    <descope-applications-portal-widget
      :project-id="projectId"
      :base-url="baseUrl"
      :base-static-url="baseStaticUrl"
      :theme.attr="theme"
      :debug.attr="debug"
      :widget-id="widgetId"
      :style-id="styleId"
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

const { projectId, baseUrl, baseStaticUrl } = useOptions();
</script>

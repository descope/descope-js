<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div>
    <descope-user-profile-widget
      :project-id="projectId"
      :base-url="baseUrl"
      :base-static-url="baseStaticUrl"
      :base-cdn-url="baseCdnUrl"
      :theme.attr="theme"
      :debug.attr="debug"
      :widget-id="widgetId"
      @logout="onLogout"
    />
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { DESCOPE_INJECTION_KEY } from './constants';
import '@descope/user-profile-widget';
const descope = inject(DESCOPE_INJECTION_KEY);
import { useOptions } from './hooks';
const emit = defineEmits(['logout']);

const onLogout = (e: Event) => {
  descope?.resetAuth(); // reset session values
  emit('logout', e);
};

defineProps({
  widgetId: {
    type: String,
    required: true,
  },
  theme: {
    type: String,
  },
  debug: {
    type: Boolean,
  },
});

const { projectId, baseUrl, baseStaticUrl, baseCdnUrl } = useOptions();
</script>

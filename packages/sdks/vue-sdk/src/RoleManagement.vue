<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div>
    <descope-role-management-widget
      :project-id="projectId"
      :base-url="baseUrl"
      :base-cdn-url="baseCdnUrl"
      :base-static-url="baseStaticUrl"
      :theme.attr="theme"
      :locale.attr="locale"
      :tenant.attr="tenant"
      :debug.attr="debug"
      :widget-id="widgetId"
      :style-id="styleId"
      @ready="onReady"
      @toast="onToast"
    />
  </div>
</template>

<script setup lang="ts">
import '@descope/role-management-widget';
import { useOptions } from './hooks';

defineProps({
  tenant: {
    type: String,
    required: true,
  },
  widgetId: {
    type: String,
    required: true,
  },
  theme: {
    type: String,
  },
  locale: {
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
  (
    e: 'toast',
    payload: CustomEvent<{
      message: string;
      detail?: string;
      severity: 'success' | 'error';
    }>,
  ): void;
}>();

const { projectId, baseUrl, baseStaticUrl, baseCdnUrl } = useOptions();

const onReady = (e: CustomEvent<Record<string, never>>) => emit('ready', e);
const onToast = (
  e: CustomEvent<{
    message: string;
    detail?: string;
    severity: 'success' | 'error';
  }>,
) => emit('toast', e);
</script>

<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div class="applications-portal-wrapper">
    <h1>Applications Portal</h1>
    <ApplicationsPortal widget-id="applications-portal-widget" />
  </div>
</template>

<script setup>
import { ApplicationsPortal } from '../../src';
</script>

<style>
.applications-portal-wrapper {
  margin: 20px;
}
</style>

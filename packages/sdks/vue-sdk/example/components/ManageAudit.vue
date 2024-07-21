<!-- eslint-disable vue/multi-word-component-names -->
<template>
	<div class="manage-audit-wrapper">
		<h1>Manage Audit</h1>
		<AuditManagement :tenant="tenant" widget-id="audit-management-widget" />
	</div>
</template>

<script setup>
import { AuditManagement } from '../../src';

const tenant = process.env.VUE_APP_DESCOPE_TENANT;
</script>

<style>
.manage-audit-wrapper {
	margin: 20px;
}
</style>

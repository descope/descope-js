<!-- eslint-disable vue/multi-word-component-names -->
<template>
	<div class="manage-roles-wrapper">
		<h1>Manage Roles</h1>
		<RoleManagement :tenant="tenant" widget-id="role-management-widget" />
	</div>
</template>

<script setup>
import { RoleManagement } from '../../src';

const tenant = process.env.VUE_APP_DESCOPE_TENANT;
</script>

<style>
.manage-roles-wrapper {
	margin: 20px;
}
</style>

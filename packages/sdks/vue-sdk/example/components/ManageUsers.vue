<!-- eslint-disable vue/multi-word-component-names -->
<template>
	<div class="manage-users-wrapper">
		<h1>Manage Users</h1>
		<UserManagement :tenant="tenant" widget-id="user-management-widget" />
	</div>
</template>

<script setup>
import { UserManagement } from '../../src';

const tenant = process.env.VUE_APP_DESCOPE_TENANT;
</script>

<style>
.manage-users-wrapper {
	margin: 20px;
}
</style>

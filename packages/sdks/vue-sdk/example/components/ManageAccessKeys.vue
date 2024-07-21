<!-- eslint-disable vue/multi-word-component-names -->
<template>
	<div class="manage-access-keys-wrapper">
		<h1>Manage Access Keys</h1>
		<AccessKeyManagement
			:tenant="tenant"
			widget-id="access-key-management-widget"
		/>

		<h1>Manage My Access Keys</h1>
		<AccessKeyManagement
			:tenant="tenant"
			widget-id="user-access-key-management-widget"
		/>
	</div>
</template>

<script setup>
import { AccessKeyManagement } from '../../src';

const tenant = process.env.VUE_APP_DESCOPE_TENANT;
</script>

<style>
.manage-access-keys-wrapper {
	margin: 20px;
}
</style>

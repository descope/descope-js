<!-- eslint-disable vue/multi-word-component-names -->
<template>
	<div class="user-profile-wrapper">
		<h1>User Profile</h1>
		<UserProfile @logout="onLogout" widget-id="user-profile-widget" />
	</div>
</template>

<script setup>
import { UserProfile } from '../../src';

const onLogout = () => (window.location.href = '/login');
</script>

<style>
.manage-users-wrapper {
	margin: 20px;
}
</style>

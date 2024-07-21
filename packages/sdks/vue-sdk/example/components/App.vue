<template>
	<header>
		<div class="routes">
			<router-link to="/">Home</router-link>
			<router-link to="/manage-users">Manage Users</router-link>
			<router-link to="/manage-roles">Manage Roles</router-link>
			<router-link to="/manage-access-keys">Manage Access Keys</router-link>
			<router-link to="/manage-audit">Manage Audit</router-link>
			<router-link to="/user-profile">User Profile</router-link>
			<router-link to="/login">Login</router-link>
		</div>
		<button v-if="isAuthenticated" @click="logout()">Logout</button>
	</header>
	<router-view />
</template>

<script setup lang="ts">
import { useSession, useDescope } from '../../src';

const { isAuthenticated } = useSession();
const { logout } = useDescope();
</script>

<style>
#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	color: #2c3e50;

	display: flex;
	flex-direction: column;
	justify-content: center;
}

.routes {
	display: flex;
	gap: 20px;
	flex-grow: 1;
}

header {
	display: flex;
}
</style>

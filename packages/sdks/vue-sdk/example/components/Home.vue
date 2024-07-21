<!-- eslint-disable vue/multi-word-component-names -->
<template>
	<div>
		<h1 v-if="user">
			Welcome to the Home Page, {{ user.name || user.email }}!
		</h1>
		<div v-else>Loading</div>
	</div>
</template>

<script setup>
import { useUser } from '../../src';

const { user } = useUser();
</script>

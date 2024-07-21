<!-- eslint-disable vue/multi-word-component-names -->
<template>
	<div class="login-wrapper">
		<p v-if="isLoading || isFlowLoading">Loading...</p>
		<div v-else-if="isAuthenticated">
			<h1>You are authenticated</h1>
		</div>
		<Descope
			:flowId="flowId"
			@success="handleSuccess"
			@error="handleError"
			@ready="handleReady"
			:errorTransformer="errorTransformer"
			:form="form"
			:client="client"
		/>
	</div>
</template>

<script setup>
import { Descope, useSession } from '../../src';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
const isFlowLoading = ref(true);

const handleError = (e) => {
	console.log('Got error', e);
};

const handleReady = () => {
	isFlowLoading.value = false;
};

const handleSuccess = (e) => {
	console.log('Logged in', e);
	router.push({ path: '/' });
};

const errorTransformer = (error) => {
	const translationMap = {
		SAMLStartFailed: 'Failed to start SAML flow'
	};
	return translationMap[error.type] || error.text;
};

const { isLoading, isAuthenticated } = useSession();
const flowId = process.env.VUE_APP_DESCOPE_FLOW_ID || 'sign-up-or-in';
const form = {}; // { email: 'myemail@domain.com' }; // found in context key: form.email
const client = { version: '1.0.1' }; // found in context key: client.version
</script>

<style>
.login-wrapper {
	margin: 20px;
	align-self: center;
	max-width: 500px;
}
</style>

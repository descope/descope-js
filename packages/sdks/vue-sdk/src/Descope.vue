<!-- eslint-disable vue/multi-word-component-names -->
<template>
	<div>
		<descope-wc
			:project-id="projectId"
			:base-url="baseUrl"
			:base-static-url="baseStaticUrl"
			:flow-id="flowId"
			:theme.attr="theme"
			:locale.attr="locale"
			:tenant.attr="tenant"
			:debug.attr="debug"
			:telemetryKey.attr="telemetryKey"
			:redirect-url="redirectUrl"
			:auto-focus="autoFocus"
			:validate-on-blur="validateOnBlur"
			:store-last-authenticated-user="storeLastAuthenticatedUser"
			:errorTransformer.prop="errorTransformer"
			:form.attr="formStr"
			:client.attr="clientStr"
			@success="onSuccess"
			@error="onError"
			@ready="onReady"
		/>
	</div>
</template>

<script setup lang="ts">
import DescopeWcClass from '@descope/web-component';
import { useOptions, useDescope } from './hooks';
import { baseHeaders } from './constants';
import { RequestConfig } from '@descope/core-js-sdk';
import { computed } from 'vue';
import { getGlobalSdk } from './sdk';
import type { JWTResponse, ErrorResponse } from './types';

DescopeWcClass.sdkConfigOverrides = {
	// Overrides the web-component's base headers to indicate usage via the React SDK
	baseHeaders,
	// Disables token persistence within the web-component to delegate token management
	// to the global SDK hooks. This ensures token handling aligns with the SDK's configuration,
	// and web-component requests leverage the global SDK's beforeRequest hooks for consistency
	persistTokens: false,
	hooks: {
		get beforeRequest() {
			// Retrieves the beforeRequest hook from the global SDK, which is initialized
			// within the AuthProvider using the desired configuration. This approach ensures
			// the web-component utilizes the same beforeRequest hooks as the global SDK
			return getGlobalSdk().httpClient.hooks.beforeRequest;
		},
		set beforeRequest(_) {
			// The empty setter prevents runtime errors when attempts are made to assign a value to 'beforeRequest'.
			// JavaScript objects default to having both getters and setters
		}
	}
};

const props = defineProps({
	flowId: {
		type: String,
		required: true
	},
	tenant: {
		type: String
	},
	theme: {
		type: String
	},
	locale: {
		type: String
	},
	debug: {
		type: Boolean
	},
	telemetryKey: {
		type: String
	},
	redirectUrl: {
		type: String
	},
	autoFocus: {
		type: Boolean || String
	},
	validateOnBlur: {
		type: Boolean
	},
	errorTransformer: {
		type: Function
	},
	form: {
		type: Object
	},
	client: {
		type: Object
	}
});
// const emit = defineEmits(['success', 'error', 'ready']);
const emit = defineEmits<{
	(e: 'success', payload: CustomEvent<JWTResponse>): void;
	(e: 'error', payload: CustomEvent<ErrorResponse>): void;
	(e: 'ready', payload: CustomEvent<Record<string, never>>): void;
}>();
const { projectId, baseUrl, baseStaticUrl, storeLastAuthenticatedUser } =
	useOptions();
const sdk = useDescope();

const formStr = computed(() => (props.form ? JSON.stringify(props.form) : ''));
const clientStr = computed(() =>
	props.client ? JSON.stringify(props.client) : ''
);
const onSuccess = async (e: CustomEvent<JWTResponse>) => {
	await sdk.httpClient.hooks?.afterRequest?.(
		{} as RequestConfig,
		new Response(JSON.stringify(e.detail))
	);
	emit('success', e);
};

const onError = (e: CustomEvent<ErrorResponse>) => emit('error', e);

const onReady = (e: CustomEvent<Record<string, never>>) => emit('ready', e);
</script>

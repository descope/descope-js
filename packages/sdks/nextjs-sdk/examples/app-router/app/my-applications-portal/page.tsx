'use client';

import React from 'react';
import { ApplicationsPortal } from '@descope/nextjs-sdk'; // eslint-disable-line

export default () => (
	<div
		style={{
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center'
		}}
	>
		<h1>User Profile</h1>
		<ApplicationsPortal
			widgetId="applications-portal-widget"
			onLogout={() => {
				window.location.href = '/login';
			}}
		/>
	</div>
);

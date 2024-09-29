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
		<h1>Applications Portal</h1>
		<ApplicationsPortal
			widgetId="applications-portal-widget"
		/>
	</div>
);

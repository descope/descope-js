import React from 'react';
import { AuditManagement } from '@descope/nextjs-sdk'; // eslint-disable-line

export default () => (
	<div
		style={{
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center'
		}}
	>
		<h1>Manage Audit</h1>
		<AuditManagement
			tenant={process.env.NEXT_PUBLIC_DESCOPE_TENANT}
			widgetId="audit-management-widget"
		/>
	</div>
);

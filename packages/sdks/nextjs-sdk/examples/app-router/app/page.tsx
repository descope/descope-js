import React from 'react';
import { session } from '@descope/nextjs-sdk/server'; // eslint-disable-line
import Link from 'next/link';
import UserDetails from './UserDetails';

const Page = async () => {
	const sessionRes = session();

	return (
		<div>
			<h1>App Router Home</h1>
			<UserDetails />
			<p>{!sessionRes ? 'User is not logged in' : 'User is logged in'}</p>
			{
				// show link to Manage Users, Roles, Audit, User-Profile and Access Keys if user is logged in
				true && (
					<div>
						<Link href="/manage-users">Manage Users</Link>
						<br />
						<Link href="/manage-roles">Manage Roles</Link>
						<br />
						<Link href="/manage-access-keys">Manage Access Keys</Link>
						<br />
						<Link href="/manage-audit">Manage Audit</Link>
						<br />
						<Link href="/my-user-profile">User Profile</Link>
					</div>
				)
			}
		</div>
	);
};

export default Page;

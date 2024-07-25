/* eslint-disable import/prefer-default-export */

/*
Merges multiple search params into one.
It will override according to the order of the search params
Examples:
 - mergeSearchParams('?a=1', '?b=2') => 'a=1&b=2'
 - mergeSearchParams('?a=1', '?a=2') => 'a=2'
 - mergeSearchParams('?a=1', '?a=2', '?b=3') => 'a=2&b=3'
*/
export const mergeSearchParams = (...searchParams: string[]): string => {
	const res = searchParams.reduce((acc, curr) => {
		const currParams = new URLSearchParams(curr);
		currParams.forEach((value, key) => {
			acc.set(key, value);
		});
		return acc;
	}, new URLSearchParams());

	return res.toString();
};

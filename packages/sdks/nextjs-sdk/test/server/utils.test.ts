import { mergeSearchParams } from '../../src/server/utils';

describe('utils', () => {
	describe('mergeSearchParams', () => {
		it('should merge search params', () => {
			const searchParams = mergeSearchParams('a=1&b=2', 'c=3&d=4');
			expect(searchParams).toBe('a=1&b=2&c=3&d=4');
		});

		it('should merge search params with duplicate keys', () => {
			const searchParams = mergeSearchParams('a=1&b=2', 'a=3&d=4');
			expect(searchParams).toBe('a=3&b=2&d=4');
		});
	});
});

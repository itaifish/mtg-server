import { OS_PATCH_EPOCH_BUILD_ARG, currentOsPatchEpoch } from '../lib/os-patch-epoch';

describe('currentOsPatchEpoch', () => {
	it('formats the epoch as YYYY-MM', () => {
		expect(currentOsPatchEpoch(new Date('2026-09-21T14:03:00Z'))).toBe('2026-09');
	});

	it('is stable across a month', () => {
		expect(currentOsPatchEpoch(new Date('2026-09-01T00:00:00Z'))).toBe(
			currentOsPatchEpoch(new Date('2026-09-30T23:59:59Z')),
		);
	});

	it('changes across a month boundary', () => {
		expect(currentOsPatchEpoch(new Date('2026-09-30T23:59:59Z'))).not.toBe(
			currentOsPatchEpoch(new Date('2026-10-01T00:00:00Z')),
		);
	});

	it('defaults to the current month', () => {
		const now = new Date();
		const expected = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
		expect(currentOsPatchEpoch()).toBe(expected);
	});
});

describe('OS_PATCH_EPOCH_BUILD_ARG', () => {
	it('matches the ARG name in the Dockerfile', () => {
		expect(OS_PATCH_EPOCH_BUILD_ARG).toBe('PATCH_EPOCH');
	});
});

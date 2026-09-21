const ISO_YEAR_MONTH_END = 7;

/** Name of the Dockerfile `ARG` the epoch is passed in as. */
export const OS_PATCH_EPOCH_BUILD_ARG = 'PATCH_EPOCH';

/**
 * The current OS patch epoch as `YYYY-MM`.
 *
 * `ContainerImage.fromAsset` hashes the build context plus the build args, so an unchanged
 * tree produces an asset tag that already exists in ECR, cdk-assets skips the build and push,
 * and the Dockerfile's `apt-get upgrade` never re-runs. Feeding this value in as a build arg
 * gives the hash something that moves on its own, so the image is genuinely rebuilt against
 * the current Debian packages once a month.
 */
export function currentOsPatchEpoch(now: Date = new Date()): string {
	return now.toISOString().slice(0, ISO_YEAR_MONTH_END);
}

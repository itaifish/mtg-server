#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MtgServerStack, StageName } from '../lib/infra-stack';
import { currentOsPatchEpoch } from '../lib/os-patch-epoch';
import { MtgPipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

// Resolved once so every stack in this synth carries the same epoch
const osPatchEpoch = currentOsPatchEpoch();

// Standalone stacks for direct `cdk deploy MtgServer-<stage>` usage
const stages: StageName[] = ['test', 'beta', 'gamma', 'prod'];
for (const stage of stages) {
	new MtgServerStack(app, `MtgServer-${stage}`, {
		stage,
		osPatchEpoch,
		env: {
			account: process.env.CDK_DEFAULT_ACCOUNT,
			region: process.env.CDK_DEFAULT_REGION,
		},
	});
}

// Self-mutating CI/CD pipeline
new MtgPipelineStack(app, 'MtgServerPipeline', {
	githubOwner: 'itaifish',
	githubRepo: 'mtg-server',
	githubBranch: 'main',
	githubTokenSecretName: 'mtg-server/github-token',
	osPatchEpoch,
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
});

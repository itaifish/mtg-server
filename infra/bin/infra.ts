#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MtgServerStack, StageName } from '../lib/infra-stack';
import { MtgPipelineStack } from '../lib/pipeline-stack';

const app = new cdk.App();

// Standalone stacks for direct `cdk deploy MtgServer-<stage>` usage
const stages: StageName[] = ['test', 'beta', 'gamma', 'prod'];
for (const stage of stages) {
	new MtgServerStack(app, `MtgServer-${stage}`, {
		stage,
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
	env: {
		account: process.env.CDK_DEFAULT_ACCOUNT,
		region: process.env.CDK_DEFAULT_REGION,
	},
});

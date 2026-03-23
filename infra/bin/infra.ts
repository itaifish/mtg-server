#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MtgServerStack, StageName } from '../lib/infra-stack';

const app = new cdk.App();

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

import * as cdk from 'aws-cdk-lib';
import { Capture, Template } from 'aws-cdk-lib/assertions';
import { MtgPipelineStack } from '../lib/pipeline-stack';

/** 07:00 UTC on the 2nd of every month. */
const MONTHLY_REBUILD_CRON = 'cron(0 7 2 * ? *)';

describe('MtgPipelineStack', () => {
	const app = new cdk.App();
	const stack = new MtgPipelineStack(app, 'MtgServerPipeline', {
		githubOwner: 'itaifish',
		githubRepo: 'mtg-server',
		githubBranch: 'main',
		githubTokenSecretName: 'mtg-server/github-token',
		osPatchEpoch: '2026-09',
		env: { account: '123456789012', region: 'us-east-1' },
	});
	const template = Template.fromStack(stack);

	it('schedules the OS patch rebuild monthly', () => {
		template.hasResourceProperties('AWS::Events::Rule', {
			ScheduleExpression: MONTHLY_REBUILD_CRON,
			State: 'ENABLED',
		});
	});

	it('points the monthly rebuild at the pipeline', () => {
		const pipelineLogicalIds = Object.keys(template.findResources('AWS::CodePipeline::Pipeline'));
		expect(pipelineLogicalIds).toHaveLength(1);

		const targets = new Capture();
		template.hasResourceProperties('AWS::Events::Rule', {
			ScheduleExpression: MONTHLY_REBUILD_CRON,
			Targets: targets,
		});

		const captured = targets.asArray();
		expect(captured).toHaveLength(1);
		expect(captured[0].Arn['Fn::Join'][1]).toContainEqual({ Ref: pipelineLogicalIds[0] });
	});
});

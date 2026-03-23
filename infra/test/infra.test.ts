import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { MtgServerStack, StageName } from '../lib/infra-stack';

const stages: StageName[] = ['test', 'beta', 'gamma', 'prod'];

describe.each(stages)('MtgServerStack (%s)', (stage) => {
	const app = new cdk.App();
	const stack = new MtgServerStack(app, `MtgServer-${stage}`, {
		stage,
		env: { account: '123456789012', region: 'us-east-1' },
	});
	const template = Template.fromStack(stack);

	it('matches snapshot', () => {
		expect(template.toJSON()).toMatchSnapshot();
	});

	it('creates an RDS PostgreSQL instance', () => {
		template.hasResourceProperties('AWS::RDS::DBInstance', {
			Engine: 'postgres',
			DBName: 'mtg',
		});
	});

	it('creates an ECS Fargate service', () => {
		template.hasResourceProperties('AWS::ECS::Service', {
			LaunchType: 'FARGATE',
		});
	});

	it('creates an ALB', () => {
		template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
	});

	if (stage === 'gamma' || stage === 'prod') {
		it('uses prod-like RDS instance class', () => {
			template.hasResourceProperties('AWS::RDS::DBInstance', {
				DBInstanceClass: 'db.r6g.large',
			});
		});

		it('enables multi-AZ', () => {
			template.hasResourceProperties('AWS::RDS::DBInstance', {
				MultiAZ: true,
			});
		});

		it('runs 2 Fargate tasks', () => {
			template.hasResourceProperties('AWS::ECS::Service', {
				DesiredCount: 2,
			});
		});
	} else {
		it('uses dev RDS instance class', () => {
			template.hasResourceProperties('AWS::RDS::DBInstance', {
				DBInstanceClass: 'db.t4g.micro',
			});
		});

		it('runs 1 Fargate task', () => {
			template.hasResourceProperties('AWS::ECS::Service', {
				DesiredCount: 1,
			});
		});
	}

	if (stage === 'prod') {
		it('enables deletion protection', () => {
			template.hasResourceProperties('AWS::RDS::DBInstance', {
				DeletionProtection: true,
			});
		});
	}
});

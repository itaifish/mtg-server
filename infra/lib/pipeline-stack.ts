import * as cdk from 'aws-cdk-lib';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as pipelines from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { MtgServerStack, StageName } from './infra-stack';

export interface MtgPipelineStackProps extends cdk.StackProps {
	readonly githubOwner: string;
	readonly githubRepo: string;
	readonly githubBranch?: string;
	/** Name of the Secrets Manager secret holding the GitHub OAuth token (plaintext). */
	readonly githubTokenSecretName: string;
}

/** CDK Pipelines self-mutating pipeline: source → build → deploy. */
export class MtgPipelineStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props: MtgPipelineStackProps) {
		super(scope, id, props);

		const source = pipelines.CodePipelineSource.gitHub(
			`${props.githubOwner}/${props.githubRepo}`,
			props.githubBranch ?? 'main',
			{
				authentication: cdk.SecretValue.secretsManager(props.githubTokenSecretName),
			},
		);

		const pipeline = new pipelines.CodePipeline(this, 'Pipeline', {
			pipelineName: 'MtgServerPipeline',
			synth: new pipelines.ShellStep('Synth', {
				input: source,
				installCommands: ['n stable'],
				commands: [
					'SMITHY_RS_TAG=$(git config -f .gitmodules --get submodule.smithy-rs.branch || git -C smithy-rs describe --tags --exact-match 2>/dev/null)',
					'git clone --depth 1 --branch "$SMITHY_RS_TAG" https://github.com/smithy-lang/smithy-rs.git smithy-rs',
					'./gradlew assemble',
					'cd infra',
					'npm ci',
					'npx cdk synth',
				],
				primaryOutputDirectory: 'infra/cdk.out',
			}),
			dockerEnabledForSelfMutation: true,
			codeBuildDefaults: {
				buildEnvironment: {
					computeType: codebuild.ComputeType.MEDIUM,
					privileged: true, // needed for Docker builds
				},
			},
		});

		// Deploy stages in order: test → beta → gamma → prod
		const stages: { stage: StageName; manualApproval: boolean }[] = [
			{ stage: 'test', manualApproval: false },
			{ stage: 'beta', manualApproval: false },
			{ stage: 'gamma', manualApproval: true },
			{ stage: 'prod', manualApproval: true },
		];

		for (const { stage, manualApproval } of stages) {
			const appStage = new MtgServerStage(this, `Deploy-${stage}`, {
				stage,
				env: props.env,
			});

			pipeline.addStage(appStage, {
				pre: manualApproval
					? [new pipelines.ManualApprovalStep(`Approve-${stage}`)]
					: undefined,
			});
		}
	}
}

interface MtgServerStageProps extends cdk.StageProps {
	readonly stage: StageName;
}

class MtgServerStage extends cdk.Stage {
	constructor(scope: Construct, id: string, props: MtgServerStageProps) {
		super(scope, id, props);

		new MtgServerStack(this, `MtgServer-${props.stage}`, {
			stage: props.stage,
		});
	}
}

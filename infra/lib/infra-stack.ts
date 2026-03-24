import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as elbv2_targets from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export type StageName = 'test' | 'beta' | 'gamma' | 'prod';

export interface MtgServerStackProps extends cdk.StackProps {
	readonly stage: StageName;
}

/** Gamma and prod are "prod-like" in terms of resource allocation. */
function isProdLike(stage: StageName): boolean {
	return stage === 'gamma' || stage === 'prod';
}

export class MtgServerStack extends cdk.Stack {
	public readonly vpc: ec2.Vpc;
	public readonly database: rds.DatabaseInstance;
	public readonly dbSecurityGroup: ec2.SecurityGroup;
	public readonly cardImagesBucket: s3.Bucket;
	public readonly fargateService: ecs_patterns.ApplicationLoadBalancedFargateService;
	public readonly api: apigateway.RestApi;
	public readonly apiKey: apigateway.IApiKey;
	public readonly integTestApiKey: apigateway.IApiKey;

	constructor(scope: Construct, id: string, props: MtgServerStackProps) {
		super(scope, id, props);

		const { stage } = props;
		const prodLike = isProdLike(stage);

		// VPC
		this.vpc = new ec2.Vpc(this, 'MtgVpc', {
			maxAzs: 2,
			natGateways: prodLike ? 2 : 1,
		});

		// --- RDS ---

		this.dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
			vpc: this.vpc,
			description: `Security group for MTG Server RDS instance (${stage})`,
			allowAllOutbound: false,
		});

		this.database = new rds.DatabaseInstance(this, 'MtgDatabase', {
			engine: rds.DatabaseInstanceEngine.postgres({
				version: rds.PostgresEngineVersion.VER_16,
			}),
			instanceType: prodLike
				? ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.LARGE)
				: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
			vpc: this.vpc,
			vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
			securityGroups: [this.dbSecurityGroup],
			databaseName: 'mtg',
			credentials: rds.Credentials.fromGeneratedSecret('mtg_admin', {
				secretName: `mtg-server/${stage}/db-credentials`,
			}),
			multiAz: prodLike,
			allocatedStorage: 20,
			maxAllocatedStorage: prodLike ? 100 : 40,
			storageEncrypted: true,
			backupRetention: prodLike ? cdk.Duration.days(14) : cdk.Duration.days(1),
			deletionProtection: stage === 'prod',
			removalPolicy: stage === 'prod' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
		});

		// --- S3 ---

		this.cardImagesBucket = new s3.Bucket(this, 'CardImagesBucket', {
			bucketName: `mtg-card-images-${stage}-${this.account}`,
			blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
			encryption: s3.BucketEncryption.S3_MANAGED,
			enforceSSL: true,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
		});

		// --- ECS Fargate (internal ALB) ---

		const cluster = new ecs.Cluster(this, 'MtgCluster', { vpc: this.vpc });

		this.fargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(
			this,
			'MtgService',
			{
				cluster,
				cpu: prodLike ? 1024 : 256,
				memoryLimitMiB: prodLike ? 2048 : 512,
				desiredCount: prodLike ? 2 : 1,
				taskImageOptions: {
					image: ecs.ContainerImage.fromAsset('..', {
						file: 'Dockerfile',
					}),
					containerPort: 13734,
					environment: {
						RUST_LOG: 'info',
						STAGE: stage,
						CARD_IMAGES_BUCKET: this.cardImagesBucket.bucketName,
					},
					secrets: {
						DB_SECRET: ecs.Secret.fromSecretsManager(this.database.secret!),
					},
				},
				publicLoadBalancer: false,
			},
		);

		// Allow Fargate tasks to connect to RDS
		this.dbSecurityGroup.addIngressRule(
			this.fargateService.service.connections.securityGroups[0],
			ec2.Port.tcp(5432),
			'Allow Postgres from Fargate tasks',
		);

		// Allow Fargate tasks to read/write card images
		this.cardImagesBucket.grantReadWrite(this.fargateService.taskDefinition.taskRole);

		// Health check on the ALB target group
		this.fargateService.targetGroup.configureHealthCheck({
			path: '/ping',
			healthyHttpCodes: '200',
		});

		// Sticky sessions — keep the same requester on the same server
		// so games stay in memory; DB is the fallback on cache miss
		this.fargateService.targetGroup.enableCookieStickiness(cdk.Duration.hours(1));

		// --- API Gateway ---

		// NLB security group — must allow health check and forwarding traffic to the ALB
		const nlbSg = new ec2.SecurityGroup(this, 'NlbSecurityGroup', {
			vpc: this.vpc,
			description: 'Security group for NLB in front of ALB',
			allowAllOutbound: true,
		});
		nlbSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow inbound HTTP');

		const nlb = new elbv2.NetworkLoadBalancer(this, 'MtgNlb', {
			vpc: this.vpc,
			internetFacing: false,
			crossZoneEnabled: true,
			securityGroups: [nlbSg],
		});

		const nlbListener = nlb.addListener('NlbListener', { port: 80 });

		nlbListener.addTargets('AlbTarget', {
			port: 80,
			targets: [new elbv2_targets.AlbListenerTarget(this.fargateService.listener)],
			healthCheck: {
				protocol: elbv2.Protocol.HTTP,
				path: '/ping',
			},
		});

		const vpcLink = new apigateway.VpcLink(this, 'VpcLink', {
			targets: [nlb],
		});

		const nlbDns = nlb.loadBalancerDnsName;

		const pingIntegration = new apigateway.Integration({
			type: apigateway.IntegrationType.HTTP_PROXY,
			integrationHttpMethod: 'GET',
			uri: `http://${nlbDns}/ping`,
			options: {
				connectionType: apigateway.ConnectionType.VPC_LINK,
				vpcLink,
			},
		});

		const proxyIntegration = new apigateway.Integration({
			type: apigateway.IntegrationType.HTTP_PROXY,
			integrationHttpMethod: 'ANY',
			uri: `http://${nlbDns}/{proxy}`,
			options: {
				connectionType: apigateway.ConnectionType.VPC_LINK,
				vpcLink,
				requestParameters: {
					'integration.request.path.proxy': 'method.request.path.proxy',
				},
			},
		});

		this.api = new apigateway.RestApi(this, 'MtgApi', {
			restApiName: `mtg-server-${stage}`,
			deployOptions: {
				stageName: stage,
				throttlingRateLimit: prodLike ? 100 : 20,
				throttlingBurstLimit: prodLike ? 200 : 40,
			},
		});

		// /ping — open, no API key required
		const pingResource = this.api.root.addResource('ping');
		pingResource.addMethod('GET', pingIntegration, { apiKeyRequired: false });

		// /{proxy+} — all other routes require API key
		const proxyResource = this.api.root.addResource('{proxy+}');
		proxyResource.addMethod('ANY', proxyIntegration, {
			apiKeyRequired: true,
			requestParameters: { 'method.request.path.proxy': true },
		});

		// API keys
		this.apiKey = this.api.addApiKey('MtgApiKey', {
			apiKeyName: `mtg-server-${stage}-key`,
		});

		this.integTestApiKey = this.api.addApiKey('IntegTestApiKey', {
			apiKeyName: `mtg-server-${stage}-integ-test-key`,
		});

		const usagePlan = this.api.addUsagePlan('MtgUsagePlan', {
			name: `mtg-server-${stage}-usage-plan`,
			throttle: {
				rateLimit: prodLike ? 100 : 20,
				burstLimit: prodLike ? 200 : 40,
			},
			apiStages: [{ api: this.api, stage: this.api.deploymentStage }],
		});

		usagePlan.addApiKey(this.apiKey);
		usagePlan.addApiKey(this.integTestApiKey);

		// Outputs
		new cdk.CfnOutput(this, 'ApiUrl', {
			value: this.api.url,
			description: 'API Gateway URL for the MTG server',
		});

		new cdk.CfnOutput(this, 'ApiKeyId', {
			value: this.apiKey.keyId,
			description:
				'API Key ID (retrieve value with: aws apigateway get-api-key --api-key <id> --include-value)',
		});

		new cdk.CfnOutput(this, 'IntegTestApiKeyId', {
			value: this.integTestApiKey.keyId,
			description: 'Integration test API Key ID',
		});

		new cdk.CfnOutput(this, 'LoadBalancerDns', {
			value: this.fargateService.loadBalancer.loadBalancerDnsName,
			description: 'Internal ALB DNS name (not publicly accessible)',
		});

		new cdk.CfnOutput(this, 'DbEndpoint', {
			value: this.database.dbInstanceEndpointAddress,
			description: 'RDS PostgreSQL endpoint',
		});

		new cdk.CfnOutput(this, 'DbSecretArn', {
			value: this.database.secret?.secretArn ?? 'N/A',
			description: 'ARN of the Secrets Manager secret for DB credentials',
		});

		new cdk.CfnOutput(this, 'CardImagesBucketName', {
			value: this.cardImagesBucket.bucketName,
			description: 'S3 bucket for card images',
		});
	}
}

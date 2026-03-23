import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
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
	public readonly vpc: ec2.IVpc;
	public readonly database: rds.DatabaseInstance;
	public readonly dbSecurityGroup: ec2.SecurityGroup;
	public readonly cardImagesBucket: s3.Bucket;
	public readonly ecrRepository: ecr.Repository;
	public readonly fargateService: ecs_patterns.ApplicationLoadBalancedFargateService;

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

		// --- ECR ---

		this.ecrRepository = new ecr.Repository(this, 'MtgServerRepo', {
			repositoryName: `mtg-server-${stage}`,
			removalPolicy: cdk.RemovalPolicy.DESTROY,
			emptyOnDelete: true,
			lifecycleRules: [{ maxImageCount: 10 }],
		});

		// --- ECS Fargate ---

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
					image: ecs.ContainerImage.fromEcrRepository(this.ecrRepository, 'latest'),
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
				publicLoadBalancer: true,
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

		// Outputs
		new cdk.CfnOutput(this, 'LoadBalancerDns', {
			value: this.fargateService.loadBalancer.loadBalancerDnsName,
			description: 'ALB DNS name for the MTG server',
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

		new cdk.CfnOutput(this, 'EcrRepositoryUri', {
			value: this.ecrRepository.repositoryUri,
			description: 'ECR repository URI for the MTG server image',
		});
	}
}

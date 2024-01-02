import { aws_cloudfront as cloudfront, aws_s3 as s3, aws_iam as iam } from 'aws-cdk-lib';
import { RemovalPolicy, Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface StaticWebsiteStackProps extends StackProps {
  domainName: string;
}

/**
 * StaticWebsiteStack is designed for setting up infrastructure to host a static website.
 * It leverages S3 Bucket for secure and managed content storage.
 * The class creates two S3 buckets: one for website content with strict access controls and another for storing access logs with auto-expiry and encryption.
 */
export class StaticWebsiteStack extends Stack {
  public readonly siteBucket: s3.Bucket;
  public readonly logBucket: s3.Bucket;
  public readonly cloudfrontOAI: cloudfront.OriginAccessIdentity;

  constructor(parent: Construct, id: string, props: StaticWebsiteStackProps) {
    super(parent, id, props);

    // Create a new S3 bucket for logs with a lifecycle rule
    this.logBucket = new s3.Bucket(this, 'logBucket', {
      bucketName: `logs.${props.domainName}`,
      removalPolicy: RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      lifecycleRules: [
        {
          enabled: true,
          expiration: Duration.days(90),
        },
      ],
    });

    // Create a new S3 bucket for website
    this.siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: props.domainName,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.RETAIN,
      autoDeleteObjects: false, // 'true' is NOT recommended for production code
      encryption: s3.BucketEncryption.S3_MANAGED,
      serverAccessLogsBucket: this.logBucket, // Configure the log bucket for access logs
      serverAccessLogsPrefix: 'website-logs/', // Optional prefix for logs
    });

    this.siteBucket.node.addDependency(this.logBucket);

    // Explicitly allow ListBucket action for custom error access
    this.siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:ListBucket'],
        effect: iam.Effect.ALLOW,
        resources: [this.siteBucket.bucketArn],
        principals: [new iam.ServicePrincipal('cloudfront.amazonaws.com')],
      }),
    );

    this.cloudfrontOAI = new cloudfront.OriginAccessIdentity(this, 'MyOriginAccessIdentity', {
      comment: 'Allows CloudFront to reach the website bucket',
    });
    // Grant read permissions for this bucket and its contents to CloudFront
    this.siteBucket.grantRead(this.cloudfrontOAI);
  }
}

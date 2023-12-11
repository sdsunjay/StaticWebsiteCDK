import {
  aws_cloudfront_origins as cloudfront_origins,
  aws_cloudfront as cloudfront,
  aws_cloudwatch as cloudwatch,
  aws_logs as logs,
  aws_route53 as route53,
  aws_route53_targets as targets,
  aws_route53_patterns as patterns,
  aws_s3 as s3,
  aws_s3_deployment as s3_deploy,
  aws_certificatemanager as acm,
} from 'aws-cdk-lib';
import { App, RemovalPolicy, Stack, StackProps, Duration, CfnParameter, CfnOutput, CfnResource } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface StaticWebsiteStackProps extends StackProps {
  domainName: string;
}

/**
 * Static site infrastructure, which deploys site content to an S3 bucket.
 *
 * The site redirects from HTTP to HTTPS, using a CloudFront distribution,
 * Route53 alias record, and ACM certificate.
 */
export class StaticWebsiteStack extends Stack {
  constructor(parent: Construct, id: string, props: StaticWebsiteStackProps) {
    super(parent, id, props);
    const zone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: props.domainName,
    });
    // Create a new S3 bucket for logs with a lifecycle rule
    const logBucket = new s3.Bucket(this, 'logBucket', {
      bucketName: `logs.${props.domainName}`,
      removalPolicy: RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      lifecycleRules: [
        {
          enabled: true,
          expiration: Duration.days(180),
        },
      ],
    });

    // Content s3 bucket for website
    const siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: props.domainName,
      enforceSSL: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,

      /**
       * The default removal policy is RETAIN, which means that cdk destroy will not attempt to delete
       * the new bucket, and it will remain in your account until manually deleted. If the policy is set to
       * DESTROY, cdk destroy will attempt to delete the bucket, but will error if the bucket is not empty.
       */
      removalPolicy: RemovalPolicy.RETAIN,

      /**
       * For sample purposes only, if you create an S3 bucket then populate it, stack destruction fails.  This
       * setting will enable full cleanup of the demo.
       */
      autoDeleteObjects: false, // 'true' is NOT recommended for production code
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      //minimumTLSVersion: 1.2,
      encryption: s3.BucketEncryption.S3_MANAGED,
      serverAccessLogsBucket: logBucket, // Configure the log bucket for access logs
      serverAccessLogsPrefix: 'website-logs/', // Optional prefix for logs
    });

    siteBucket.node.addDependency(logBucket);

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'MyOriginAccessIdentity', {
      comment: 'Allows CloudFront to reach the website bucket',
    });
    // Grant read permissions for this bucket and its contents to CloudFront
    siteBucket.grantRead(originAccessIdentity);
    // new CfnOutput(this, 'HostedZoneId', { value: zone.hostedZoneId });

    // TLS certificate
    // Cert automatically validated using DNS validation against the specified Route 53 hosted zone.
    // Create a new SSL certificate for your domain and 'www' subdomain with DNS validation
    const certificate = new acm.Certificate(this, 'SiteCertificate', {
      domainName: props.domainName,
      subjectAlternativeNames: [`www.${props.domainName}`],
      validation: acm.CertificateValidation.fromDns(zone), // Perform DNS validation in the given hosted zone
    });
    certificate.node.addDependency(zone);

    //new CfnOutput(this, 'Certificate', { value: certificate.certificateArn });

    // Create a CloudFront distribution with the S3 bucket as the origin and configure to enforce HTTPS
    const distribution = new cloudfront.CloudFrontWebDistribution(this, 'SiteDistribution', {
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: siteBucket,
            originAccessIdentity: originAccessIdentity,
          },
          behaviors: [
            {
              compress: true,
              isDefaultBehavior: true,
              viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, // Enforce HTTPS for the main behavior
              maxTtl: Duration.hours(24),
              defaultTtl: Duration.hours(1),
            },
          ],
        },
      ],
      comment: `${props.domainName}`,
      viewerCertificate: cloudfront.ViewerCertificate.fromAcmCertificate(certificate, {
        aliases: [props.domainName],
        securityPolicy: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        sslMethod: cloudfront.SSLMethod.SNI,
      }),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      defaultRootObject: 'index.html',
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      loggingConfig: {
        bucket: logBucket,
        includeCookies: false,
        prefix: 'cloudfront/',
      },
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });
    // add dependency on the certificate
    distribution.node.addDependency(certificate);
    distribution.node.addDependency(siteBucket);
    // new CfnOutput(this, 'DistributionId', { value: distribution.distributionId });
    // Create route53 record, pointing to distribution
    const domainAliasRecord = new route53.ARecord(this, 'CDKAliasRecord', {
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      recordName: props.domainName,
      zone: zone,
    });

    /*
    const wwwAliasRecord = new route53.CnameRecord(this, 'WWWAliasRecord', {
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(distribution)),
      recordName: `www.${props.domainName}`,
      zone: zone,
    });
    */

    new patterns.HttpsRedirect(this, 'WWWRedirect', {
      recordNames: [`www.${props.domainName}`],
      targetDomain: `${props.domainName}`,
      zone,
    });

    domainAliasRecord.node.addDependency(distribution);
    // Deploy site contents to S3 bucket
    new s3_deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3_deploy.Source.asset('./site-contents')],
      destinationBucket: siteBucket,
      contentType: 'text/html',
      contentLanguage: 'en',
      retainOnDelete: true,
      logRetention: logs.RetentionDays.ONE_WEEK,
      distribution,
      distributionPaths: ['/index.html', '/error.html'],
    });
  }
}

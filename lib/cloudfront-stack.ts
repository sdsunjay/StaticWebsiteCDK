import {
  aws_cloudfront_origins as cloudfront_origins,
  aws_cloudfront as cloudfront,
  aws_route53 as route53,
  aws_logs as logs,
  aws_s3 as s3,
  aws_s3_deployment as s3_deploy,
  aws_certificatemanager as acm,
  aws_iam as iam,
} from 'aws-cdk-lib';
import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Route53Construct } from './route53-construct';

export interface CloudFrontStackProps extends StackProps {
  domainName: string;
  siteBucket: s3.Bucket;
  logBucket: s3.Bucket;
  cloudfrontOAI: cloudfront.OriginAccessIdentity;
}
/**
 * CloudFrontStack is designed for creating a complete CloudFront distribution setup for a hosting static website.
 * It includes Route53 for DNS management, ACM for SSL certificate creation and validation.
 * The class configures a CloudFront distribution with custom response headers,
 * a CloudFront function for WWW to non-WWW redirection, redirects request from HTTP to HTTPS,
 * and S3 bucket deployment for website content.
 * It also sets up Route 53 records using Route53Construct to link the domain to the CloudFront distribution
 * and handles access logs with a designated S3 log bucket.
 */
export class CloudFrontStack extends Stack {
  constructor(parent: Construct, id: string, props: CloudFrontStackProps) {
    super(parent, id, props);
    const zone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: props.domainName,
    });

    // Cert automatically validated using DNS validation against the specified Route 53 hosted zone.
    // Create a new SSL certificate for your domain and 'www' subdomain with DNS validation
    const certificate = new acm.Certificate(this, 'SiteCertificate', {
      domainName: props.domainName,
      subjectAlternativeNames: [`www.${props.domainName}`],
      validation: acm.CertificateValidation.fromDns(zone), // Perform DNS validation in the given hosted zone
    });

    // Creating a custom response headers policy for the Distribution 👇
    const myResponseHeadersPolicyWebsite = new cloudfront.ResponseHeadersPolicy(
      this,
      `${props.stackName}ResponseHeadersPolicyWebsite`,
      {
        responseHeadersPolicyName: `${props.stackName}HostingPolicy`,
        comment: `${props.stackName} Response Headers Policy`,
        securityHeadersBehavior: {
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
          referrerPolicy: {
            referrerPolicy: cloudfront.HeadersReferrerPolicy.ORIGIN,
            override: true,
          },
          strictTransportSecurity: {
            accessControlMaxAge: Duration.seconds(31536000),
            includeSubdomains: true,
            override: true,
          },
          xssProtection: { protection: true, modeBlock: true, override: true },
        },
      },
    );

    // CloudFront Function for redirection
    const redirectFunction = new cloudfront.Function(this, 'RedirectFunction', {
      functionName: 'RedirectWWWToNonWWW', // Optional: if not specified, CDK will generate a unique name
      code: cloudfront.FunctionCode.fromInline(`
            function handler(event) {
              var request = event.request;
              var headers = request.headers;
              var uri = request.uri;

              if (headers.host.value === 'www.movierecommendationswithml.com') {
                var redirectLocation = 'https://movierecommendationswithml.com' + uri;
                var response = {
                  statusCode: 301,
                  statusDescription: 'Moved Permanently',
                  headers: {'location': {value: redirectLocation}}
                };
                return response;
              }
              return request;
            }
          `),
    });

    const s3origin = new cloudfront_origins.S3Origin(props.siteBucket, { originAccessIdentity: props.cloudfrontOAI });

    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      certificate: certificate,
      comment: `${props.domainName}`,
      defaultRootObject: 'index.html',
      domainNames: [props.domainName, `www.${props.domainName}`],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultBehavior: {
        origin: s3origin,
        compress: true,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        functionAssociations: [
          {
            function: redirectFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        '/index.html': {
          origin: s3origin,
          responseHeadersPolicy: myResponseHeadersPolicyWebsite,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          functionAssociations: [
            {
              function: redirectFunction,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
      },
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
          ttl: Duration.days(1),
        },
      ],
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      enableLogging: true,
      logBucket: props.logBucket,
      logIncludesCookies: false,
      logFilePrefix: 'cloudfront/',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    // Add dependency on the Certificate and Website Bucket
    distribution.node.addDependency(certificate);
    distribution.node.addDependency(redirectFunction);

    // Use the Route53Construct
    new Route53Construct(this, 'MyRoute53Construct', {
      domainName: props.domainName,
      zone: zone,
      distribution: distribution,
    });

    // Deploy site contents to S3 bucket
    new s3_deploy.BucketDeployment(this, `${props.stackName}DeploySiteBucket`, {
      sources: [s3_deploy.Source.asset('./site-contents')],
      contentType: 'text/html',
      contentLanguage: 'en',
      destinationBucket: props.siteBucket,
      retainOnDelete: true,
      logRetention: logs.RetentionDays.ONE_WEEK,
      distribution,
      distributionPaths: ['/*'],
    });
  }
}

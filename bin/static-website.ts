#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { StaticWebsiteStack } from '../lib/static-website';
import { CloudFrontStack } from '../lib/cloudfront-stack';

const app = new App();
const domainName = 'movierecommendationswithml.com';

const staticWebsiteStack = new StaticWebsiteStack(app, 'StaticWebsiteStack', {
  stackName: 'StaticWebsiteStack',
  description:
    'S3 Bucket for hosting static website, S3 strict access policies, S3 log bucket with auto-expiry of logs after 90 days',
  domainName: domainName,
  env: { region: process.env.CDK_DEFAULT_REGION, account: process.env.CDK_DEFAULT_ACCOUNT },
});

const cloudFrontStack = new CloudFrontStack(app, 'CloudFrontDistributionStack', {
  stackName: 'CloudFrontDistributionStack',
  cloudfrontOAI: staticWebsiteStack.cloudfrontOAI,
  description:
    'CloudFront Distribution, ACM Certificate, Route53 A Records and AAAA Records, Bucket Deployment. Includes WWW redirection and custom headers',
  domainName: domainName,
  env: { region: process.env.CDK_DEFAULT_REGION, account: process.env.CDK_DEFAULT_ACCOUNT },
  logBucket: staticWebsiteStack.logBucket,
  siteBucket: staticWebsiteStack.siteBucket,
});

// Setting up dependency
cloudFrontStack.addDependency(staticWebsiteStack);

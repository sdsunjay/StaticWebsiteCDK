#!/usr/bin/env node
import { App, Stack, StackProps } from 'aws-cdk-lib';
import { StaticWebsiteStack } from '../lib/static-website';

const app = new App();
new StaticWebsiteStack(app, 'StaticWebsiteStack', {
  description:
    'S3 Log Bucket, S3 Website Bucket, Bucket Deployment, ACM Certificate, CloudFront Distribution, Route53 ARecord',
  domainName: 'movierecommendationswithml.com',
  env: { region: process.env.CDK_DEFAULT_REGION, account: process.env.CDK_DEFAULT_ACCOUNT },
});

# Static Website Hosting on AWS with CDK

This project provides the necessary infrastructure as code to build and deploy a static website using AWS Cloud Development Kit (CDK). It sets up a secure, scalable, and highly available environment. For a *detailed* step-by-step guide on building and deploying this project, see my Medium article: [Host and Deploy a Static Website on Amazon S3 and CloudFront using AWS CDK](https://dhamaharpal.medium.com/host-and-deploy-a-static-website-on-amazon-s3-and-cloudfront-using-aws-cdk-c961d7118921).

## Prerequisites

- Your Domain name is **already** registered either with [AWS Route53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-register.html) or another provider, such as [iwantmyname](https://iwantmyname.com) or [godaddy](https://www.godaddy.com).
- Name servers for the domain point to your Route53 hosted zone. For more details, see the [Important Notes](#important-notes) section.
- Hosted Zone Setup: **Before** deploying this project, you must set up a Route53 Hosted Zone. Clone, compile, and deploy the repository at [HostedZoneCDK](https://github.com/sdsunjay/HostedZoneCDK), which will create a [Route53 Hosted Zone](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.HostedZone.html) necessary for the domain configuration.
- If this is your **first** time using AWS CLI, AWS CDK, etc, use [this setup script](https://github.com/sdsunjay/skeletons/blob/master/usefulScripts/aws-cdk-setup.sh) to automatically install dependencies on OS X.
- AWS CLI installed and configured.
- Node.js and npm installed.
- AWS CDK installed.

## Overview

- **Amazon S3 Buckets**:
  - **Website Bucket**: Hosts the static website content, such as HTML, CSS, and JS;
  - **Log Bucket**: Stores access logs from the website bucket and the CloudFront distribution.
- **Amazon CloudFront Distribution**: Delivers content securely and efficiently to end-users with low latency and high transfer speeds;
- **AWS Certificate Manager (ACM) Certificate**: Secures the website's domain and its `www` subdomain with an SSL/TLS certificate;
- **Amazon Route 53**:
  - Sets up a DNS record in the existing Hosted Zone that directs to the CloudFront distribution;
  - Establishes a DNS record to redirect from `www.<domain name>.com` to `<domain name>.com`.
- **AWS Identity and Access Management (IAM)**: Configures necessary permissions for CloudFront to access the S3 bucket;
- **AWS CloudWatch**: Optionally integrated to provide detailed monitoring and operational insights. Specifically, it can track DNS queries for your hosted zone through a custom CloudWatch dashboard. This dashboard can display metrics like the number of DNS queries over time, helping you monitor the traffic and health of your domain's DNS configuration.

This configuration ensures that the static content is delivered quickly and securely, forming a robust web presence.

## Deployment Steps

1. Clone the repository.
2. Navigate to the project directory.
3. Install the required CDK packages (if not already installed):

   ```bash
   npm install
   npm run format # format the TypeScript
   npm run build # compile the TypeScript code to JavaScript:
   cdk bootstrap # one time only
   cdk deploy # deploy this stack to your default AWS account/region, assumes account ID and region are already set
   # Use cdk destroy to destroy the stack and avoid any charges
   ```

After deployment, the static website will be accessible via your custom domain if configured correctly.

## Important Notes

- Ensure that the `domainName` property is correctly set in the stack props.
- The S3 buckets are configured with a lifecycle rule to delete old logs and with encryption for data security.
- CloudFront is configured to enforce HTTPS and redirect all HTTP requests to HTTPS.
- The deployment script will upload the contents from the `./site-contents` directory to the S3 bucket.
- `bin/static-website.ts` is where you set your domain name
- The `cdk.json` file tells the CDK Toolkit how to execute your app.
- **Domain Name Reminder**: If your domain name is registered outside of AWS, be sure to update the Nameservers to point to the AWS Route 53 Nameservers. This change is **crucial** for your domain to resolve correctly to the AWS resources.

## Security

- The website bucket is only accessible by CloudFront
- The log bucket is not publicly accessible
- CloudFront uses an SSL/TLS certificate from ACM and redirects HTTP requests to HTTPS requests

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

## Support

For any queries or issues, you can open an issue in the repository, or refer to the AWS CDK documentation for more details on the AWS services used.

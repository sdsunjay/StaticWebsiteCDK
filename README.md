# Static Website Hosting on AWS with CDK

This project provides the necessary infrastructure as code to deploy a static website using AWS Cloud Development Kit (CDK). It sets up a secure, scalable, and highly available environment.

## Overview

The CDK script in this project sets up the following AWS resources:

- **Amazon S3 Buckets**:
  - **Website Bucket**: Hosts the static website content (HTML, CSS, JS, etc.).
  - **Log Bucket**: Stores access logs from both the website bucket and the CloudFront distribution.
- **Amazon CloudFront Distribution**: Provides a content delivery network (CDN) service that securely delivers data to users with low latency and high transfer speeds.
- **AWS Certificate Manager (ACM) Certificate**: Provides an SSL/TLS certificate for the website's domain and its `www` subdomain.
- **Amazon Route 53**:
  - Creates a DNS record in [existing Hosted Zone](https://github.com/sdsunjay/HostedZoneCDK) that points to the CloudFront distribution.
  - Creates a DNS record that points from `www.<domain name>.com` to `<domain name>.com` record
- **AWS Identity and Access Management (IAM)**: Sets up the necessary permissions for CloudFront to access the S3 bucket.
- **AWS CloudWatch**: Optionally integrated for monitoring and logging.

## Prerequisites

- Domain name is **already** registered either with [AWS Route53](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/domain-register.html) or another provider
- Name servers for the domain point to your Route53 hosted zone. See Important Notes for more info
- A Route53 hosted zone for your domain already created in your AWS account. See [HostedZoneCDK repo](https://github.com/sdsunjay/HostedZoneCDK) for instructions
- If this is your **first** time use AWS CLI, AWS CDK, etc, use [this setup script](https://github.com/sdsunjay/skeletons/blob/master/usefulScripts/aws-cdk-setup.sh) to automatically install dependencies on OS X
- AWS CLI installed and configured
- Node.js and npm installed
- AWS CDK installed

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
- **Domain Name Reminder**: If your domain name is registered outside of AWS, make sure to update the Nameservers to point to the AWS Route 53 Nameservers. This change is **crucial** for your domain to resolve correctly to the AWS resources.

## Security

- The website bucket has public read access blocked.
- The log bucket has public access blocked and is encrypted.
- CloudFront uses an SSL certificate from ACM and enforces HTTPS.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

## Support

For any queries or issues, you can open an issue in the repository, or refer to the AWS CDK documentation for more details on the AWS services used.

import { aws_cloudfront as cloudfront, aws_route53 as route53, aws_route53_targets as targets } from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';

interface Route53ConstructProps {
  domainName: string;
  zone: route53.IHostedZone;
  distribution: cloudfront.Distribution;
}

/**
 * Route53Construct is a CDK construct class designed to set up Route 53 DNS records for a CloudFront distribution.
 * It configures both A and AAAA records for the root domain and the 'www' subdomain, ensuring proper DNS resolution
 * for IPv4 and IPv6 addresses. This construct assumes an existing hosted zone and a CloudFront distribution,
 * to which it points the DNS records.
 * Dependencies are managed to ensure the distribution is in place before the records are created.
 */
export class Route53Construct extends Construct {
  constructor(scope: Construct, id: string, props: Route53ConstructProps) {
    super(scope, id);
    const route53Target = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(props.distribution));

    // Create route53 record, pointing to CloudFront distribution
    const domainARecord = new route53.ARecord(scope, 'CDKAliasRecord', {
      target: route53Target,
      recordName: props.domainName,
      zone: props.zone,
      ttl: Duration.days(1),
      comment: `A Record for ${props.domainName}`,
    });
    domainARecord.node.addDependency(props.distribution);

    // Create route53 record, pointing to CloudFront distribution
    const domainAaaaRecord = new route53.AaaaRecord(scope, 'CDKAaaaRecord', {
      target: route53Target,
      recordName: props.domainName,
      zone: props.zone,
      ttl: Duration.days(1),
      comment: `AAAA Record for ${props.domainName}`,
    });
    domainAaaaRecord.node.addDependency(props.distribution);

    // Route53 www record, pointing to CloudFront distribution 👇
    const wwwARecord = new route53.ARecord(scope, 'WWWAliasRecord', {
      target: route53Target,
      recordName: 'www',
      zone: props.zone,
      ttl: Duration.days(1),
      comment: `A Record for www.${props.domainName}`,
    });
    wwwARecord.node.addDependency(props.distribution);

    // Route53 www AAAA record, pointing the CloudFront distribution 👇
    const wwwAaaaRecord = new route53.AaaaRecord(scope, 'WWWAaaaRecord', {
      target: route53Target,
      recordName: 'www',
      zone: props.zone,
      ttl: Duration.days(1),
      comment: `AAAA Record for www.${props.domainName}`,
    });
    wwwAaaaRecord.node.addDependency(props.distribution);
  }
}

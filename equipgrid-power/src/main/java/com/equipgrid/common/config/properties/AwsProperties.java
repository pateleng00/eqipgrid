package com.equipgrid.common.config.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Typed configuration for AWS S3 settings.
 * All values are injected from {@code application.properties} (prefix: {@code aws.s3}).
 *
 * <pre>
 * aws.s3.access-key=...
 * aws.s3.secret-key=...
 * aws.s3.region=ap-south-1
 * aws.s3.tmp-bucket-name=equipgrid-tmp-dev
 * aws.s3.common-bucket-name=equipgrid-assets-dev
 * aws.s3.signed-url-expiry-minutes=60
 * </pre>
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "aws.s3")
public class AwsProperties {

    /** AWS IAM access key. Use environment variable {@code AWS_S3_ACCESS_KEY} in production. */
    private String accessKey;

    /** AWS IAM secret key. Use environment variable {@code AWS_S3_SECRET_KEY} in production. */
    private String secretKey;

    /** AWS region, e.g. {@code ap-south-1}. */
    private String region;

    /**
     * Temporary / staging bucket.
     * Files are uploaded here first; promoted to {@link #commonBucketName} after validation.
     */
    private String tmpBucketName;

    /**
     * Permanent / common bucket.
     * All production files (machine images, inspection media, documents) live here.
     */
    private String commonBucketName;

    /** Expiry duration (minutes) for presigned GET / PUT URLs. Defaults to 60. */
    private Integer signedUrlExpiryMinutes = 60;

    /**
     * Optional LocalStack endpoint (e.g. {@code http://localhost:4566}).
     * When set, the S3 client points here instead of real AWS — useful for local dev and tests.
     */
    private String endpoint;
}

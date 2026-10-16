package com.equipgrid.common.config;

import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.client.builder.AwsClientBuilder;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.equipgrid.common.config.properties.AwsProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
@RequiredArgsConstructor
public class S3Config {

  private final AwsProperties awsProperties;

  @Bean
  public AmazonS3 amazonS3() {
    String accessKey = awsProperties.getAccessKey();
    String secretKey = awsProperties.getSecretKey();

    if (accessKey == null
        || accessKey.trim().isEmpty()
        || secretKey == null
        || secretKey.trim().isEmpty()) {
      throw new IllegalStateException(
          "[Security Policy Violation] Explicit AWS S3 credentials are required (Fail-Fast). "
              + "Missing 'aws.s3.access-key' and/or 'aws.s3.secret-key'. "
              + "Please supply AWS_S3_ACCESS_KEY and AWS_S3_SECRET_KEY in your environment or application properties. "
              + "Ambient/host credential discovery (~/.aws/credentials) is strictly disabled.");
    }

    log.info(
        "[S3] Initializing AmazonS3 client with explicit static credentials (accessKey suffix: ...{})",
        accessKey.trim().length() > 4
            ? accessKey.trim().substring(accessKey.trim().length() - 4)
            : "****");

    var credentialsProvider =
        new AWSStaticCredentialsProvider(
            new BasicAWSCredentials(accessKey.trim(), secretKey.trim()));

    String region =
        (awsProperties.getRegion() != null && !awsProperties.getRegion().isBlank())
            ? awsProperties.getRegion().trim()
            : "ap-south-1";

    // LocalStack / custom endpoint override
    if (awsProperties.getEndpoint() != null && !awsProperties.getEndpoint().isBlank()) {
      log.info("[S3] Using custom endpoint: {}", awsProperties.getEndpoint());
      return AmazonS3ClientBuilder.standard()
          .withCredentials(credentialsProvider)
          .withEndpointConfiguration(
              new AwsClientBuilder.EndpointConfiguration(awsProperties.getEndpoint(), region))
          .withPathStyleAccessEnabled(true) // required for LocalStack
          .build();
    }

    return AmazonS3ClientBuilder.standard()
        .withCredentials(credentialsProvider)
        .withRegion(region)
        .build();
  }
}

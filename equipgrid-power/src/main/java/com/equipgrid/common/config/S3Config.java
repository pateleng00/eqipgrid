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

    /**
     * Creates an {@link AmazonS3} (SDK v1) client bean.
     * <p>
     * When {@code aws.s3.endpoint} is set (e.g. {@code http://localhost:4566}),
     * the client points to LocalStack instead of real AWS — allowing full local dev/test without AWS costs.
     * <p>
     * For production on EC2/ECS, switch the credentials provider to
     * {@code InstanceProfileCredentialsProvider.getInstance()} and remove the access/secret keys.
     */
    @Bean
    public AmazonS3 amazonS3() {
        var credentials = new BasicAWSCredentials(
                awsProperties.getAccessKey(),
                awsProperties.getSecretKey()
        );
        var credentialsProvider = new AWSStaticCredentialsProvider(credentials);

        // LocalStack / custom endpoint override
        if (awsProperties.getEndpoint() != null && !awsProperties.getEndpoint().isBlank()) {
            log.info("[S3] Using custom endpoint: {}", awsProperties.getEndpoint());
            return AmazonS3ClientBuilder.standard()
                    .withCredentials(credentialsProvider)
                    .withEndpointConfiguration(new AwsClientBuilder.EndpointConfiguration(
                            awsProperties.getEndpoint(),
                            awsProperties.getRegion()))
                    .withPathStyleAccessEnabled(true)   // required for LocalStack
                    .build();
        }

        return AmazonS3ClientBuilder.standard()
                .withCredentials(credentialsProvider)
                .withRegion(awsProperties.getRegion())
                .build();
    }
}

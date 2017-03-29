export interface CodePipelineApprovalNotificationRecord {
    region: string;
    consoleLink: string;
    approval: CodePipelineApprovalNotificationDetails;
}

export interface CodePipelineApprovalNotificationDetails {
    pipelineName: string;
    stageName: string;
    actionName: string;
    token: string;
    expires: string;
    externalEntityLink: string;
    approvalReviewLink: string;
    customData: string;
}

/**
 * see: http://docs.aws.amazon.com/codepipeline/latest/userguide/how-to-lambda-integration.html#how-to-lambda-JSON
 * see: http://docs.aws.amazon.com/codepipeline/latest/APIReference/API_GetJobDetails.html
 */
export interface CodePipelineEvent {
    "CodePipeline.job": {
        id: string;
        accountId: string;
        data: {
            actionConfiguration: {
                configuration: {
                    FunctionName: string;
                    UserParameters: string;
                }
            },
            inputArtifacts: CodePipelineArtifact[];
            outputArtifacts: CodePipelineArtifact[];
            artifactCredentials: {
                secretAccessKey: string;
                sessionToken: string;
                accessKeyId: string;
            }
        }
    };
}

export interface CodePipelineArtifact {
    location: CodePipelineLocation;
    revision: string;
    name: string;
}

export interface CodePipelineLocation {
    s3Location: CodePipelineS3Location;
    type: "S3";
}

export interface CodePipelineS3Location {
    bucketName: string;
    objectKey: string;
}
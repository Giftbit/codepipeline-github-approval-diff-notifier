import * as aws from "aws-sdk";
import * as awslambda from "aws-lambda"
import {CodePipelineEvent} from "../../common/aws-codepipeline-events";
import * as codePipelineArtifactResolver from "../../common/CodePipelineArtifactResolver";

const artifactBucket = process.env.ARTIFACT_BUCKET;
const stageRevisionStatePrefix = "StageState";

const codepipeline = new aws.CodePipeline();
const s3 = new aws.S3();

export function handler(event: any, context: awslambda.Context, callback: awslambda.Callback): void {
    console.log("event", JSON.stringify(event, null, 2));
    handlerAsync(event, context)
        .then(res => {
            callback(undefined, res);
        }, err => {
            console.error("An unhandled Error occurred while executing the handler", JSON.stringify(err, null, 2));
            callback(err);
        });
}

export async function handlerAsync(event: CodePipelineEvent, context: awslambda.Context): Promise<string> {
    const jobId = event["CodePipeline.job"].id;

    try {
        if (!artifactBucket) {
            throw new Error ("Required Environment variable ARTIFACT_BUCKET was missing");
        }
    } catch (err) {
        console.error(err);
        await codepipeline.putJobFailureResult({
            jobId: jobId,
            failureDetails: {
                type: "ConfigurationError",
                message: err.message,
                externalExecutionId: context.awsRequestId
            }
        }).promise();
        return;
    }

    try {
        const jobContext = await getJobContext(jobId);
        const revisionArtifact = await codePipelineArtifactResolver.getCurrentRevisionArtifact(jobContext.pipelineName, jobContext.stageName);

        await s3.putObject({
            Bucket: artifactBucket,
            Key: `${stageRevisionStatePrefix}/${jobContext.stageName}`,
            Body: revisionArtifact.revisionId
        }).promise();
    } catch (err) {
        console.error(err);
        await codepipeline.putJobFailureResult({
            jobId: jobId,
            failureDetails: {
                type: "JobFailed",
                message: err.message,
                externalExecutionId: context.awsRequestId
            }
        }).promise();
        return;
    }

    await codepipeline.putJobSuccessResult({
        jobId: jobId
    }).promise();

    return "Revision Data Updated";
}

export async function getJobContext(jobId: string): Promise<{pipelineName: string, stageName: string}> {
    const jobDetailsResponse = await codepipeline.getJobDetails({
        jobId: jobId
    }).promise();

    const jobData = jobDetailsResponse.jobDetails.data;

    return {
        pipelineName: jobData.pipelineContext.pipelineName,
        stageName: jobData.pipelineContext.stage.name
    };
}
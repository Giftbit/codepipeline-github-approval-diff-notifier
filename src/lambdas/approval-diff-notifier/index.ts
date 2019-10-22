import * as aws from "aws-sdk";
import * as awslambda from "aws-lambda";
import {SNSEvent} from "../../common/aws-lambda";
import {CodePipelineApprovalNotificationRecord} from "../../common/aws-codepipeline-events";
import * as codePipelineArtifactResolver from "../../common/CodePipelineArtifactResolver"
import {Message} from "../../common/Message";
import {MessageSender} from "../../common/MessageSender";

const artifactBucket = process.env.ARTIFACT_BUCKET;
const stageRevisionStatePrefix = "StageState";

const snsTopic = process.env.SNS_TOPIC;
const preferredSlackChannel = process.env.PREFERRED_SLACK_CHANNEL;

const codePipeline = new aws.CodePipeline();
const s3 = new aws.S3();
const messageSender = new MessageSender(snsTopic);

export async function handler(event: SNSEvent): Promise<string> {
    console.log("event", JSON.stringify(event, null, 2));
    const message = event.Records[0].Sns.Message;

    const approvalNotification = JSON.parse(message) as CodePipelineApprovalNotificationRecord;

    const currentRevisionArtifact = await codePipelineArtifactResolver.getCurrentRevisionArtifact(approvalNotification.approval.pipelineName, approvalNotification.approval.stageName);
    const previousRevisionId = await getPreviousRevisionId(approvalNotification.approval.stageName);

    const compareUrl = getCompareURLFromGithubURLandRevisions(currentRevisionArtifact.revisionUrl, previousRevisionId, currentRevisionArtifact.revisionId);

    const notificationMessage = prepareNotificationMessage(approvalNotification, compareUrl,!!previousRevisionId);

    await messageSender.send(notificationMessage);

    return "Payload sent";
}

export function prepareNotificationMessage(approvalNotification, compareUrl, previousRevisionSet: boolean): Message {
    const subject = `Approval is required for ${approvalNotification.approval.actionName} in the ${approvalNotification.approval.stageName} stage of ${approvalNotification.approval.pipelineName}`;
    let message = new Message({
        subject: subject,
        fields: [
            {
                key: "State",
                value: "Approval Required"
            },
            {
                key: "Pipeline",
                value: `${approvalNotification.approval.pipelineName}`
            },
            {
                key: "Stage",
                value: `${approvalNotification.approval.stageName}`
            },
            {
                key: "Action",
                value: `${approvalNotification.approval.actionName}`
            }
        ],
        metadata: {
            sourceName: `CodePipeline: ${approvalNotification.approval.pipelineName}`,
            sourceIconUrl: "https://s3-us-west-2.amazonaws.com/giftbit-developer-static-resources/AWS-CodePipeline.png"
        }
    });

    if (previousRevisionSet) {
        message.fields.push({
            key: "Differences",
            value: `<${compareUrl}|Compare Link>`
        });
    }
    else {
        message.fields.push({
            key: "Differences",
            value: `No previous revision stored. <${compareUrl}|Revision Tree>`
        })
    }

    message.fields.push({
        key: "Approval",
        value: `<${approvalNotification.approval.approvalReviewLink}|Approval/Reject Link>`
    });

    if (preferredSlackChannel) {
        message.tags.push({
            key: "slack-preferred-channel",
            value: preferredSlackChannel
        });
    }

    return message;
}

export async function getPreviousRevisionId(stageName: string): Promise<string> {
    try {
        const getObjectResult = await s3.getObject({
            Bucket: artifactBucket,
            Key: `${stageRevisionStatePrefix}/${stageName}`
        }).promise();
        return getObjectResult.Body.toString();
    } catch (err) {
        console.error("An Error occurred reading stage state from S3:", err.errorMessage, JSON.stringify(err, null, 2));
        return null;
    }
}

export function getCompareURLFromGithubURLandRevisions(githubURL: string, previousRevision: string, currentRevision: string): string {
    const pattern = /https?:\/\/github.com\/([^/]+)\/([^/]+)\/.*/;
    const matches = githubURL.match(pattern);

    const repoOwner = matches[1];
    const repoName = matches[2];

    if (previousRevision) {
        return `https://github.com/${repoOwner}/${repoName}/compare/${previousRevision}...${currentRevision}`;
    }
    else {
        return `https://github.com/${repoOwner}/${repoName}/tree/${currentRevision}`
    }
}

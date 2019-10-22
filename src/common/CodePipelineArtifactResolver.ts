import * as aws from "aws-sdk";

const codePipeline = new aws.CodePipeline();

export async function getCurrentRevisionArtifact(pipelineName: string, stageName: string): Promise<aws.CodePipeline.ArtifactRevision> {
    const pipelineState = await codePipeline.getPipelineState({
        name: pipelineName
    }).promise();

    const stage = pipelineState.stageStates.find(state => state.stageName === stageName);

    const pipelineExecutionId = stage.latestExecution.pipelineExecutionId;

    const pipelineExecutionResult = await codePipeline.getPipelineExecution({
        pipelineName: pipelineName,
        pipelineExecutionId: pipelineExecutionId
    }).promise();

    return pipelineExecutionResult.pipelineExecution.artifactRevisions.reduce((revision1, revision2) => {
        if (revision1.created < revision2.created) {
            return revision2;
        }
        return revision1;
    });
}

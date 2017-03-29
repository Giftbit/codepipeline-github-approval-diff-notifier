"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t;
    return { next: verb(0), "throw": verb(1), "return": verb(2) };
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
require("babel-polyfill");
var aws = require("aws-sdk");
var Message_1 = require("../../common/Message");
var MessageSender_1 = require("../../common/MessageSender");
var codePipeline = new aws.CodePipeline();
var s3 = new aws.S3();
var artifactBucket = process.env.ARTIFACT_BUCKET;
var snsTopic = process.env.SNS_TOPIC;
var preferredSlackChannel = process.env.PREFERRED_SLACK_CHANNEL;
var stageRevisionStatePrefix = "StageState";
var messageSender = new MessageSender_1.MessageSender(snsTopic);
function handler(event, context, callback) {
    console.log("event", JSON.stringify(event, null, 2));
    handlerAsync(event)
        .then(function (res) {
        callback(undefined, res);
    }, function (err) {
        console.error("An unhandled Error occurred while executing the handler", JSON.stringify(err, null, 2));
        callback(err);
    });
}
exports.handler = handler;
function handlerAsync(event) {
    return __awaiter(this, void 0, void 0, function () {
        var message, approvalNotification, currentRevisionArtifact, previousRevisionId, compareUrl, notificationMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    message = event.Records[0].Sns.Message;
                    approvalNotification = JSON.parse(message);
                    return [4 /*yield*/, getCurrentRevisionArtifact(approvalNotification.approval.pipelineName, approvalNotification.approval.stageName)];
                case 1:
                    currentRevisionArtifact = _a.sent();
                    return [4 /*yield*/, getPreviousRevisionId(approvalNotification.approval.stageName)];
                case 2:
                    previousRevisionId = _a.sent();
                    compareUrl = getCompareURLFromGithubURLandRevisions(currentRevisionArtifact.revisionUrl, previousRevisionId, currentRevisionArtifact.revisionId);
                    notificationMessage = prepareNotificationMessage(approvalNotification, compareUrl);
                    return [4 /*yield*/, messageSender.send(notificationMessage)];
                case 3:
                    _a.sent();
                    return [2 /*return*/, "Payload sent"];
            }
        });
    });
}
exports.handlerAsync = handlerAsync;
function prepareNotificationMessage(approvalNotification, compareUrl) {
    var subject = "Approval is required for " + approvalNotification.approval.actionName + " in the " + approvalNotification.approval.stageName + " stage of " + approvalNotification.approval.pipelineName;
    var message = new Message_1.Message({
        subject: subject,
        fields: [
            {
                key: "State",
                value: "Approval Required"
            },
            {
                key: "Pipeline",
                value: "" + approvalNotification.approval.pipelineName
            },
            {
                key: "Stage",
                value: "" + approvalNotification.approval.stageName
            },
            {
                key: "Action",
                value: "" + approvalNotification.approval.actionName
            },
            {
                key: "Differences",
                value: "<" + compareUrl + "|Compare Link>"
            },
            {
                key: "Approval",
                value: "<" + approvalNotification.approval.approvalReviewLink + "|Approval/Reject Link>"
            }
        ],
        metadata: {
            sourceName: "CodePipeline: " + approvalNotification.approval.pipelineName,
            sourceIconUrl: "https://s3-us-west-2.amazonaws.com/giftbit-developer-static-resources/AWS-CodePipeline.png"
        }
    });
    if (preferredSlackChannel) {
        message.tags.push({
            key: "slack-preferred-channel",
            value: preferredSlackChannel
        });
    }
    return message;
}
exports.prepareNotificationMessage = prepareNotificationMessage;
function getCurrentRevisionArtifact(pipelineName, stageName) {
    return __awaiter(this, void 0, void 0, function () {
        var pipelineState, stage, pipelineExecutionId, pipelineExecutionResult;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, codePipeline.getPipelineState({
                        name: pipelineName
                    }).promise()];
                case 1:
                    pipelineState = _a.sent();
                    stage = pipelineState.stageStates.find(function (state) { return state.stageName === stageName; });
                    pipelineExecutionId = stage.latestExecution.pipelineExecutionId;
                    return [4 /*yield*/, codePipeline.getPipelineExecution({
                            pipelineName: pipelineName,
                            pipelineExecutionId: pipelineExecutionId
                        }).promise()];
                case 2:
                    pipelineExecutionResult = _a.sent();
                    return [2 /*return*/, pipelineExecutionResult.pipelineExecution.artifactRevisions.reduce(function (revision1, revision2) {
                            if (revision1.created < revision2.created) {
                                return revision2;
                            }
                            return revision1;
                        })];
            }
        });
    });
}
exports.getCurrentRevisionArtifact = getCurrentRevisionArtifact;
function getPreviousRevisionId(stageName) {
    return __awaiter(this, void 0, void 0, function () {
        var getObjectResult;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, s3.getObject({
                        Bucket: artifactBucket,
                        Key: stageRevisionStatePrefix + "/" + stageName
                    }).promise()];
                case 1:
                    getObjectResult = _a.sent();
                    return [2 /*return*/, getObjectResult.Body.toString()];
            }
        });
    });
}
exports.getPreviousRevisionId = getPreviousRevisionId;
function getCompareURLFromGithubURLandRevisions(githubURL, previousRevision, currentRevision) {
    var pattern = /https?:\/\/github.com\/([^/]+)\/([^/]+)\/.*/;
    var matches = githubURL.match(pattern);
    var repoOwner = matches[1];
    var repoName = matches[2];
    return "https://github.com/" + repoOwner + "/" + repoName + "/compare/" + previousRevision + "..." + currentRevision;
}
exports.getCompareURLFromGithubURLandRevisions = getCompareURLFromGithubURLandRevisions;

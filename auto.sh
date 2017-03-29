#!/bin/bash

# Make the commands in this script relative to the script, not relative to where you ran them.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $SCRIPT_DIR

# A few bash commands to make development against dev environment easy.
# Set the two properties below to sensible values for your project.

if [ -z "$LAMBDA_FUNCTION_PREFIX" ]; then
    LAMBDA_FUNCTION_PREFIX="CloudFormationCI-CodePipeline"
fi

# The name of an S3 bucket on your account to hold deployment artifacts.
if [ -z "$BUILD_ARTIFACT_BUCKET" ]; then
    BUILD_ARTIFACT_BUCKET="lambda-public-resources"
fi

if ! type "aws" &> /dev/null; then
    echo "'aws' was not found in the path.  Install awscli using 'sudo pip install awscli' then try again."
    exit 1
fi

if ! type "npm" &> /dev/null; then
    echo "'npm' was not found in the path.  Please follow the instruction at https://docs.npmjs.com/getting-started/installing-node then try again."
    exit 1
fi

COMMAND="$1"

if [ "$COMMAND" = "build" ]; then
    # Build one or more lambda functions.
    # eg: ./auto.sh build approval-diff-notifier some-other-function
    # eg: ./auto.sh build

    BUILD_ARGS=""
    for ((i=2;i<=$#;i++)); do
        BUILD_ARGS="$BUILD_ARGS --fxn=${!i}";
    done

    npm run build -- $BUILD_ARGS

elif [ "$COMMAND" = "invoke" ]; then
    # Invoke a lambda function.
    # eg: ./sam.sh invoke myfunction myfile.json

    FXN="$2"
    JSON_FILE="$3"

    if [ "$#" -ne 3 ]; then
        echo "Supply a function name to invoke and json file to invoke with.  eg: $0 invoke myfunction myfile.json"
        exit 1
    fi

    if [ ! -d "./src/lambdas/$FXN" ]; then
        echo "$FXN is not the directory of a lambda function in src/lambdas."
        exit 2
    fi

    if [ ! -f $JSON_FILE ]; then
        echo "$JSON_FILE does not exist."
        exit 3
    fi

        # Search for the ID of the function assuming it was named something like FxnFunction where Fxn is the uppercased form of the dir name.
    SED_COMMAND="sed"
    if ! sed --version 2>&1 | grep "GNU sed" &> /dev/null; then
        if ! type "gsed" &> /dev/null; then
            echo "You appear to not be using an up to date version of GNU sed."
            echo "If you are on a Mac, you can install this using:"
            echo "'brew install gsed'"
            exit 4
        fi
        SED_COMMAND="gsed"
    fi

    FXN_TITLECASE=$(echo $FXN | $SED_COMMAND -r 's/(^|-)([a-z])/\U\2/g')

    FUNCTION_NAME="$(aws lambda list-functions --query "Functions[?starts_with(FunctionName,\`$LAMBDA_FUNCTION_PREFIX$FXN_TITLECASE\`)].FunctionName" --output text)"
    aws lambda invoke --function-name $FUNCTION_NAME --payload fileb://$JSON_FILE /dev/stdout

elif [ "$COMMAND" = "update" ]; then
    # Update lambda function code.
    # eg: ./auto.sh update myfunction

    FXN="$2"

    if [ "$#" -ne 2 ]; then
        echo "Supply a function name to build and upload.  eg: $0 upload myfunction"
        exit 1
    fi

    if [ ! -d "./src/lambdas/$FXN" ]; then
        echo "$FXN is not the directory of a lambda function in src/lambdas."
        exit 2
    fi

    npm run build -- --fxn=$FXN
    if [ $? -ne 0 ]; then
        exit 3
    fi

    # Search for the ID of the function assuming it was named something like FxnFunction where Fxn is the uppercased form of the dir name.
    SED_COMMAND="sed"
    if ! sed --version 2>&1 | grep "GNU sed" &> /dev/null; then
        if ! type "gsed" &> /dev/null; then
            echo "You appear to not be using an up to date version of GNU sed."
            echo "If you are on a Mac, you can install this using:"
            echo "'brew install gsed'"
            exit 4
        fi
        SED_COMMAND="gsed"
    fi

    FXN_TITLECASE=$(echo $FXN | $SED_COMMAND -r 's/(^|-)([a-z])/\U\2/g')

    FUNCTION_NAME="$(aws lambda list-functions --query "Functions[?starts_with(FunctionName,\`$LAMBDA_FUNCTION_PREFIX$FXN_TITLECASE\`)].FunctionName" --output text)"
    if [ $? -ne 0 ]; then
        echo "Unable to find a function named $LAMBDA_FUNCTION_PREFIX-$FXN_TITLECASE"
        exit 5
    fi

    aws lambda update-function-code --function-name $FUNCTION_NAME --zip-file fileb://./dist/$FXN/$FXN.zip

elif [ "$COMMAND" = "package" ]; then
    # Package the lambda function code.
    # eg: ./auto.sh package myfunction

    timestamp=$(date +"%Y%m%d-%H%M")

    FXN="$2"
    if [ -z "$FXN" ]; then

        # Search for the ID of the function assuming it was named something like FxnFunction where Fxn is the uppercased form of the dir name.
        SED_COMMAND="sed"
        if ! sed --version 2>&1 | grep "GNU sed" &> /dev/null; then
            if ! type "gsed" &> /dev/null; then
                echo "You appear to not be using an up to date version of GNU sed."
                echo "If you are on a Mac, you can install this using:"
                echo "'brew install gsed'"
                exit 4
            fi
            SED_COMMAND="gsed"
        fi

        FXN="$(find ./src/lambdas -type d | $SED_COMMAND -r 's#./src/lambdas/?##' | $SED_COMMAND '/^$/d' | tr '\n' ' ')"
    elif [ ! -d  "./src/lambdas/$FXN" ]; then
        echo "$FXN is not a directory of a lambda function in src/lambdas."
        exit 1
    fi

    echo "Building $FXN"
    ./auto.sh build $FXN
    if [ $? -ne 0 ]; then
        exit 1
    fi

    for lambda in $FXN; do
        echo "Packaging $lambda"

        echo "Packaging CloudFormation Template for consumption..."
        aws s3 cp ./dist/$lambda/$lambda.zip s3://$BUILD_ARTIFACT_BUCKET/lambda/$lambda-$timestamp.zip

        echo ""
        echo "The Packaged template has been made available at:"
        echo "https://$BUILD_ARTIFACT_BUCKET.s3.amazonaws.com/lambda/$lambda-$timestamp.zip"
    done
else
    echo "Error: unknown command name '$COMMAND'."
    echo "  usage: $0 <command name>"
    echo "Valid command names: build deploy package invoke"
    exit 2

fi

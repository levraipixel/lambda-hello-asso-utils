#!/bin/bash
set -e

LAMBDA_FUNCTION_NAME="$1"
AWS_REGION="${AWS_REGION:-eu-west-3}"

echo "Current directory: $(pwd)"

if [ -z "$LAMBDA_FUNCTION_NAME" ]; then
  echo "Usage: yarn upload <LAMBDA_FUNCTION_NAME>"
  exit 1
fi

if [ ! -f dist/layer.zip ] || [ ! -f dist/code.zip ]; then
  echo "Missing dist/layer.zip or dist/code.zip. Run 'yarn dist:layer && yarn dist:code' first."
  exit 1
fi

echo "Publishing Lambda Layer..."
LAYER_VERSION_ARN=$(aws lambda publish-layer-version \
  --layer-name "${LAMBDA_FUNCTION_NAME}-layer" \
  --zip-file fileb://dist/layer.zip \
  --compatible-runtimes nodejs24.x \
  --region "$AWS_REGION" \
  --query 'LayerVersionArn' --output text)

echo "Updating Lambda function code..."
aws lambda update-function-code \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --zip-file fileb://dist/code.zip \
  --region "$AWS_REGION" \
  --output text > /dev/null

echo "Updating Lambda function configuration with new layer..."
aws lambda update-function-configuration \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --layers "$LAYER_VERSION_ARN" \
  --region "$AWS_REGION" \
  --output text > /dev/null

echo "Publishing new Lambda version..."
NEW_VERSION=$(aws lambda publish-version \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --region "$AWS_REGION" \
  --query 'Version' --output text)

echo "Deployment complete. New Lambda version: $NEW_VERSION"

#!/bin/bash
set -e

LAMBDA_FUNCTION_NAME="$1"
EVENT_PAYLOAD="${2:-'{\"example\": \"event\"}'}"
AWS_REGION="${AWS_REGION:-eu-west-3}"

if [ -z "$LAMBDA_FUNCTION_NAME" ]; then
  echo "Usage: bash scripts/invoke.sh <LAMBDA_FUNCTION_NAME>"
  exit 1
fi

echo "Fetching Lambda Function URL for $LAMBDA_FUNCTION_NAME..."

FUNCTION_URL=$(aws lambda get-function-url-config \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --region "$AWS_REGION" \
  --query 'FunctionUrl' --output text)

if [ -z "$FUNCTION_URL" ] || [ "$FUNCTION_URL" == "None" ]; then
  echo "No Function URL found for $LAMBDA_FUNCTION_NAME in region $AWS_REGION."
  exit 1
fi

echo "Function URL: $FUNCTION_URL"
echo "Invoking Lambda Function URL with example event..."

curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d "$EVENT_PAYLOAD"
echo

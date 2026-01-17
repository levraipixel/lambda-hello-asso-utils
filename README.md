# lambda-hello-asso-utils

Project to deploy an AWS Lambda function in Node.js 24.x with dependency management via a Lambda layer.

## Structure

- `src/`: Lambda function source code (`index.mjs`)
- `layer/`: npm dependencies to package in the Lambda layer

## Deployment

Deployment is done using `yarn lambda:redeploy <your-lambda-name>`.

## Prerequisites

- AWS CLI configured
- Permissions to update Lambda functions and layers

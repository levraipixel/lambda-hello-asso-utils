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

## Environment variables

- `CLIENT_ID`: OAuth2 client ID for authenticating with the HelloAsso API.
- `CLIENT_SECRET`: OAuth2 client secret for authenticating with the HelloAsso API.
- `ORGANIZATION_SLUG`: The HelloAsso organization slug (unique identifier) used to query organization details.

These variables must be set in your Lambda environment or when running locally for the function to authenticate and access HelloAsso resources.

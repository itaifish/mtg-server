#!/usr/bin/env bash
# Run integration tests against a local server or a deployed stage.
#
# Usage:
#   ./run-local.sh              # test against local server at localhost:13734
#   ./run-local.sh test         # test against the deployed 'test' stage

set -euo pipefail

export AWS_DEFAULT_REGION="us-east-1"
STAGE="${1:-local}"

if [ "$STAGE" = "local" ]; then
  export API_URL="http://localhost:13734"
  # No API key needed — local server has no API Gateway in front
  unset INTEG_TEST_API_KEY 2>/dev/null || true
else
  STACK_NAME="Deploy-${STAGE}-MtgServer-${STAGE}"

  API_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
    --output text)

  API_KEY_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query "Stacks[0].Outputs[?OutputKey=='IntegTestApiKeyId'].OutputValue" \
    --output text)

  export API_URL
  export INTEG_TEST_API_KEY
  INTEG_TEST_API_KEY=$(aws apigateway get-api-key \
    --api-key "$API_KEY_ID" --include-value \
    --query value --output text)
fi

echo "Running integration tests against: $API_URL"
npm test

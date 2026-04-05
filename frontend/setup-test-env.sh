#!/usr/bin/env bash
# Fetches the test stage API URL and API key from AWS and writes .env.test
set -euo pipefail

STACK_NAME="Deploy-test-MtgServer-test"
export AWS_DEFAULT_REGION="us-east-1"

echo "Fetching API URL from stack $STACK_NAME..."
API_URL=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" \
  --output text)

echo "Fetching API key..."
API_KEY_ID=$(aws cloudformation describe-stacks \
  --stack-name "$STACK_NAME" \
  --query "Stacks[0].Outputs[?OutputKey=='IntegTestApiKeyId'].OutputValue" \
  --output text)

API_KEY=$(aws apigateway get-api-key \
  --api-key "$API_KEY_ID" --include-value \
  --query value --output text)

cat > .env.test <<EOF
VITE_API_URL=${API_URL}
VITE_API_KEY=${API_KEY}
EOF

echo "Wrote .env.test:"
echo "  VITE_API_URL=${API_URL}"
echo "  VITE_API_KEY=<redacted>"

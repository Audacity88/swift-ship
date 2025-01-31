#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if server is running
echo -e "${BLUE}Checking if server is running...${NC}"
if ! curl -s http://localhost:3000/api/health-check > /dev/null; then
  echo -e "${RED}Server is not running on http://localhost:3000${NC}"
  echo -e "${YELLOW}Please start the server with 'pnpm dev' and try again${NC}"
  exit 1
fi
echo -e "${GREEN}Server is running!${NC}\n"

echo -e "${BLUE}🚀 Testing Quote Creation Flow${NC}\n"

# Function to send request and process response
send_request() {
  local message="$1"
  local conversation_history="$2"
  local agent_printed=""
  local full_response=""
  
  echo -e "${YELLOW}User: $message${NC}"
  echo -e "${BLUE}Assistant:${NC}"

  # Create request JSON using jq to properly escape strings
  local request=$(jq -n \
    --arg msg "$message" \
    --argjson history "$conversation_history" \
    '{
      message: $msg,
      conversationHistory: $history,
      agentType: "quote",
      metadata: {
        userId: "test_user",
        token: "mock_test_token_123",
        customer: {
          id: "test_customer",
          name: "Test Customer",
          email: "test@example.com"
        }
      }
    }')

  echo -e "${BLUE}Sending request with payload:${NC}"
  echo "$request" | jq '.'

  # Send request and process streaming response
  local response_file=$(mktemp)
  local debug_file=$(mktemp)
  
  echo -e "${BLUE}Sending request to server...${NC}"
  curl -v -N -s -X POST http://localhost:3000/api/ai-support \
    -H "Content-Type: application/json" \
    -d "$request" 2>"$debug_file" | while IFS= read -r line; do
      if [[ $line == data:* ]]; then
        local chunk=$(echo "$line" | sed 's/^data: //')
        local content=$(echo "$chunk" | jq -r '.content // empty')
        local agent=$(echo "$chunk" | jq -r '.metadata.agent // empty' | tr '_' ' ')
        local metadata=$(echo "$chunk" | jq -r '.metadata // empty')
        
        if [ ! -z "$content" ]; then
          if [ ! -z "$agent" ] && [ -z "$agent_printed" ]; then
            echo -e "${GREEN}Answered by: $agent${NC}"
            agent_printed=true
          fi
          echo -n "$content"
          echo -n "$content" >> "$response_file"
        fi
        
        if [ ! -z "$metadata" ]; then
          echo -e "\n${BLUE}Response metadata: $metadata${NC}"
        fi
      fi
    done

  echo -e "\n${BLUE}Debug information:${NC}"
  cat "$debug_file"
  rm -f "$debug_file"

  echo
  cat "$response_file" > /tmp/last_response.txt
  rm -f "$response_file"
}

# Initial request
INITIAL_MESSAGE="I need to create a shipping quote"
HISTORY="[]"
send_request "$INITIAL_MESSAGE" "$HISTORY"
INITIAL_RESPONSE=$(cat /tmp/last_response.txt)
echo "Initial response: $INITIAL_RESPONSE"
HISTORY=$(jq -n \
  --arg msg "$INITIAL_MESSAGE" \
  --arg resp "$INITIAL_RESPONSE" \
  '[
    {role: "user", content: $msg},
    {role: "assistant", content: $resp}
  ]')

# Send package details
echo -e "\n${BLUE}Testing package details step...${NC}\n"
PACKAGE_MESSAGE="I have a full truckload shipment, weighing 10 tons, with a volume of 40 cubic meters. No hazardous materials."
send_request "$PACKAGE_MESSAGE" "$HISTORY"
PACKAGE_RESPONSE=$(cat /tmp/last_response.txt)
echo "Package response: $PACKAGE_RESPONSE"
HISTORY=$(jq -n \
  --arg msg1 "$INITIAL_MESSAGE" \
  --arg resp1 "$INITIAL_RESPONSE" \
  --arg msg2 "$PACKAGE_MESSAGE" \
  --arg resp2 "$PACKAGE_RESPONSE" \
  '[
    {role: "user", content: $msg1},
    {role: "assistant", content: $resp1},
    {role: "user", content: $msg2},
    {role: "assistant", content: $resp2}
  ]' | tee /tmp/history.json)

echo -e "\n${GREEN}Test Complete${NC}"
rm -f /tmp/last_response.txt
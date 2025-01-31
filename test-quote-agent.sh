#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'

# Supabase configuration
SUPABASE_URL="https://dkrhdxqqkgutrnvsfhxi.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRrcmhkeHFxa2d1dHJudnNmaHhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczMDc1OTYsImV4cCI6MjA1Mjg4MzU5Nn0.RsoPDd9483Fotgzw0TXYIjVjuHB1_LGeRUe4c0WCvbo"

# Initialize conversation history array
conversation=()

# Function to make API calls and update conversation history
make_request() {
    local message="$1"
    
    echo -e "${BLUE}Sending request:${NC} $message"
    
    # Convert conversation array to JSON array
    history_json="["
    for ((i=0; i<${#conversation[@]}; i++)); do
        if [ $i -gt 0 ]; then
            history_json+=","
        fi
        history_json+="${conversation[$i]}"
    done
    history_json+="]"
    
    # Show the request payload
    echo "Request payload:"
    echo "{
      \"message\": \"$message\",
      \"conversationHistory\": $history_json,
      \"agentType\": \"quote\",
      \"metadata\": {
        \"agentType\": \"quote\",
        \"userId\": \"123\",
        \"customer\": {
          \"name\": \"John Doe\",
          \"email\": \"john@example.com\"
        }
      }
    }" | jq '.'
    
    # Make the API call and show the parsed response
    echo -e "${BLUE}Response:${NC}"
    response=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/quote-agent" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
        -d "{
          \"message\": \"$message\",
          \"conversationHistory\": $history_json,
          \"agentType\": \"quote\",
          \"metadata\": {
            \"agentType\": \"quote\",
            \"userId\": \"123\",
            \"customer\": {
              \"name\": \"John Doe\",
              \"email\": \"john@example.com\"
            }
          }
        }")
    
    # Extract and display the content from the SSE response
    content=$(echo "$response" | grep -o 'data: {"type":"chunk","content":"[^"]*"' | sed 's/data: {"type":"chunk","content":"//g' | sed 's/"$//g')
    echo -e "${GREEN}Content:${NC} $content"
    
    # Add messages to conversation history
    user_message="{\"role\": \"user\", \"content\": \"$message\"}"
    assistant_message="{\"role\": \"assistant\", \"content\": \"$content\"}"
    conversation+=("$user_message")
    conversation+=("$assistant_message")
    
    echo "----------------------------------------"
    sleep 2 # Wait between requests
}

echo -e "${BLUE}Starting Quote Agent Test...${NC}"
echo "----------------------------------------"

# Test 1: Initial quote creation request
make_request "I need to create a shipping quote"

# Test 2: Provide package details
make_request "Its a full truckload shipment, weighing 20 tons with a volume of 40 cubic meters. No hazardous materials."

# Test 3: Provide addresses and pickup time
make_request "Pickup from 123 Main St, Los Angeles, CA to 456 Park Ave, New York, NY. Pickup next Monday at 9am"

# Test 4: Select service option
make_request "I'll take the standard freight option"

# Test 5: Confirm quote creation
make_request "Yes, please create the quote"

echo -e "${GREEN}Quote Agent Test Complete!${NC}" 
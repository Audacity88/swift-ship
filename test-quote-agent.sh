#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BLUE='\033[0;34m'

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
    
    # Make the API call and collect all chunks
    response=$(curl -s -X POST http://localhost:3000/api/ai-support \
        -H "Content-Type: application/json" \
        -d "{\"message\": \"$message\", \"conversationHistory\": $history_json}" | 
        grep -o 'data: {"type":"chunk","content":"[^"]*"' | 
        sed 's/data: {"type":"chunk","content":"//g' | 
        sed 's/"$//g' | 
        tr -d '\n')
    
    # Add messages to conversation history
    user_message="{\"role\": \"user\", \"content\": \"$message\"}"
    assistant_message="{\"role\": \"assistant\", \"content\": \"$response\"}"
    
    conversation+=("$user_message")
    conversation+=("$assistant_message")
    
    echo -e "${GREEN}Response:${NC} $response"
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

# Test 4: Select service level
make_request "I'd like to go with the standard freight option"

# Test 5: Confirm quote
make_request "Yes, please create the quote"

echo -e "${GREEN}Quote Agent Test Complete!${NC}" 
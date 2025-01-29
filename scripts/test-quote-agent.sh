#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# Mock token for testing
MOCK_TOKEN="mock_test_token_123"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo -e "${RED}Error: jq is required but not installed${NC}"
  echo -e "${YELLOW}Please install jq with: brew install jq${NC}"
  exit 1
fi

# Check if server is running
echo -e "${BLUE}Checking if server is running...${NC}"
if ! curl -s http://localhost:3000/api/health-check > /dev/null; then
  echo -e "${RED}Server is not running on http://localhost:3000${NC}"
  echo -e "${YELLOW}Please start the server with 'pnpm dev' and try again${NC}"
  exit 1
fi
echo -e "${GREEN}Server is running!${NC}\n"

# Function to process streaming response
process_stream() {
  local response=""
  local in_error=false
  
  while IFS= read -r line; do
    # Skip empty lines
    [ -z "$line" ] && continue
    
    # Check for error responses
    if [[ $line == *"error"* ]]; then
      echo -e "${RED}Error in response: $line${NC}" >&2
      in_error=true
      continue
    fi
    
    if [[ $line == data:* ]]; then
      # Extract the content from the JSON chunk
      content=$(echo "$line" | sed 's/^data: //' | jq -r '.content // empty' 2>/dev/null)
      if [ ! -z "$content" ]; then
        response+="$content"
      fi
    fi
  done
  
  if [ "$in_error" = true ]; then
    echo -e "${RED}Failed to process response${NC}" >&2
    return 1
  fi
  
  if [ -z "$response" ]; then
    echo -e "${YELLOW}Warning: Empty response received${NC}" >&2
  else
    echo -e "$response"
  fi
}

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
        -d "{
          \"message\": \"$message\", 
          \"conversationHistory\": $history_json,
          \"agentType\": \"quote\",
          \"metadata\": {
            \"userId\": \"test_user\",
            \"token\": \"${MOCK_TOKEN}\",
            \"customer\": {
              \"id\": \"test_customer\",
              \"name\": \"Test Customer\",
              \"email\": \"test@example.com\"
            }
          }
        }" | 
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

# Test cases
echo -e "${BLUE}🚀 Testing Quote Creation Flow${NC}\n"

# Step 1: Start Quote Creation
echo -e "${GREEN}Step 1: Starting Quote Creation${NC}"
echo -e "${YELLOW}User: I need to create a shipping quote${NC}"
echo -e "${BLUE}Assistant:${NC} "
response=$(curl -N -s -X POST http://localhost:3000/api/ai-support \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${MOCK_TOKEN}" \
  -d '{
    "message": "I need to create a shipping quote",
    "conversationHistory": [],
    "agentType": "quote",
    "metadata": {
      "userId": "test_user",
      "token": "'${MOCK_TOKEN}'",
      "customer": {
        "id": "test_customer",
        "name": "Test Customer",
        "email": "test@example.com"
      }
    }
  }')

if [ $? -eq 0 ]; then
  echo "$response" | process_stream
else
  echo -e "${RED}Failed to send request${NC}"
fi
echo -e "\n"

# Step 2: Provide Package Details
echo -e "${GREEN}Step 2: Providing Package Details${NC}"
echo -e "${YELLOW}User: It's a full truckload shipment, weighing 20 tons with a volume of 40 cubic meters. No hazardous materials.${NC}"
echo -e "${BLUE}Assistant:${NC} "
response=$(curl -N -s -X POST http://localhost:3000/api/ai-support \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${MOCK_TOKEN}" \
  -d '{
    "message": "Its a full truckload shipment, weighing 20 tons with a volume of 40 cubic meters. No hazardous materials.",
    "conversationHistory": [
      {
        "role": "assistant", 
        "content": "I'\''ll help you create a shipping quote. First, I need some details about your shipment:\n\n1. What type of shipment is this?\n   - Full Truckload (FTL)\n   - Less than Truckload (LTL)\n   - Sea Container\n   - Bulk Freight\n\n2. What'\''s the total weight in metric tons?\n3. What'\''s the total volume in cubic meters?\n4. Are there any hazardous materials?\n\nPlease provide all these details in your response."
      }
    ],
    "agentType": "quote",
    "metadata": {
      "userId": "test_user",
      "token": "'${MOCK_TOKEN}'",
      "customer": {
        "id": "test_customer",
        "name": "Test Customer",
        "email": "test@example.com"
      }
    }
  }')

if [ $? -eq 0 ]; then
  echo "$response" | process_stream
else
  echo -e "${RED}Failed to send request${NC}"
fi
echo -e "\n"

# Step 3: Provide Address Details
echo -e "${GREEN}Step 3: Providing Address Details${NC}"
echo -e "${YELLOW}User: Pickup from 123 Main St, Los Angeles, CA to 456 Park Ave, New York, NY. Pickup next Monday at 9am${NC}"
echo -e "${BLUE}Assistant:${NC} "
response=$(curl -N -s -X POST http://localhost:3000/api/ai-support \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${MOCK_TOKEN}" \
  -d '{
    "message": "Pickup from 123 Main St, Los Angeles, CA to 456 Park Ave, New York, NY. Pickup next Monday at 9am",
    "conversationHistory": [
      {
        "role": "assistant", 
        "content": "I'\''ll help you create a shipping quote. First, I need some details about your shipment:\n\n1. What type of shipment is this?\n   - Full Truckload (FTL)\n   - Less than Truckload (LTL)\n   - Sea Container\n   - Bulk Freight\n\n2. What'\''s the total weight in metric tons?\n3. What'\''s the total volume in cubic meters?\n4. Are there any hazardous materials?\n\nPlease provide all these details in your response."
      },
      {
        "role": "user",
        "content": "Its a full truckload shipment, weighing 20 tons with a volume of 40 cubic meters. No hazardous materials."
      },
      {
        "role": "assistant",
        "content": "Great! Now I need the pickup and delivery information:\n\n1. What'\''s the complete pickup address? (including city and state)\n2. What'\''s the complete delivery address? (including city and state)\n3. When would you like the pickup to be scheduled? (date and time)\n\nPlease provide all these details in your response."
      }
    ],
    "agentType": "quote",
    "metadata": {
      "userId": "test_user",
      "token": "'${MOCK_TOKEN}'",
      "customer": {
        "id": "test_customer",
        "name": "Test Customer",
        "email": "test@example.com"
      }
    }
  }')

if [ $? -eq 0 ]; then
  echo "$response" | process_stream
else
  echo -e "${RED}Failed to send request${NC}"
fi
echo -e "\n"

# Step 4: Select Service Level
echo -e "${GREEN}Step 4: Selecting Service Level${NC}"
echo -e "${YELLOW}User: I'd like to go with the standard freight option${NC}"
echo -e "${BLUE}Assistant:${NC} "
response=$(curl -N -s -X POST http://localhost:3000/api/ai-support \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${MOCK_TOKEN}" \
  -d '{
    "message": "I'\''d like to go with the standard freight option",
    "conversationHistory": [
      {
        "role": "assistant", 
        "content": "I'\''ll help you create a shipping quote. First, I need some details about your shipment:\n\n1. What type of shipment is this?\n   - Full Truckload (FTL)\n   - Less than Truckload (LTL)\n   - Sea Container\n   - Bulk Freight\n\n2. What'\''s the total weight in metric tons?\n3. What'\''s the total volume in cubic meters?\n4. Are there any hazardous materials?\n\nPlease provide all these details in your response."
      },
      {
        "role": "user",
        "content": "Its a full truckload shipment, weighing 20 tons with a volume of 40 cubic meters. No hazardous materials."
      },
      {
        "role": "assistant",
        "content": "Great! Now I need the pickup and delivery information:\n\n1. What'\''s the complete pickup address? (including city and state)\n2. What'\''s the complete delivery address? (including city and state)\n3. When would you like the pickup to be scheduled? (date and time)\n\nPlease provide all these details in your response."
      },
      {
        "role": "user",
        "content": "Pickup from 123 Main St, Los Angeles, CA to 456 Park Ave, New York, NY. Pickup next Monday at 9am"
      },
      {
        "role": "assistant",
        "content": "Based on your shipment details:\n\n📦 FULL TRUCKLOAD\n⚖️ Weight: 20 tons\n📐 Volume: 40 m³\n🚚 Distance: 3935 km\n\nAvailable service options:\n\n1. Express Freight (1-2 Business Days)\n   Price: $15,000\n\n2. Standard Freight (3-5 Business Days)\n   Price: $10,000\n\n3. Eco Freight (5-7 Business Days)\n   Price: $8,000\n\nWhich service level would you like to select? Please specify '\''express'\'', '\''standard'\'', or '\''eco'\''."
      }
    ],
    "agentType": "quote",
    "metadata": {
      "userId": "test_user",
      "token": "'${MOCK_TOKEN}'",
      "customer": {
        "id": "test_customer",
        "name": "Test Customer",
        "email": "test@example.com"
      }
    }
  }')

if [ $? -eq 0 ]; then
  echo "$response" | process_stream
else
  echo -e "${RED}Failed to send request${NC}"
fi
echo -e "\n" 
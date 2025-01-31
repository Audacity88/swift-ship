#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
else
  echo -e "${RED}Error: .env.local file not found${NC}"
  exit 1
fi

# Check if required environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo -e "${RED}Error: NEXT_PUBLIC_SUPABASE_URL is not set${NC}"
  exit 1
fi

FUNCTION_URL="${NEXT_PUBLIC_SUPABASE_URL}/functions/v1/docs-agent"

# Function to process streaming response
process_stream() {
  local response=""
  local in_error=false
  local metadata=""
  
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
      # Parse the JSON data
      local json_data=$(echo "$line" | sed 's/^data: //')
      
      # Extract content if available
      local content=$(echo "$json_data" | jq -r '.content // empty' 2>/dev/null)
      if [ ! -z "$content" ]; then
        response+="$content"
      fi
      
      # Extract metadata if available
      local meta=$(echo "$json_data" | jq -r '.metadata // empty' 2>/dev/null)
      if [ ! -z "$meta" ]; then
        metadata="$meta"
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
  
  if [ ! -z "$metadata" ]; then
    echo -e "\n${BLUE}Metadata:${NC}"
    echo "$metadata" | jq '.'
  fi
}

# Test cases
echo -e "${BLUE}📚 Testing Documentation Agent Edge Function${NC}\n"

# Test 1: Service Information
echo -e "${GREEN}Test 1: Service Information Request${NC}"
echo -e "${YELLOW}User: What shipping services does Swift Ship offer?${NC}"
echo -e "${BLUE}Assistant:${NC} "
response=$(curl -N -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -d '{
    "message": "What shipping services does Swift Ship offer?",
    "conversationHistory": [],
    "agentType": "docs"
  }')

if [ $? -eq 0 ]; then
  echo "$response" | process_stream
else
  echo -e "${RED}Failed to send request${NC}"
fi
echo -e "\n"

# Test 2: Package Guidelines
echo -e "${GREEN}Test 2: Package Guidelines Query${NC}"
echo -e "${YELLOW}User: What are the packaging requirements for fragile items?${NC}"
echo -e "${BLUE}Assistant:${NC} "
response=$(curl -N -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -d '{
    "message": "What are the packaging requirements for fragile items?",
    "conversationHistory": [],
    "agentType": "docs"
  }')

if [ $? -eq 0 ]; then
  echo "$response" | process_stream
else
  echo -e "${RED}Failed to send request${NC}"
fi
echo -e "\n"

# Test 3: Restricted Items
echo -e "${GREEN}Test 3: Restricted Items Query${NC}"
echo -e "${YELLOW}User: What items are not allowed for shipping?${NC}"
echo -e "${BLUE}Assistant:${NC} "
response=$(curl -N -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -d '{
    "message": "What items are not allowed for shipping?",
    "conversationHistory": [],
    "agentType": "docs"
  }')

if [ $? -eq 0 ]; then
  echo "$response" | process_stream
else
  echo -e "${RED}Failed to send request${NC}"
fi
echo -e "\n"

# Test 4: Insurance Information
echo -e "${GREEN}Test 4: Insurance Query${NC}"
echo -e "${YELLOW}User: How does your shipping insurance work and what does it cover?${NC}"
echo -e "${BLUE}Assistant:${NC} "
response=$(curl -N -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -d '{
    "message": "How does your shipping insurance work and what does it cover?",
    "conversationHistory": [],
    "agentType": "docs"
  }')

if [ $? -eq 0 ]; then
  echo "$response" | process_stream
else
  echo -e "${RED}Failed to send request${NC}"
fi
echo -e "\n"

# Test 5: Pricing Query
echo -e "${GREEN}Test 5: Pricing Information Query${NC}"
echo -e "${YELLOW}User: What are your shipping rates for international deliveries?${NC}"
echo -e "${BLUE}Assistant:${NC} "
response=$(curl -N -s -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -d '{
    "message": "What are your shipping rates for international deliveries?",
    "conversationHistory": [],
    "agentType": "docs"
  }')

if [ $? -eq 0 ]; then
  echo "$response" | process_stream
else
  echo -e "${RED}Failed to send request${NC}"
fi
echo -e "\n" 
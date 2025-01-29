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

# Test cases
echo -e "${BLUE}📚 Testing Documentation Agent${NC}\n"

# Test 1: Service Information
echo -e "${GREEN}Test 1: Service Information Request${NC}"
echo -e "${YELLOW}User: What shipping services does Swift Ship offer?${NC}"
echo -e "${BLUE}Assistant:${NC} "
response=$(curl -N -s -X POST http://localhost:3000/api/ai-support \
  -H "Content-Type: application/json" \
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
response=$(curl -N -s -X POST http://localhost:3000/api/ai-support \
  -H "Content-Type: application/json" \
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
response=$(curl -N -s -X POST http://localhost:3000/api/ai-support \
  -H "Content-Type: application/json" \
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
response=$(curl -N -s -X POST http://localhost:3000/api/ai-support \
  -H "Content-Type: application/json" \
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
response=$(curl -N -s -X POST http://localhost:3000/api/ai-support \
  -H "Content-Type: application/json" \
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
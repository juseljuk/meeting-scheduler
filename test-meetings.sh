#!/bin/bash

# Script to create test meetings for pagination testing

API_URL="http://localhost:3000/api"

# Array of meeting data
meetings=(
  '{"title":"Q1 Planning Meeting","customer":"Acme Corp","description":"Quarterly planning session","start_datetime":"2026-03-20T00:00:00","end_datetime":"2026-03-20T23:59:59","location":"Helsinki Office","attendees":"Ricardo, Jukka","is_onsite":1,"country":"Finland"}'
  '{"title":"Product Demo","customer":"TechStart Inc","description":"Product demonstration","start_datetime":"2026-03-21T00:00:00","end_datetime":"2026-03-21T23:59:59","location":"Virtual","attendees":"Máté, Steve","is_onsite":0}'
  '{"title":"Sales Review","customer":"Global Solutions","description":"Monthly sales review","start_datetime":"2026-03-22T00:00:00","end_datetime":"2026-03-22T23:59:59","location":"Stockholm Office","attendees":"Ricardo, Jukka, Máté","is_onsite":1,"country":"Sweden"}'
  '{"title":"Training Session","customer":"Enterprise Co","description":"Team training","start_datetime":"2026-03-23T00:00:00","end_datetime":"2026-03-23T23:59:59","location":"Virtual","attendees":"Jukka, Steve","is_onsite":0}'
  '{"title":"Client Workshop","customer":"Innovation Labs","description":"Design thinking workshop","start_datetime":"2026-03-24T00:00:00","end_datetime":"2026-03-24T23:59:59","location":"London Office","attendees":"Ricardo, Máté, Steve","is_onsite":1,"country":"UK"}'
  '{"title":"Strategy Meeting","customer":"Future Tech","description":"Strategic planning","start_datetime":"2026-03-25T00:00:00","end_datetime":"2026-03-25T23:59:59","location":"Virtual","attendees":"Ricardo, Jukka, Máté, Steve","is_onsite":0}'
  '{"title":"Customer Onboarding","customer":"StartUp XYZ","description":"New customer onboarding","start_datetime":"2026-03-26T00:00:00","end_datetime":"2026-03-26T23:59:59","location":"Berlin Office","attendees":"Jukka, Máté","is_onsite":1,"country":"Germany"}'
  '{"title":"Technical Review","customer":"DevOps Pro","description":"Technical architecture review","start_datetime":"2026-03-27T00:00:00","end_datetime":"2026-03-27T23:59:59","location":"Virtual","attendees":"Steve, Ricardo","is_onsite":0}'
  '{"title":"Partnership Discussion","customer":"Alliance Partners","description":"Partnership opportunities","start_datetime":"2026-03-28T00:00:00","end_datetime":"2026-03-28T23:59:59","location":"Paris Office","attendees":"Ricardo, Jukka, Steve","is_onsite":1,"country":"France"}'
  '{"title":"Q2 Kickoff","customer":"Internal","description":"Q2 kickoff meeting","start_datetime":"2026-03-29T00:00:00","end_datetime":"2026-03-29T23:59:59","location":"Virtual","attendees":"Ricardo, Jukka, Máté, Steve","is_onsite":0}'
  '{"title":"Customer Success Review","customer":"BigCorp Ltd","description":"Quarterly success review","start_datetime":"2026-03-30T00:00:00","end_datetime":"2026-03-30T23:59:59","location":"Madrid Office","attendees":"Ricardo, Máté","is_onsite":1,"country":"Spain"}'
  '{"title":"Innovation Workshop","customer":"Creative Agency","description":"Innovation brainstorming","start_datetime":"2026-03-31T00:00:00","end_datetime":"2026-03-31T23:59:59","location":"Virtual","attendees":"Jukka, Steve, Máté","is_onsite":0}'
)

echo "Creating test meetings..."
count=0

for meeting in "${meetings[@]}"; do
  response=$(curl -s -X POST "$API_URL/meetings" \
    -H "Content-Type: application/json" \
    -d "$meeting")
  
  if [ $? -eq 0 ]; then
    ((count++))
    echo "✓ Created meeting $count"
  else
    echo "✗ Failed to create meeting"
  fi
done

echo ""
echo "Created $count test meetings successfully!"
echo "Refresh the browser to see the results."

# Made with Bob

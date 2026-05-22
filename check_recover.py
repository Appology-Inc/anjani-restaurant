import json
import re
import sys

transcript_path = '/Users/rajasekharrapaka/.gemini/antigravity/brain/f277a694-6c6e-4680-a128-f4749b70e8fd/.system_generated/logs/transcript.jsonl'

top_lines = []
bottom_lines = []

try:
    with open(transcript_path, 'r') as f:
        for line in f:
            data = json.loads(line)
            if data.get('type') == 'VIEW_FILE' and 'Showing lines 1 to 800' in data.get('content', ''):
                content = data['content']
                # Extract lines
                lines = content.split('\n')
                for l in lines:
                    match = re.match(r'^\d+: (.*)$', l)
                    if match:
                        top_lines.append(match.group(1))
            
            if data.get('type') == 'VIEW_FILE' and 'Showing lines 3190 to 3270' in data.get('content', ''):
                content = data['content']
                lines = content.split('\n')
                for l in lines:
                    match = re.match(r'^\d+: (.*)$', l)
                    if match:
                        bottom_lines.append(match.group(1))
                        
            if data.get('type') == 'VIEW_FILE' and 'Showing lines 3271 to 3300' in data.get('content', ''):
                content = data['content']
                lines = content.split('\n')
                for l in lines:
                    match = re.match(r'^\d+: (.*)$', l)
                    if match:
                        bottom_lines.append(match.group(1))

except Exception as e:
    print(f"Error reading transcript: {e}")
    sys.exit(1)

if not top_lines:
    print("Could not find top lines in transcript!")
    sys.exit(1)

# Clean up top lines: remove the <truncated> if it exists, but wait, the transcript had <truncated> in it!
# Oh no, the transcript snippet I found had "<truncated 28938 bytes>"!
# It truncated the middle of the 800 lines!
# "51: const A_PARTICLES = Array.from({ length: 90 }).map"
# "<truncated 28938 bytes>"
# "758:   };"

# Let's print how many lines we successfully captured to see if it's usable.
print(f"Captured {len(top_lines)} top lines.")
print(f"Captured {len(bottom_lines)} bottom lines.")

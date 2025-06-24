# predict.py
import sys
import json
from gradio_client import Client

sys.stdout.reconfigure(encoding='utf-8')

client = Client("Fa0713/AetherCare")

# Read vitals from stdin
vitals_input = json.loads(sys.stdin.read())

# Call the Gradio API
result = client.predict(vitals_input, api_name="/predict")

# Output the result to stdout
print(json.dumps({ "result": result }))

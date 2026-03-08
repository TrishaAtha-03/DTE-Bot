import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")
model_name = os.getenv("GEMINI_MODEL_NAME")

print(f"API Key   : {api_key[:20]}..." if api_key else "API Key   : NOT SET")
print(f"Model Name: {model_name}")
print()

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name=model_name)
    response = model.generate_content("Say hello in one word.")
    print(f"SUCCESS! AI responded: {response.text}")
except Exception as e:
    import traceback
    print(f"FAILED with error:\n{e}")
    print()
    print("Full traceback:")
    print(traceback.format_exc())

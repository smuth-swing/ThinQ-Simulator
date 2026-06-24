import urllib.request
import json
import ssl

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=REMOVED_KEY"
req = urllib.request.Request(url, method="POST")
req.add_header("Content-Type", "application/json")
data = json.dumps({"contents": [{"parts": [{"text": "Hello, this is a test."}]}]})

try:
    response = urllib.request.urlopen(req, data=data.encode("utf-8"), context=ctx)
    print("Status:", response.status)
    print("Response:", response.read().decode("utf-8")[:100], "...")
except Exception as e:
    print("Error:", e)
    if hasattr(e, 'read'):
        print("Details:", e.read().decode("utf-8"))

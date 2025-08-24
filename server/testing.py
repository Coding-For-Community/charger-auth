import requests

client_id = ""

res = requests.get(
    f"https://oauth2.sky.blackbaud.com/authorization?"
    f"response_type=code"
    f"&client_id={client_id}"
    f"&redirect_uri=https://www.google.com"
)
print(res.text)
import requests

url = "http://localhost:8000/api/auth/token"
data = {
    "username": "sjl",
    "password": "123456"
}
headers = {
    "Content-Type": "application/x-www-form-urlencoded"
}

try:
    print(f"Attempting to login to {url}...")
    response = requests.post(url, data=data, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")

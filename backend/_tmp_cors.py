import urllib.request

req = urllib.request.Request(
    "http://localhost:5000/api/conversations",
    method="GET",
    headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "content-type",
    },
)
try:
    r = urllib.request.urlopen(req, timeout=5)
    print("STATUS", r.status)
    for k, v in r.headers.items():
        if k.lower().startswith("access-control"):
            print(f"  {k}: {v}")
except Exception as e:
    print("ERR", e)
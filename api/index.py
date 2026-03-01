import os
import json
import urllib.request
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.handle_request("GET")

    def do_POST(self):
        self.handle_request("POST")

    def handle_request(self, method):
        supabase_url = os.environ.get("SUPABASE_URL").strip()
        supabase_key = os.environ.get("SUPABASE_KEY").strip()

        # 読み込み(GET)の処理
        if method == "GET":
            request_url = f"{supabase_url}/rest/v1/memories?select=*"
            req = urllib.request.Request(request_url)
        
        # 書き込み(POST)の処理
        else:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            request_url = f"{supabase_url}/rest/v1/memories"
            req = urllib.request.Request(request_url, data=post_data, method="POST")
            req.add_header("Content-Type", "application/json")
            req.add_header("Prefer", "return=representation")

        req.add_header("apikey", supabase_key)
        req.add_header("Authorization", f"Bearer {supabase_key}")

        try:
            with urllib.request.urlopen(req) as response:
                res_data = response.read()
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(res_data)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode())
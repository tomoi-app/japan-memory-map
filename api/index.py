import os
import json
import urllib.request
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_KEY")

        # 1. そもそも鍵がVercelに設定されているかチェック
        if not supabase_url or not supabase_key:
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps([{"prefecture":"エラー","title":"Vercelに鍵が設定されていません","date":"0000-00-00","lat":35,"lng":135}]).encode())
            return

        # 2. Supabaseにデータを取りに行く
        request_url = f"{supabase_url}/rest/v1/memories?select=*"
        req = urllib.request.Request(request_url)
        req.add_header("apikey", supabase_key)
        req.add_header("Authorization", f"Bearer {supabase_key}")

        try:
            with urllib.request.urlopen(req) as response:
                data = response.read()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
            
        except Exception as e:
            # 3. 失敗したらエラー内容を画面に出す
            self.send_response(200)
            self.end_headers()
            self.wfile.write(json.dumps([{"prefecture":"接続エラー","title":str(e),"date":"0000-00-00","lat":35,"lng":135}]).encode())
import os
import json
import urllib.request
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Vercelの金庫（環境変数）から鍵とURLを取り出す
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_KEY")

        # 鍵が設定されていない場合のエラー回避
        if not supabase_url or not supabase_key:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b'{"error": "Database keys are not set"}')
            return

        # Supabaseの「memories」テーブルにデータをお願いするURL
        request_url = f"{supabase_url}/rest/v1/memories?select=*"
        
        # 鍵を持たせてリクエストを作成
        req = urllib.request.Request(request_url)
        req.add_header("apikey", supabase_key)
        req.add_header("Authorization", f"Bearer {supabase_key}")

        try:
            # Supabaseからデータを受け取る
            with urllib.request.urlopen(req) as response:
                data = response.read()
                
            # アプリ（画面）にそのままデータを横流しする
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            # 誰でもアクセスできるようにする（CORS対応）
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
            
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
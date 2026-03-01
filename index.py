import os
import json
import urllib.request
import base64
import uuid
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.handle_request("GET")

    def do_POST(self):
        self.handle_request("POST")

    def handle_request(self, method):
        supabase_url = os.environ.get("SUPABASE_URL").strip()
        supabase_key = os.environ.get("SUPABASE_KEY").strip()

        if method == "GET":
            # 読み込みの処理
            request_url = f"{supabase_url}/rest/v1/memories?select=*"
            req = urllib.request.Request(request_url)
            req.add_header("apikey", supabase_key)
            req.add_header("Authorization", f"Bearer {supabase_key}")
            
        else:
            # 書き込みの処理
            content_length = int(self.headers['Content-Length'])
            post_data_raw = self.rfile.read(content_length)
            payload = json.loads(post_data_raw)
            
            photo_urls = []
            
            # 1. 写真データがあれば、Supabaseの「photos」バケットに保存する
            if "photos" in payload:
                photos_base64 = payload.pop("photos") # DB本体のデータからは一旦外す
                for b64 in photos_base64:
                    try:
                        # 画像データを変換
                        header, encoded = b64.split(",", 1)
                        file_data = base64.b64decode(encoded)
                        
                        # ランダムなファイル名（UUID）を作成してアップロード
                        filename = f"{uuid.uuid4()}.jpg"
                        upload_url = f"{supabase_url}/storage/v1/object/photos/{filename}"
                        
                        upload_req = urllib.request.Request(upload_url, data=file_data, method="POST")
                        upload_req.add_header("apikey", supabase_key)
                        upload_req.add_header("Authorization", f"Bearer {supabase_key}")
                        upload_req.add_header("Content-Type", "image/jpeg")
                        
                        with urllib.request.urlopen(upload_req) as res:
                            # 成功したら公開URLを作ってリストに追加
                            public_url = f"{supabase_url}/storage/v1/object/public/photos/{filename}"
                            photo_urls.append(public_url)
                    except Exception as e:
                        print("写真のアップロードに失敗しました:", e)

            # 2. 取得した写真のURLリストを、文字列としてデータベースに保存する
            payload["photo_urls"] = json.dumps(photo_urls)
            
            request_url = f"{supabase_url}/rest/v1/memories"
            req = urllib.request.Request(request_url, data=json.dumps(payload).encode("utf-8"), method="POST")
            req.add_header("apikey", supabase_key)
            req.add_header("Authorization", f"Bearer {supabase_key}")
            req.add_header("Content-Type", "application/json")
            req.add_header("Prefer", "return=representation")

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
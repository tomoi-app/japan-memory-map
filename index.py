import os
import json
import urllib.request
import urllib.parse
import base64
import uuid
import traceback
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey')
        self.end_headers()

    def do_GET(self):
        self.execute_request("GET")

    def do_POST(self):
        self.execute_request("POST")

    def execute_request(self, method):
        # どんなエラーが起きても絶対にクラッシュさせない最強の防護壁
        try:
            self.process(method)
        except Exception as e:
            error_details = traceback.format_exc()
            try:
                self.send_response(500)
                self.send_header('Content-type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                error_json = json.dumps({"error": str(e), "trace": error_details})
                self.wfile.write(error_json.encode('utf-8'))
            except:
                pass

    def process(self, method):
        supabase_url = os.environ.get("SUPABASE_URL", "").strip().rstrip('/')
        supabase_key = os.environ.get("SUPABASE_KEY", "").strip()

        if not supabase_url or not supabase_key:
            raise Exception("VercelにSupabaseのURLとKeyが設定されていません。")

        if method == "GET":
            req = urllib.request.Request(f"{supabase_url}/rest/v1/memories?select=*")
            req.add_header("apikey", supabase_key)
            req.add_header("Authorization", f"Bearer {supabase_key}")
            with urllib.request.urlopen(req) as response:
                self.send_success(response.read())
            return

        # POST処理
        cl_str = self.headers.get('Content-Length')
        content_length = int(cl_str) if cl_str else 0
        if content_length == 0:
            raise Exception("データが空です。")

        body = self.rfile.read(content_length)
        payload = json.loads(body)
        action = payload.get("action")

        if action == "save_memory":
            pref = payload.get("prefecture")
            date_str = payload.get("date", "")
            photos_b64 = payload.get("photos", [])
            
            safe_pref = urllib.parse.quote(pref)
            url = f"{supabase_url}/rest/v1/memories?prefecture=eq.{safe_pref}&select=*"
            req = urllib.request.Request(url)
            req.add_header("apikey", supabase_key)
            req.add_header("Authorization", f"Bearer {supabase_key}")
            
            with urllib.request.urlopen(req) as res:
                existing = json.loads(res.read())
            
            photo_urls = []
            row_id = None
            if len(existing) > 0:
                row_id = existing[0]["id"]
                if existing[0].get("photo_urls"):
                    try:
                        photo_urls = json.loads(existing[0]["photo_urls"])
                    except:
                        pass
            
            for b64 in photos_b64:
                if "," in b64:
                    _, encoded = b64.split(",", 1)
                else:
                    encoded = b64
                
                file_data = base64.b64decode(encoded)
                filename = f"{uuid.uuid4().hex}.jpg"
                upload_url = f"{supabase_url}/storage/v1/object/photos/{filename}"
                
                up_req = urllib.request.Request(upload_url, data=file_data, method="POST")
                up_req.add_header("apikey", supabase_key)
                up_req.add_header("Authorization", f"Bearer {supabase_key}")
                up_req.add_header("Content-Type", "image/jpeg")
                
                with urllib.request.urlopen(up_req):
                    photo_urls.append(f"{supabase_url}/storage/v1/object/public/photos/{filename}")
            
            db_payload = {
                "prefecture": pref,
                "date": date_str,
                "photo_urls": json.dumps(photo_urls),
                "title": "Memory",
                "lat": 0.0,
                "lng": 0.0
            }
            
            if row_id:
                patch_url = f"{supabase_url}/rest/v1/memories?id=eq.{row_id}"
                db_req = urllib.request.Request(patch_url, data=json.dumps(db_payload).encode('utf-8'), method="PATCH")
            else:
                post_url = f"{supabase_url}/rest/v1/memories"
                db_req = urllib.request.Request(post_url, data=json.dumps(db_payload).encode('utf-8'), method="POST")

            db_req.add_header("apikey", supabase_key)
            db_req.add_header("Authorization", f"Bearer {supabase_key}")
            db_req.add_header("Content-Type", "application/json")
            db_req.add_header("Prefer", "return=representation")
            
            with urllib.request.urlopen(db_req) as response:
                self.send_success(response.read())

        elif action == "delete_photo":
            pref = payload.get("prefecture")
            url_to_delete = payload.get("photo_url")
            filename = url_to_delete.split('/')[-1]
            
            safe_pref = urllib.parse.quote(pref)
            url = f"{supabase_url}/rest/v1/memories?prefecture=eq.{safe_pref}&select=*"
            req = urllib.request.Request(url)
            req.add_header("apikey", supabase_key)
            req.add_header("Authorization", f"Bearer {supabase_key}")
            
            with urllib.request.urlopen(req) as res:
                existing = json.loads(res.read())
            
            if len(existing) > 0:
                row_id = existing[0]["id"]
                photo_urls = json.loads(existing[0].get("photo_urls", "[]"))
                if url_to_delete in photo_urls:
                    photo_urls.remove(url_to_delete)
                
                del_url = f"{supabase_url}/storage/v1/object/photos/{filename}"
                del_req = urllib.request.Request(del_url, method="DELETE")
                del_req.add_header("apikey", supabase_key)
                del_req.add_header("Authorization", f"Bearer {supabase_key}")
                try:
                    with urllib.request.urlopen(del_req): pass
                except:
                    pass
                
                db_payload = {"photo_urls": json.dumps(photo_urls)}
                patch_url = f"{supabase_url}/rest/v1/memories?id=eq.{row_id}"
                db_req = urllib.request.Request(patch_url, data=json.dumps(db_payload).encode('utf-8'), method="PATCH")
                db_req.add_header("apikey", supabase_key)
                db_req.add_header("Authorization", f"Bearer {supabase_key}")
                db_req.add_header("Content-Type", "application/json")
                
                with urllib.request.urlopen(db_req) as response:
                    self.send_success(response.read())
            else:
                raise Exception("削除対象が見つかりません。")
        else:
            raise Exception(f"不明なアクションです: {action}")

    def send_success(self, data):
        self.send_response(200)
        self.send_header('Content-type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(data)
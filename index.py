import os
import json
import urllib.request
import urllib.error
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
        self.process_api("GET")

    def do_POST(self):
        self.process_api("POST")

    # システムの予約語と被らない名前に変更
    def process_api(self, method):
        try:
            supabase_url = os.environ.get("SUPABASE_URL", "").strip().rstrip('/')
            supabase_key = os.environ.get("SUPABASE_KEY", "").strip()

            if not supabase_url or not supabase_key:
                self.send_error_json(500, "VercelにSupabaseのURLとKeyが設定されていません。")
                return

            if method == "GET":
                req = urllib.request.Request(f"{supabase_url}/rest/v1/memories?select=*")
                req.add_header("apikey", supabase_key)
                req.add_header("Authorization", f"Bearer {supabase_key}")
                with urllib.request.urlopen(req, timeout=10) as response:
                    self.send_success_json(response.read())
                return

            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error_json(400, "データが空です。")
                return
                
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
                
                with urllib.request.urlopen(req, timeout=10) as res:
                    existing = json.loads(res.read())
                
                photo_urls = []
                row_id = None
                if len(existing) > 0:
                    row_id = existing[0]["id"]
                    if existing[0].get("photo_urls"):
                        try:
                            photo_urls = json.loads(existing[0]["photo_urls"])
                        except Exception:
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
                    
                    with urllib.request.urlopen(up_req, timeout=10):
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
                
                with urllib.request.urlopen(db_req, timeout=10) as response:
                    self.send_success_json(response.read())

            elif action == "delete_photo":
                pref = payload.get("prefecture")
                url_to_delete = payload.get("photo_url")
                filename = url_to_delete.split('/')[-1]
                
                safe_pref = urllib.parse.quote(pref)
                url = f"{supabase_url}/rest/v1/memories?prefecture=eq.{safe_pref}&select=*"
                req = urllib.request.Request(url)
                req.add_header("apikey", supabase_key)
                req.add_header("Authorization", f"Bearer {supabase_key}")
                
                with urllib.request.urlopen(req, timeout=10) as res:
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
                        with urllib.request.urlopen(del_req, timeout=10): pass
                    except Exception:
                        pass
                    
                    db_payload = {"photo_urls": json.dumps(photo_urls)}
                    patch_url = f"{supabase_url}/rest/v1/memories?id=eq.{row_id}"
                    db_req = urllib.request.Request(patch_url, data=json.dumps(db_payload).encode('utf-8'), method="PATCH")
                    db_req.add_header("apikey", supabase_key)
                    db_req.add_header("Authorization", f"Bearer {supabase_key}")
                    db_req.add_header("Content-Type", "application/json")
                    
                    with urllib.request.urlopen(db_req, timeout=10) as response:
                        self.send_success_json(response.read())
                else:
                    self.send_error_json(400, "削除対象のデータが見つかりません。")
            else:
                self.send_error_json(400, "不正なアクションです。")

        except urllib.error.HTTPError as he:
            err_msg = f"DBエラー({he.code}): {he.read().decode('utf-8', errors='ignore')}"
            self.send_error_json(500, err_msg)
        except Exception as e:
            self.send_error_json(500, f"Python内部エラー: {str(e)}\n{traceback.format_exc()}")

    def send_success_json(self, data):
        try:
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
        except Exception:
            pass

    def send_error_json(self, status_code, err_msg):
        try:
            self.send_response(status_code)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": err_msg}).encode('utf-8'))
        except Exception:
            pass
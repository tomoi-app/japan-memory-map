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
        self.handle_request("GET")

    def do_POST(self):
        self.handle_request("POST")

    def handle_request(self, method):
        try:
            supabase_url = os.environ.get("SUPABASE_URL", "").strip().rstrip('/')
            supabase_key = os.environ.get("SUPABASE_KEY", "").strip()

            if not supabase_url or not supabase_key:
                self.send_error_json(500, "VercelにSupabaseのURLとKeyが設定されていません。")
                return

            if method == "GET":
                request_url = f"{supabase_url}/rest/v1/memories?select=*"
                req = urllib.request.Request(request_url)
                req.add_header("apikey", supabase_key)
                req.add_header("Authorization", f"Bearer {supabase_key}")
                with urllib.request.urlopen(req) as response:
                    res_data = response.read()
                
                self.send_success_json(res_data)
                return

            content_length = int(self.headers.get('Content-Length', 0))
            if content_length == 0:
                self.send_error_json(400, "データが空です。")
                return
                
            post_data_raw = self.rfile.read(content_length)
            payload = json.loads(post_data_raw)
            action = payload.get("action")

            if action == "save_memory":
                pref = payload.get("prefecture")
                date_str = payload.get("date", "")
                new_photos_b64 = payload.get("photos", [])
                
                safe_pref = urllib.parse.quote(pref)
                check_req = urllib.request.Request(f"{supabase_url}/rest/v1/memories?prefecture=eq.{safe_pref}&select=*")
                check_req.add_header("apikey", supabase_key)
                check_req.add_header("Authorization", f"Bearer {supabase_key}")
                
                with urllib.request.urlopen(check_req) as res: 
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
                
                for b64 in new_photos_b64:
                    if "," in b64:
                        header, encoded = b64.split(",", 1)
                    else:
                        encoded = b64
                    
                    file_data = base64.b64decode(encoded)
                    filename = f"{uuid.uuid4()}.jpg"
                    upload_url = f"{supabase_url}/storage/v1/object/photos/{filename}"
                    
                    upload_req = urllib.request.Request(upload_url, data=file_data, method="POST")
                    upload_req.add_header("apikey", supabase_key)
                    upload_req.add_header("Authorization", f"Bearer {supabase_key}")
                    upload_req.add_header("Content-Type", "image/jpeg")
                    
                    with urllib.request.urlopen(upload_req) as res:
                        public_url = f"{supabase_url}/storage/v1/object/public/photos/{filename}"
                        photo_urls.append(public_url)
                
                db_payload = {
                    "prefecture": pref, 
                    "date": date_str, 
                    "photo_urls": json.dumps(photo_urls), 
                    "title": "Memory",
                    "lat": 0.0,
                    "lng": 0.0
                }
                
                if row_id:
                    req = urllib.request.Request(f"{supabase_url}/rest/v1/memories?id=eq.{row_id}", data=json.dumps(db_payload).encode('utf-8'), method="PATCH")
                else:
                    req = urllib.request.Request(f"{supabase_url}/rest/v1/memories", data=json.dumps(db_payload).encode('utf-8'), method="POST")

                req.add_header("apikey", supabase_key)
                req.add_header("Authorization", f"Bearer {supabase_key}")
                req.add_header("Content-Type", "application/json")
                req.add_header("Prefer", "return=representation")
                
                with urllib.request.urlopen(req) as response: 
                    res_data = response.read()
                    
                self.send_success_json(res_data)

            elif action == "delete_photo":
                pref = payload.get("prefecture")
                url_to_delete = payload.get("photo_url")
                filename = url_to_delete.split('/')[-1]
                
                safe_pref = urllib.parse.quote(pref)
                check_req = urllib.request.Request(f"{supabase_url}/rest/v1/memories?prefecture=eq.{safe_pref}&select=*")
                check_req.add_header("apikey", supabase_key)
                check_req.add_header("Authorization", f"Bearer {supabase_key}")
                
                with urllib.request.urlopen(check_req) as res: 
                    existing = json.loads(res.read())
                
                if len(existing) > 0:
                    row_id = existing[0]["id"]
                    photo_urls = json.loads(existing[0].get("photo_urls", "[]"))
                    if url_to_delete in photo_urls:
                        photo_urls.remove(url_to_delete)
                    
                    delete_url = f"{supabase_url}/storage/v1/object/photos/{filename}"
                    delete_req = urllib.request.Request(delete_url, method="DELETE")
                    delete_req.add_header("apikey", supabase_key)
                    delete_req.add_header("Authorization", f"Bearer {supabase_key}")
                    try:
                        with urllib.request.urlopen(delete_req) as res: pass
                    except Exception:
                        pass
                    
                    db_payload = {"photo_urls": json.dumps(photo_urls)}
                    req = urllib.request.Request(f"{supabase_url}/rest/v1/memories?id=eq.{row_id}", data=json.dumps(db_payload).encode('utf-8'), method="PATCH")
                    req.add_header("apikey", supabase_key)
                    req.add_header("Authorization", f"Bearer {supabase_key}")
                    req.add_header("Content-Type", "application/json")
                    req.add_header("Prefer", "return=representation")
                    
                    with urllib.request.urlopen(req) as response: 
                        res_data = response.read()
                    self.send_success_json(res_data)
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
import os
import json
import urllib.request
import base64
import uuid
import urllib.parse
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.handle_request("GET")

    def do_POST(self):
        self.handle_request("POST")

    def handle_request(self, method):
        supabase_url = os.environ.get("SUPABASE_URL", "").strip()
        supabase_key = os.environ.get("SUPABASE_KEY", "").strip()

        if method == "GET":
            request_url = f"{supabase_url}/rest/v1/memories?select=*"
            req = urllib.request.Request(request_url)
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
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return

        # POST処理
        content_length = int(self.headers['Content-Length'])
        post_data_raw = self.rfile.read(content_length)
        payload = json.loads(post_data_raw)
        action = payload.get("action")

        try:
            if action == "save_memory":
                pref = payload.get("prefecture")
                date_str = payload.get("date", "")
                new_photos_b64 = payload.get("photos", [])
                
                check_req = urllib.request.Request(f"{supabase_url}/rest/v1/memories?prefecture=eq.{urllib.parse.quote(pref)}&select=*")
                check_req.add_header("apikey", supabase_key)
                check_req.add_header("Authorization", f"Bearer {supabase_key}")
                
                with urllib.request.urlopen(check_req) as res: existing = json.loads(res.read())
                
                photo_urls = []
                row_id = None
                if len(existing) > 0:
                    row_id = existing[0]["id"]
                    try: if(existing[0].get("photo_urls")): photo_urls = json.loads(existing[0]["photo_urls"])
                    except: pass
                
                # 写真アップロード処理
                for b64 in new_photos_b64:
                    header, encoded = b64.split(",", 1)
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
                
                db_payload = {"prefecture": pref, "date": date_str, "photo_urls": json.dumps(photo_urls), "title": "Memory"}
                if row_id:
                    req = urllib.request.Request(f"{supabase_url}/rest/v1/memories?id=eq.{row_id}", data=json.dumps(db_payload).encode(), method="PATCH")
                else:
                    req = urllib.request.Request(f"{supabase_url}/rest/v1/memories", data=json.dumps(db_payload).encode(), method="POST")

            elif action == "delete_photo":
                pref = payload.get("prefecture")
                url_to_delete = payload.get("photo_url")
                filename = url_to_delete.split('/')[-1]
                
                check_req = urllib.request.Request(f"{supabase_url}/rest/v1/memories?prefecture=eq.{urllib.parse.quote(pref)}&select=*")
                check_req.add_header("apikey", supabase_key)
                check_req.add_header("Authorization", f"Bearer {supabase_key}")
                
                with urllib.request.urlopen(check_req) as res: existing = json.loads(res.read())
                
                if len(existing) > 0:
                    row_id = existing[0]["id"]
                    photo_urls = json.loads(existing[0].get("photo_urls", "[]"))
                    if url_to_delete in photo_urls:
                        photo_urls.remove(url_to_delete)
                    
                    # Storageから削除
                    delete_url = f"{supabase_url}/storage/v1/object/photos/{filename}"
                    delete_req = urllib.request.Request(delete_url, method="DELETE")
                    delete_req.add_header("apikey", supabase_key)
                    delete_req.add_header("Authorization", f"Bearer {supabase_key}")
                    with urllib.request.urlopen(delete_req) as res: pass
                    
                    # DB更新
                    db_payload = {"photo_urls": json.dumps(photo_urls)}
                    req = urllib.request.Request(f"{supabase_url}/rest/v1/memories?id=eq.{row_id}", data=json.dumps(db_payload).encode(), method="PATCH")
                else: raise Exception("Data not found")
            else: raise Exception("Invalid action")

            req.add_header("apikey", supabase_key)
            req.add_header("Authorization", f"Bearer {supabase_key}")
            req.add_header("Content-Type", "application/json")
            req.add_header("Prefer", "return=representation")
            
            with urllib.request.urlopen(req) as response: res_data = response.read()
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(res_data)

        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
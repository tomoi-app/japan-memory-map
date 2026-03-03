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
        self.execute_safe("GET")

    def do_POST(self):
        self.execute_safe("POST")

    def execute_safe(self, method):
        try:
            self.process_api(method)
        except Exception as e:
            err_trace = traceback.format_exc()
            try:
                self.send_response(500)
                self.send_header('Content-type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": f"Python Error: {str(e)}", "trace": err_trace}).encode('utf-8'))
            except:
                pass

    def process_api(self, method):
        supabase_url = os.environ.get("SUPABASE_URL", "").strip().rstrip('/')
        supabase_key = os.environ.get("SUPABASE_KEY", "").strip()

        if not supabase_url or not supabase_key:
            raise Exception("SUPABASE_URL or SUPABASE_KEY is missing in Vercel.")

        if method == "GET":
            req = urllib.request.Request(f"{supabase_url}/rest/v1/memories?select=*")
            req.add_header("apikey", supabase_key)
            req.add_header("Authorization", f"Bearer {supabase_key}")
            with urllib.request.urlopen(req, timeout=10) as response:
                data = response.read()
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)
            return

        cl = self.headers.get('Content-Length')
        content_length = int(cl) if cl else 0
        if content_length == 0:
            raise Exception("Request body is empty.")

        body = self.rfile.read(content_length)
        payload = json.loads(body)
        action = payload.get("action", "")

        if action == "save_memory":
            pref = payload.get("prefecture", "")
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
                try:
                    if existing[0].get("photo_urls"):
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
                db_req = urllib.request.Request(
                    f"{supabase_url}/rest/v1/memories?id=eq.{row_id}",
                    data=json.dumps(db_payload).encode('utf-8'),
                    method="PATCH"
                )
            else:
                db_req = urllib.request.Request(
                    f"{supabase_url}/rest/v1/memories",
                    data=json.dumps(db_payload).encode('utf-8'),
                    method="POST"
                )

            db_req.add_header("apikey", supabase_key)
            db_req.add_header("Authorization", f"Bearer {supabase_key}")
            db_req.add_header("Content-Type", "application/json")
            db_req.add_header("Prefer", "return=representation")

            with urllib.request.urlopen(db_req, timeout=10) as response:
                data = response.read()

            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)

        elif action == "delete_photo":
            pref = payload.get("prefecture", "")
            url_to_delete = payload.get("photo_url", "")
            filename = url_to_delete.split('/')[-1]

            safe_pref = urllib.parse.quote(pref)
            url = f"{supabase_url}/rest/v1/memories?prefecture=eq.{safe_pref}&select=*"
            req = urllib.request.Request(url)
            req.add_header("apikey", supabase_key)
            req.add_header("Authorization", f"Bearer {supabase_key}")

            with urllib.request.urlopen(req, timeout=10) as res:
                existing = json.loads(res.read())

            if len(existing) == 0:
                raise Exception("削除対象が見つかりません。")

            row_id = existing[0]["id"]
            photo_urls = []
            try:
                photo_urls = json.loads(existing[0].get("photo_urls", "[]"))
            except:
                pass

            if url_to_delete in photo_urls:
                photo_urls.remove(url_to_delete)

            # Storageから削除
            del_url = f"{supabase_url}/storage/v1/object/photos/{filename}"
            del_req = urllib.request.Request(del_url, method="DELETE")
            del_req.add_header("apikey", supabase_key)
            del_req.add_header("Authorization", f"Bearer {supabase_key}")
            try:
                with urllib.request.urlopen(del_req, timeout=10):
                    pass
            except:
                pass

            # DBのphoto_urlsを更新
            db_payload = {"photo_urls": json.dumps(photo_urls)}
            db_req = urllib.request.Request(
                f"{supabase_url}/rest/v1/memories?id=eq.{row_id}",
                data=json.dumps(db_payload).encode('utf-8'),
                method="PATCH"
            )
            db_req.add_header("apikey", supabase_key)
            db_req.add_header("Authorization", f"Bearer {supabase_key}")
            db_req.add_header("Content-Type", "application/json")
            db_req.add_header("Prefer", "return=representation")

            with urllib.request.urlopen(db_req, timeout=10) as response:
                data = response.read()

            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(data)

        else:
            raise Exception(f"不明なアクションです: {action}")
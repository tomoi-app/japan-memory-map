import os
import json
import urllib.request
import urllib.parse
import base64
import uuid
import traceback
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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
        resend_key   = os.environ.get("RESEND_API_KEY", "").strip()

        if not supabase_url or not supabase_key:
            raise Exception("SUPABASE_URL or SUPABASE_KEY is missing in Vercel.")

        # ── トークン検証 ──────────────────────────────
        auth_header = self.headers.get("Authorization", "")
        user_token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else ""

        if not user_token:
            self.send_response(401)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Unauthorized"}).encode('utf-8'))
            return

        # Supabaseでトークンを検証してuser_idを取得
        verify_req = urllib.request.Request(f"{supabase_url}/auth/v1/user")
        verify_req.add_header("apikey", supabase_key)
        verify_req.add_header("Authorization", f"Bearer {user_token}")
        try:
            with urllib.request.urlopen(verify_req, timeout=10) as vres:
                user_data = json.loads(vres.read())
            current_user_id = user_data.get("id", "")
            if not current_user_id:
                raise Exception("user id empty")
        except Exception as token_err:
            self.send_response(401)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": f"Invalid token: {str(token_err)}"}).encode('utf-8'))
            return
        # ─────────────────────────────────────────────

        if method == "GET":
            req = urllib.request.Request(f"{supabase_url}/rest/v1/memories?user_id=eq.{current_user_id}&select=*")
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
            # フロントエンドから直接Supabaseにアップロード済みのURL一覧を受け取るだけ
            final_photo_urls = payload.get("existing_urls", [])

            safe_pref = urllib.parse.quote(pref)
            url = f"{supabase_url}/rest/v1/memories?prefecture=eq.{safe_pref}&user_id=eq.{current_user_id}&select=*"
            req = urllib.request.Request(url)
            req.add_header("apikey", supabase_key)
            req.add_header("Authorization", f"Bearer {supabase_key}")

            with urllib.request.urlopen(req, timeout=10) as res:
                existing = json.loads(res.read())

            row_id = None
            if len(existing) > 0:
                row_id = existing[0]["id"]
                # --- ゴーストデータ（重複）が見つかったら、裏でこっそり削除する ---
                if len(existing) > 1:
                    for duplicate in existing[1:]:
                        dup_id = duplicate["id"]
                        del_req = urllib.request.Request(f"{supabase_url}/rest/v1/memories?id=eq.{dup_id}", method="DELETE")
                        del_req.add_header("apikey", supabase_key)
                        del_req.add_header("Authorization", f"Bearer {supabase_key}")
                        try:
                            urllib.request.urlopen(del_req, timeout=10)
                        except:
                            pass

            db_payload = {
                "prefecture": pref,
                "date": date_str,
                "photo_urls": json.dumps(final_photo_urls),
                "title": "Memory",
                "lat": 0.0,
                "lng": 0.0,
                "user_id": current_user_id,
                "is_home": False
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

        elif action == "save_home":
            home_prefs = payload.get("home_prefectures", [])

            # 現在のis_home=trueを全部falseにリセット
            reset_req = urllib.request.Request(
                f"{supabase_url}/rest/v1/memories?user_id=eq.{current_user_id}&is_home=eq.true",
                data=json.dumps({"is_home": False}).encode('utf-8'),
                method="PATCH"
            )
            reset_req.add_header("apikey", supabase_key)
            reset_req.add_header("Authorization", f"Bearer {supabase_key}")
            reset_req.add_header("Content-Type", "application/json")
            reset_req.add_header("Prefer", "return=minimal")
            try:
                urllib.request.urlopen(reset_req, timeout=10)
            except:
                pass

            # 各home都道府県をupsert
            for pref in home_prefs:
                safe_pref = urllib.parse.quote(pref)
                chk_url = f"{supabase_url}/rest/v1/memories?prefecture=eq.{safe_pref}&user_id=eq.{current_user_id}&select=id"
                chk_req = urllib.request.Request(chk_url)
                chk_req.add_header("apikey", supabase_key)
                chk_req.add_header("Authorization", f"Bearer {supabase_key}")
                with urllib.request.urlopen(chk_req, timeout=10) as r:
                    rows = json.loads(r.read())

                if rows:
                    row_id = rows[0]["id"]
                    up_req = urllib.request.Request(
                        f"{supabase_url}/rest/v1/memories?id=eq.{row_id}",
                        data=json.dumps({"is_home": True}).encode('utf-8'),
                        method="PATCH"
                    )
                else:
                    up_req = urllib.request.Request(
                        f"{supabase_url}/rest/v1/memories",
                        data=json.dumps({
                            "prefecture": pref,
                            "date": "",
                            "photo_urls": "[]",
                            "title": "Memory",
                            "lat": 0.0,
                            "lng": 0.0,
                            "user_id": current_user_id,
                            "is_home": True
                        }).encode('utf-8'),
                        method="POST"
                    )

                up_req.add_header("apikey", supabase_key)
                up_req.add_header("Authorization", f"Bearer {supabase_key}")
                up_req.add_header("Content-Type", "application/json")
                up_req.add_header("Prefer", "return=minimal")
                try:
                    urllib.request.urlopen(up_req, timeout=10)
                except:
                    pass

            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode('utf-8'))

        elif action == "delete_photo":
            pref = payload.get("prefecture", "")
            url_to_delete = payload.get("photo_url", "")
            filename = url_to_delete.split('/')[-1]

            safe_pref = urllib.parse.quote(pref)
            url = f"{supabase_url}/rest/v1/memories?prefecture=eq.{safe_pref}&user_id=eq.{current_user_id}&select=*"
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

            del_url = f"{supabase_url}/storage/v1/object/photos/{filename}"
            del_req = urllib.request.Request(del_url, method="DELETE")
            del_req.add_header("apikey", supabase_key)
            del_req.add_header("Authorization", f"Bearer {supabase_key}")
            try:
                with urllib.request.urlopen(del_req, timeout=10):
                    pass
            except:
                pass

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

        # --- 新規追加：すべてのデータを一撃で完全に削除する命令 ---
        elif action == "delete_all":
            req = urllib.request.Request(f"{supabase_url}/rest/v1/memories?select=id")
            req.add_header("apikey", supabase_key)
            req.add_header("Authorization", f"Bearer {supabase_key}")
            with urllib.request.urlopen(req, timeout=10) as res:
                all_records = json.loads(res.read())
            
            for record in all_records:
                r_id = record["id"]
                d_req = urllib.request.Request(f"{supabase_url}/rest/v1/memories?id=eq.{r_id}", method="DELETE")
                d_req.add_header("apikey", supabase_key)
                d_req.add_header("Authorization", f"Bearer {supabase_key}")
                try:
                    urllib.request.urlopen(d_req, timeout=10)
                except:
                    pass
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
            return

        elif action == "send_contact":
            gmail_user = os.environ.get("GMAIL_USER", "").strip()
            gmail_pass = os.environ.get("GMAIL_PASS", "").strip()
            if not gmail_user or not gmail_pass:
                raise Exception("GMAIL_USER or GMAIL_PASS is not set in Vercel environment variables.")

            name        = payload.get("name", "（名前未記入）")
            body        = payload.get("body", "")
            want_reply  = payload.get("want_reply", False)
            reply_email = payload.get("reply_email", "")
            user_email  = "不明"

            # ユーザーのメールアドレスを取得
            try:
                u_req = urllib.request.Request(f"{supabase_url}/auth/v1/user")
                u_req.add_header("apikey", supabase_key)
                u_req.add_header("Authorization", f"Bearer {user_token}")
                with urllib.request.urlopen(u_req, timeout=10) as r:
                    u_data = json.loads(r.read())
                user_email = u_data.get("email", "不明")
            except:
                pass

            def send_gmail(to_addr, subject, html_body):
                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"]    = gmail_user
                msg["To"]      = to_addr
                msg.attach(MIMEText(html_body, "html", "utf-8"))
                with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
                    server.login(gmail_user, gmail_pass)
                    server.sendmail(gmail_user, to_addr, msg.as_string())

            # ① 管理者への通知メール
            reply_label = ("はい（" + reply_email + "）") if want_reply else "いいえ"
            admin_html = (
                "<h2>あしあと お問い合わせ</h2>"
                f"<p><b>名前：</b>{name}</p>"
                f"<p><b>アカウント：</b>{user_email}</p>"
                f"<p><b>返信希望：</b>{reply_label}</p>"
                "<hr>"
                "<p><b>内容：</b></p>"
                f"<p style='white-space:pre-wrap;'>{body}</p>"
            )
            send_gmail(gmail_user, f"【あしあと】お問い合わせ：{name}", admin_html)

            # ② 返信希望の場合、ユーザーへ自動返信
            if want_reply and reply_email:
                auto_html = (
                    "<p>この度は【あしあと】をご利用いただき、誠にありがとうございます。</p>"
                    "<p>お問い合わせを受け付けました。<br>返信まで少々お待ちください。</p>"
                    "<br><p style='color:#888; font-size:0.9em;'>※このメールは自動送信されています。</p>"
                )
                try:
                    send_gmail(reply_email, "【あしあと】お問い合わせありがとうございます", auto_html)
                except:
                    pass

            self.send_response(200)
            self.send_header('Content-type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode('utf-8'))

        else:
            raise Exception(f"不明なアクションです: {action}")
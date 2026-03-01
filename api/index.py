from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json; charset=utf-8')
        self.end_headers()

        # 緯度(lat)と経度(lng)を追加
        memories = [
            {"prefecture": "愛媛", "title": "瀬戸内の海", "date": "2025-10-17", "lat": 33.8392, "lng": 132.7653},
            {"prefecture": "群馬", "title": "温泉旅行", "date": "2026-03-24", "lat": 36.3895, "lng": 139.0634}
        ]

        self.wfile.write(json.dumps(memories, ensure_ascii=False).encode('utf-8'))
        return
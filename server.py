#!/usr/bin/env python3
"""
server.py — Servidor local para Robo Survivor
Execute: python3 server.py
Acesse:  http://localhost:8080
"""

import http.server
import socketserver
import os
import sys
import webbrowser
import threading

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

# Serve from the directory where this script lives
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    """Serve files with correct MIME types and CORS headers."""

    MIME = {
        ".html": "text/html; charset=utf-8",
        ".css":  "text/css; charset=utf-8",
        ".js":   "application/javascript; charset=utf-8",
        ".png":  "image/png",
        ".jpg":  "image/jpeg",
        ".svg":  "image/svg+xml",
        ".ico":  "image/x-icon",
        ".json": "application/json",
    }

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        return self.MIME.get(ext, super().guess_type(path))

    def log_message(self, fmt, *args):
        # Suppress favicon 404 noise
        # args[0] pode ser str (requisição) ou HTTPStatus (erro) — converter sempre
        if "favicon" in str(args[0]):
            return
        print(f"  {self.address_string()}  {fmt % args}")


def main():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.allow_reuse_address = True
        url = f"http://localhost:{PORT}"

        print("=" * 50)
        print("  🤖  ROBO SURVIVOR — Servidor Local")
        print("=" * 50)
        print(f"  URL : {url}")
        print(f"  Dir : {os.getcwd()}")
        print("  Pressione Ctrl+C para parar.\n")

        # Abrir navegador automaticamente
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Servidor encerrado.")


if __name__ == "__main__":
    main()

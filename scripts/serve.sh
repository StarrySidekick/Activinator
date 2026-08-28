#!/usr/bin/env bash
# Serve the studio over http — the library is fetched, so file:// won't load it.
# `no-store` is development-only; nothing here ships.
cd "$(dirname "$0")/.." || exit 1
exec python3 - "${1:-8020}" <<'PY'
import sys, http.server, socketserver

class NoStore(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

port = int(sys.argv[1])
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('', port), NoStore) as srv:
    print(f'Aesthetics studio on http://localhost:{port}  (no-store, dev only)')
    srv.serve_forever()
PY

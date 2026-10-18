"""Serveur de développement : multi-thread, sans cache, avec compression gzip des fichiers texte.

La compression évite que le panneau de preview de Claude Code coupe la connexion sur les gros
fichiers (MapLibre pèse ~1 Mo). Le port vient de la variable d'environnement PORT (autoPort).
"""
import gzip
import http.server
import os

COMPRESSIBLE = (".js", ".css", ".json", ".svg", ".html")


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def send_header(self, keyword, value):
        if keyword == "Last-Modified":
            return
        super().send_header(keyword, value)

    def do_GET(self):
        path = self.translate_path(self.path)
        accepts_gzip = "gzip" in self.headers.get("Accept-Encoding", "")
        if accepts_gzip and os.path.isfile(path) and path.endswith(COMPRESSIBLE):
            with open(path, "rb") as source:
                body = gzip.compress(source.read(), 6)
            self.send_response(200)
            self.send_header("Content-Type", self.guess_type(path))
            self.send_header("Content-Encoding", "gzip")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()

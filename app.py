"""
ConsultaCNPJ - Servidor Web embutido (Python puro, sem dependencias externas)
"""
import http.server, json, os, sys, time, urllib.request, urllib.error
from collections import defaultdict

CNPJ_API_BASE = "https://publica.cnpj.ws/cnpj"
REQUEST_TIMEOUT = 25
PORT = 5000
HOST = "127.0.0.1"
RATE_LIMIT_MAX = 30
RATE_LIMIT_WINDOW = 60
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")


class RateLimiter:
    def __init__(self, max_requests=RATE_LIMIT_MAX, window=RATE_LIMIT_WINDOW):
        self.max_requests = max_requests
        self.window = window
        self.requests = defaultdict(list)

    def is_allowed(self, ip):
        now = time.time()
        cutoff = now - self.window
        self.requests[ip] = [t for t in self.requests[ip] if t > cutoff]
        if len(self.requests[ip]) >= self.max_requests:
            return False
        self.requests[ip].append(now)
        return True


rate_limiter = RateLimiter()

SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' https://cdn.tailwindcss.com; "
        "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; "
        "img-src 'self' data:; "
        "connect-src 'self' https://publica.cnpj.ws http://127.0.0.1:5500 http://127.0.0.1:5501 http://127.0.0.1:5502; "
        "frame-ancestors 'none'; "
        "form-action 'self'"
    ),
}


def generate_html_safe(text):
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&#x27;")
    )


def format_error(status_code, message):
    body = json.dumps({"erro": message}, ensure_ascii=False).encode("utf-8")
    return status_code, {"Content-Type": "application/json; charset=utf-8"}, body


def proxy_cnpj(cnpj):
    digits = "".join(c for c in cnpj if c.isdigit())
    if len(digits) != 14:
        return format_error(400, "CNPJ deve conter exatamente 14 digitos.")
    req = urllib.request.Request(
        f"{CNPJ_API_BASE}/{digits}",
        headers={"Accept": "application/json", "User-Agent": "ConsultaCNPJ/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as response:
            raw = response.read()
            payload = json.loads(raw)
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            return (200, {"Content-Type": "application/json; charset=utf-8"}, body)
    except urllib.error.HTTPError as e:
        try:
            payload = json.loads(e.read())
            mensagem = (
                payload.get("detalhes")
                or payload.get("message")
                or payload.get("erro")
                or payload.get("titulo")
                or f"Erro {e.code} ao consultar o CNPJ."
            )
        except Exception:
            mensagem = f"Erro {e.code} ao consultar o CNPJ."
        return format_error(e.code, mensagem)
    except urllib.error.URLError as e:
        if isinstance(e.reason, TimeoutError):
            return format_error(504, "A consulta demorou demais. Tente novamente.")
        return format_error(502, "Nao foi possivel conectar a API.")
    except (json.JSONDecodeError, ValueError):
        return format_error(502, "A API retornou uma resposta invalida.")
    except Exception:
        return format_error(500, "Erro interno ao acessar a API.")


def serve_static_file(path):
    path = path.lstrip("/")
    full_path = os.path.normpath(os.path.join(STATIC_DIR, path))
    if not full_path.startswith(os.path.normpath(STATIC_DIR)):
        return (403, {"Content-Type": "text/plain"}, b"Forbidden")
    if not os.path.isfile(full_path):
        return (404, {"Content-Type": "text/plain"}, b"Not found")
    ext = os.path.splitext(full_path)[1].lower()
    mime_types = {
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".html": "text/html; charset=utf-8",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".ico": "image/x-icon",
        ".json": "application/json",
        ".txt": "text/plain; charset=utf-8",
    }
    content_type = mime_types.get(ext, "application/octet-stream")
    try:
        with open(full_path, "rb") as f:
            return (200, {"Content-Type": content_type}, f.read())
    except IOError:
        return (404, {"Content-Type": "text/plain"}, b"Not found")


def serve_template():
    template_path = os.path.join(TEMPLATES_DIR, "index.html")
    if not os.path.isfile(template_path):
        return (500, {"Content-Type": "text/plain"}, b"Template not found")
    with open(template_path, "r", encoding="utf-8") as f:
        html = f.read()
    return (200, {"Content-Type": "text/html; charset=utf-8"}, html.encode("utf-8"))


class ConsultaCNPJHandler(http.server.BaseHTTPRequestHandler):
    def _add_security_headers(self):
        for key, value in SECURITY_HEADERS.items():
            self.send_header(key, value)
        # CORS: permite que o Live Server (porta 5500) chame a API
        self.send_header("Access-Control-Allow-Origin", "*")

    def _send_response(self, status_code, headers, body):
        self.send_response(status_code)
        self._add_security_headers()
        for key, value in headers.items():
            self.send_header(key, value)
        self.end_headers()
        if body:
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def get_client_ip(self):
        forwarded = self.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return self.client_address[0]

    def do_GET(self):
        path = self.path.rstrip("/") or "/"
        client_ip = self.get_client_ip()
        if not rate_limiter.is_allowed(client_ip):
            body = json.dumps(
                {"erro": "Muitas requisicoes. Aguarde um minuto."},
                ensure_ascii=False,
            ).encode("utf-8")
            self._send_response(
                429,
                {"Content-Type": "application/json; charset=utf-8", "Retry-After": "60"},
                body,
            )
            return
        if path.startswith("/api/consultar/"):
            cnpj = path[len("/api/consultar/"):]
            status, headers, body = proxy_cnpj(cnpj)
            self._send_response(status, headers, body)
            return
        if path.startswith("/static/"):
            file_path = path[len("/static/"):]
            status, headers, body = serve_static_file(file_path)
            self._send_response(status, headers, body)
            return
        if path == "/":
            status, headers, body = serve_template()
            self._send_response(status, headers, body)
            return
        self._send_response(404, {"Content-Type": "text/plain"}, b"Not found")

    def do_OPTIONS(self):
        self.send_response(204)
        self._add_security_headers()
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def log_message(self, format, *args):
        pass


def main():
    global PORT
    args = sys.argv[1:]
    for i, arg in enumerate(args):
        if arg == "--port" and i + 1 < len(args):
            try:
                PORT = int(args[i + 1])
            except ValueError:
                print(f"Porta invalida: {args[i + 1]}")
    server = http.server.HTTPServer((HOST, PORT), ConsultaCNPJHandler)
    print(f"\n  [ConsultaCNPJ]")
    print(f"  Servidor: http://{HOST}:{PORT}")
    print(f"  Seguranca: CSP | Rate Limit | Headers")
    print(f"  Pressione Ctrl+C para parar\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Servidor encerrado.")
        server.server_close()


if __name__ == "__main__":
    main()

"""
ConsultaCNPJ - Servidor HTTP leve, rápido e seguro para consultas de CNPJ.
Zero dependências externas. Use: python app.py
"""
import http.server
import json
import os
import posixpath
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from socketserver import ThreadingMixIn

# ─── Configuração ───────────────────────────────────────────────────────────
CNPJ_API_BASE = "https://publica.cnpj.ws/cnpj"
REQUEST_TIMEOUT = 15
PORT = int(os.getenv("PORT", "5500"))
HOST = os.getenv("HOST", "0.0.0.0")
RATE_LIMIT_MAX = 60
RATE_LIMIT_WINDOW = 60
CACHE_TTL = 300  # 5 minutos

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR_ABS = str(STATIC_DIR.resolve())

# ─── Logger simples ─────────────────────────────────────────────────────────
def log(level, msg):
    ts = datetime.now().strftime("%H:%M:%S")
    icon = {"INFO": " \033[36mℹ\033[0m", "OK": " \033[32m✓\033[0m", "ERR": " \033[31m✗\033[0m", "WARN": " \033[33m⚠\033[0m"}
    print(f"  {icon.get(level, '')} [{ts}] {msg}")

# ─── Rate Limiter ───────────────────────────────────────────────────────────
class RateLimiter:
    def __init__(self, max_requests, window):
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

rate_limiter = RateLimiter(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW)

# ─── Cache simples ──────────────────────────────────────────────────────────
class MemoryCache:
    def __init__(self, ttl):
        self.ttl = ttl
        self._data = {}

    def get(self, key):
        if key in self._data:
            entry = self._data[key]
            if time.time() - entry["time"] < self.ttl:
                return entry["data"]
            del self._data[key]
        return None

    def set(self, key, data):
        self._data[key] = {"data": data, "time": time.time()}

cache = MemoryCache(CACHE_TTL)

# ─── Headers de Segurança ───────────────────────────────────────────────────
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": (
        "default-src 'self'; "
        "script-src 'self' https://cdn.tailwindcss.com; "
        "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com; "
        "img-src 'self' data:; "
        "connect-src 'self' https://publica.cnpj.ws; "
        "frame-ancestors 'none'; "
        "form-action 'self'"
    ),
}

# ─── Utilitários ────────────────────────────────────────────────────────────
def normalize_cnpj(cnpj):
    return re.sub(r"\D", "", str(cnpj or ""))

def validate_cnpj_digits(cnpj):
    digits = normalize_cnpj(cnpj)
    if len(digits) != 14 or not digits.isdigit() or re.fullmatch(r"(\d)\1{13}", digits):
        return False
    def calc(base, weights):
        remainder = sum(int(ch) * w for ch, w in zip(base, weights)) % 11
        return 0 if remainder < 2 else 11 - remainder
    if calc(digits[:12], [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) != int(digits[12]):
        return False
    return calc(digits[:13], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) == int(digits[13])

def is_safe_path(path):
    candidate = path or "/"
    if candidate.startswith("//"):
        return False
    normalized = posixpath.normpath(candidate)
    if normalized in ("", "."):
        normalized = "/"
    if not normalized.startswith("/") or ".." in normalized.split("/"):
        return False
    return True

def format_error(status_code, message):
    body = json.dumps({"erro": message}, ensure_ascii=False).encode("utf-8")
    return status_code, {"Content-Type": "application/json; charset=utf-8"}, body

# ─── Proxy da API ───────────────────────────────────────────────────────────
def proxy_cnpj(cnpj):
    digits = normalize_cnpj(cnpj)
    if len(digits) != 14 or not validate_cnpj_digits(digits):
        log("ERR", f"CNPJ inválido: {cnpj}")
        return format_error(400, "CNPJ inválido. Informe um CNPJ com 14 dígitos válidos.")

    cached = cache.get(digits)
    if cached:
        log("OK", f"Cache hit: {digits}")
        body = json.dumps(cached, ensure_ascii=False).encode("utf-8")
        return 200, {"Content-Type": "application/json; charset=utf-8", "X-Cache": "HIT"}, body

    log("INFO", f"Consultando API: {digits}")
    req = urllib.request.Request(
        f"{CNPJ_API_BASE}/{digits}",
        headers={"Accept": "application/json", "User-Agent": "ConsultaCNPJ/2.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as response:
            payload = json.loads(response.read())
            cache.set(digits, payload)
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            log("OK", f"Consulta concluída: {digits}")
            return 200, {"Content-Type": "application/json; charset=utf-8", "X-Cache": "MISS"}, body
    except urllib.error.HTTPError as e:
        try:
            err_data = json.loads(e.read())
            mensagem = (
                err_data.get("detalhes") or err_data.get("message")
                or err_data.get("erro") or err_data.get("titulo")
                or f"Erro {e.code} ao consultar o CNPJ."
            )
        except Exception:
            mensagem = f"Erro {e.code} ao consultar o CNPJ."
        log("ERR", f"HTTP {e.code} para {digits}: {mensagem}")
        return format_error(e.code, mensagem)
    except urllib.error.URLError as e:
        msg = "A consulta demorou demais. Tente novamente." if isinstance(e.reason, TimeoutError) else "Não foi possível conectar à API."
        log("ERR", f"Timeout/Erro de rede: {digits}")
        return format_error(504 if isinstance(e.reason, TimeoutError) else 502, msg)
    except (json.JSONDecodeError, ValueError):
        log("ERR", f"JSON inválido da API para {digits}")
        return format_error(502, "A API retornou uma resposta inválida.")
    except Exception:
        log("ERR", f"Erro interno ao acessar API para {digits}")
        return format_error(500, "Erro interno ao acessar a API.")

# ─── Servir arquivos estáticos ──────────────────────────────────────────────
MIME_TYPES = {
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".ico": "image/x-icon",
    ".json": "application/json",
    ".txt": "text/plain; charset=utf-8",
}

def serve_static_file(path):
    candidate = (path or "").lstrip("/")
    if not is_safe_path("/" + candidate):
        return 403, {"Content-Type": "text/plain; charset=utf-8"}, b"Forbidden"
    full_path = os.path.abspath(os.path.join(STATIC_DIR_ABS, candidate))
    if os.path.commonpath([STATIC_DIR_ABS, full_path]) != STATIC_DIR_ABS:
        return 403, {"Content-Type": "text/plain; charset=utf-8"}, b"Forbidden"
    if not os.path.isfile(full_path):
        return 404, {"Content-Type": "text/plain; charset=utf-8"}, b"Not found"
    ext = os.path.splitext(full_path)[1].lower()
    try:
        with open(full_path, "rb") as f:
            return 200, {"Content-Type": MIME_TYPES.get(ext, "application/octet-stream")}, f.read()
    except IOError:
        return 404, {"Content-Type": "text/plain; charset=utf-8"}, b"Not found"

def serve_template():
    template_path = TEMPLATES_DIR / "index.html"
    if not template_path.is_file():
        return 500, {"Content-Type": "text/plain; charset=utf-8"}, b"Template not found"
    html = template_path.read_text(encoding="utf-8")
    return 200, {"Content-Type": "text/html; charset=utf-8"}, html.encode("utf-8")

# ─── Handler com Threading ──────────────────────────────────────────────────
class ThreadedHTTPServer(ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

class ConsultaCNPJHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def _add_security_headers(self):
        for key, value in SECURITY_HEADERS.items():
            self.send_header(key, value)
        origin = self.headers.get("Origin")
        self.send_header("Access-Control-Allow-Origin", origin or "*")

    def _send(self, status_code, headers, body, include_body=True):
        self.send_response(status_code)
        self._add_security_headers()
        for key, value in headers.items():
            self.send_header(key, value)
        self.send_header("X-Robots-Tag", "noindex, nofollow")
        self.end_headers()
        if include_body and body:
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

    def get_client_ip(self):
        forwarded = self.headers.get("X-Forwarded-For")
        return forwarded.split(",")[0].strip() if forwarded else self.client_address[0]

    def do_GET(self):
        parsed = urllib.parse.urlsplit(self.path)
        path = parsed.path or "/"
        ip = self.get_client_ip()

        if not is_safe_path(path):
            return self._send(403, {"Content-Type": "text/plain; charset=utf-8"}, b"Forbidden")

        if not rate_limiter.is_allowed(ip):
            log("WARN", f"Rate limit atingido: {ip}")
            body = json.dumps({"erro": "Muitas requisições. Aguarde um minuto."}, ensure_ascii=False).encode("utf-8")
            return self._send(429, {"Content-Type": "application/json; charset=utf-8", "Retry-After": "60"}, body)

        if path == "/api/health":
            body = json.dumps({"status": "ok", "timestamp": datetime.now().isoformat()}).encode("utf-8")
            return self._send(200, {"Content-Type": "application/json; charset=utf-8"}, body)

        if path.startswith("/api/consultar/"):
            cnpj = path[len("/api/consultar/"):]
            log("INFO", f"Requisição de {ip}: consultar CNPJ {cnpj}")
            status, headers, body = proxy_cnpj(cnpj)
            return self._send(status, headers, body)

        if path.startswith("/static/"):
            file_path = path[len("/static/"):]
            status, headers, body = serve_static_file(file_path)
            return self._send(status, headers, body)

        if path == "/":
            status, headers, body = serve_template()
            return self._send(status, headers, body)

        self._send(404, {"Content-Type": "text/plain; charset=utf-8"}, b"Not found")

    def do_HEAD(self):
        if self.path == "/api/health":
            self._send(204, {"Content-Type": "application/json; charset=utf-8"}, None)
        else:
            self._send(404, {"Content-Type": "text/plain; charset=utf-8"}, None, include_body=False)

    def do_OPTIONS(self):
        self.send_response(204)
        self._add_security_headers()
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

# ─── Main ───────────────────────────────────────────────────────────────────
def main():
    port = PORT
    args = sys.argv[1:]
    for i, arg in enumerate(args):
        if arg == "--port" and i + 1 < len(args):
            try:
                port = int(args[i + 1])
            except ValueError:
                print(f"Porta inválida: {args[i + 1]}")
                return

    server = ThreadedHTTPServer((HOST, port), ConsultaCNPJHandler)
    print("")
    print("  \033[36m╔══════════════════════════════════════╗\033[0m")
    print("  \033[36m║       CONSULTA CNPJ  v2.0           ║\033[0m")
    print("  \033[36m╠══════════════════════════════════════╣\033[0m")
    print(f"  \033[36m║\033[0m  Servidor: \033[1mhttp://{HOST}:{port}\033[0m          \033[36m║\033[0m")
    print("  \033[36m║  Threads: ✓  Cache: ✓  Rate: ✓    ║\033[0m")
    print("  \033[36m╚══════════════════════════════════════╝\033[0m")
    print("")
    log("OK", f"Servidor pronto! Acesse http://localhost:{port}")
    log("INFO", "Pressione Ctrl+C para parar")
    print("")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("")
        log("OK", "Servidor encerrado.")
        server.server_close()

if __name__ == "__main__":
    main()

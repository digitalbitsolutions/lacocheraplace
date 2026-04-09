import argparse
import html
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


BASE_DIR = Path(__file__).resolve().parent.parent
PRIVATE_APPROVALS_DIR = BASE_DIR / "private-data" / "provider-approvals"
DRAFTS_DIR = PRIVATE_APPROVALS_DIR / "drafts"
APPROVED_DIR = PRIVATE_APPROVALS_DIR / "approved"
DECLINED_DIR = PRIVATE_APPROVALS_DIR / "declined"
HELPER_SCRIPT = BASE_DIR / "scripts" / "provider_approval_workflow.py"

DEFAULT_FORM_DATA = {
    "submission_id": "",
    "status": "pending",
    "provider_slug": "",
    "display_name": "",
    "legal_name": "",
    "catalog_vendor_name": "",
    "contact_name": "",
    "email": "",
    "phone": "",
    "whatsapp": "",
    "address_line_1": "",
    "address_line_2": "",
    "city": "",
    "postal_code": "",
    "province_or_region": "",
    "country": "",
    "google_place_id": "",
    "latitude": "",
    "longitude": "",
    "account_holder": "",
    "tax_id": "",
    "iban": "",
    "bank_name": "",
    "bank_country": "",
    "service_categories": [],
    "description": "",
    "opening_hours": "",
    "website_url": "",
    "instagram_url": "",
    "logo_source_url": "",
    "gallery_source_urls": "",
    "decline_reason": "",
}

FIELD_LABELS = {
    "submission id": "submission_id",
    "estado": "status",
    "provider slug": "provider_slug",
    "nombre comercial": "display_name",
    "nombre legal o razon social": "legal_name",
    "nombre en catalogo": "catalog_vendor_name",
    "persona de contacto": "contact_name",
    "email": "email",
    "telefono": "phone",
    "whatsapp": "whatsapp",
    "direccion principal": "address_line_1",
    "informacion adicional": "address_line_2",
    "ciudad": "city",
    "codigo postal": "postal_code",
    "provincia o region": "province_or_region",
    "pais": "country",
    "google place id": "google_place_id",
    "latitud": "latitude",
    "longitud": "longitude",
    "titular de la cuenta": "account_holder",
    "nif/cif": "tax_id",
    "iban": "iban",
    "banco": "bank_name",
    "pais de la cuenta": "bank_country",
    "categorias": "service_categories",
    "horarios": "opening_hours",
    "sitio web": "website_url",
    "instagram": "instagram_url",
    "url del logo": "logo_source_url",
}

SECTIONS = [
    ("Resumen", ["submission_id", "status", "provider_slug"]),
    ("Negocio", ["display_name", "legal_name", "catalog_vendor_name", "description", "opening_hours"]),
    ("Contacto", ["contact_name", "email", "phone", "whatsapp"]),
    (
        "Ubicacion",
        [
            "address_line_1",
            "address_line_2",
            "city",
            "postal_code",
            "province_or_region",
            "country",
            "google_place_id",
            "latitude",
            "longitude",
        ],
    ),
    ("Fiscal y bancario", ["account_holder", "tax_id", "iban", "bank_name", "bank_country"]),
    ("Servicios", ["service_categories"]),
    ("Presencia digital", ["website_url", "instagram_url", "logo_source_url", "gallery_source_urls"]),
]


def ensure_private_dirs():
    for path in (PRIVATE_APPROVALS_DIR, DRAFTS_DIR, APPROVED_DIR, DECLINED_DIR):
        path.mkdir(parents=True, exist_ok=True)


def slugify(value):
    normalized = (
        value.strip()
        .lower()
        .replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
        .replace("ñ", "n")
    )
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    return normalized.strip("-")


def timestamp():
    return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")


def normalize_form_data(data):
    normalized = dict(DEFAULT_FORM_DATA)
    normalized.update(data or {})

    for key in ("service_categories",):
        value = normalized.get(key, [])
        if isinstance(value, str):
            normalized[key] = [item.strip() for item in value.split(",") if item.strip()]

    if isinstance(normalized.get("gallery_source_urls"), list):
        normalized["gallery_source_urls"] = "\n".join(normalized["gallery_source_urls"])

    normalized["status"] = normalized.get("status") or "pending"

    if not normalized.get("provider_slug"):
        normalized["provider_slug"] = slugify(
            normalized.get("display_name") or normalized.get("legal_name") or normalized.get("catalog_vendor_name") or ""
        )

    if not normalized.get("catalog_vendor_name"):
        normalized["catalog_vendor_name"] = normalized.get("display_name", "")

    return normalized


def parse_email_body(body):
    data = dict(DEFAULT_FORM_DATA)
    current_multiline = None
    gallery_lines = []

    for raw_line in body.splitlines():
        line = raw_line.strip()
        if not line:
            if current_multiline == "description":
                data["description"] = data["description"].rstrip()
            current_multiline = None
            continue

        if line.startswith("==="):
            current_multiline = None
            continue

        gallery_item = re.match(r"^-\s*URLs de galeria:\s*$", line, re.IGNORECASE)
        if gallery_item:
            current_multiline = "gallery"
            gallery_lines = []
            continue

        if current_multiline == "gallery":
            gallery_match = re.match(r"^-+\s*(.+)$", line)
            if gallery_match:
                gallery_lines.append(gallery_match.group(1).strip())
                data["gallery_source_urls"] = "\n".join(gallery_lines)
                continue
            current_multiline = None

        if line.lower() == "=== descripcion ===":
            current_multiline = "description"
            data["description"] = ""
            continue

        if current_multiline == "description":
            if data["description"]:
                data["description"] += "\n"
            data["description"] += raw_line.strip()
            continue

        match = re.match(r"^-\s*([^:]+):\s*(.*)$", line)
        if not match:
            continue

        label = match.group(1).strip().lower()
        value = match.group(2).strip()
        field = FIELD_LABELS.get(label)
        if not field:
            continue

        if field == "service_categories":
            data[field] = [item.strip() for item in value.split(",") if item.strip() and item.strip() != "-"]
        else:
            data[field] = "" if value == "-" else value

    return normalize_form_data(data)


def serialize_for_helper(data):
    payload = normalize_form_data(data)
    payload.pop("decline_reason", None)
    return payload


def save_json(data, directory, suffix):
    ensure_private_dirs()
    payload = normalize_form_data(data)
    base_name = payload.get("provider_slug") or payload.get("submission_id") or f"provider-{timestamp()}"
    safe_name = slugify(base_name) or f"provider-{timestamp()}"
    path = directory / f"{safe_name}-{suffix}.json"
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def run_helper(data, execute=False):
    payload = serialize_for_helper(data)

    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        temp_path = Path(handle.name)

    try:
        command = [sys.executable, str(HELPER_SCRIPT), "approve", "--input", str(temp_path)]
        if execute:
            command.append("--execute")

        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            cwd=str(BASE_DIR),
            env=os.environ.copy(),
        )
        return completed.returncode, completed.stdout, completed.stderr
    finally:
        temp_path.unlink(missing_ok=True)


def decline_submission(data):
    payload = normalize_form_data(data)
    payload["status"] = "declined"
    payload["declined_at"] = datetime.now(timezone.utc).isoformat()
    path = save_json(payload, DECLINED_DIR, "declined")
    return path


def page_html():
    sections_html = []
    for title, keys in SECTIONS:
        fields_html = []
        for key in keys:
            label = key.replace("_", " ").capitalize()
            is_multiline = key in {"description", "opening_hours", "gallery_source_urls"}
            input_html = (
                f'<textarea name="{key}" rows="4"></textarea>'
                if is_multiline
                else f'<input name="{key}" type="text" />'
            )
            fields_html.append(f"<label><span>{html.escape(label)}</span>{input_html}</label>")
        sections_html.append(f"<section><h3>{html.escape(title)}</h3>{''.join(fields_html)}</section>")

    return f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Provider Approval Console</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 0; background: #f7f7f7; color: #111; }}
    .layout {{ display: grid; grid-template-columns: 1.1fr 1fr; gap: 20px; padding: 24px; }}
    .panel {{ background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 8px 30px rgba(0,0,0,.08); }}
    h1, h2, h3 {{ margin-top: 0; }}
    textarea, input {{ width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #c9c9c9; border-radius: 8px; font: inherit; }}
    textarea#emailBody {{ min-height: 280px; }}
    label {{ display: block; margin-bottom: 12px; }}
    label span {{ display: block; font-size: 13px; font-weight: 700; margin-bottom: 6px; }}
    section {{ border-top: 1px solid #ececec; padding-top: 16px; margin-top: 16px; }}
    .grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
    .grid label.full {{ grid-column: 1 / -1; }}
    .actions {{ display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }}
    button {{ border: 0; border-radius: 8px; padding: 10px 14px; font: inherit; font-weight: 700; cursor: pointer; }}
    button.primary {{ background: #111; color: #fff; }}
    button.secondary {{ background: #ececec; color: #111; }}
    button.danger {{ background: #b42318; color: #fff; }}
    pre {{ white-space: pre-wrap; background: #111; color: #f5f5f5; border-radius: 10px; padding: 14px; min-height: 220px; overflow: auto; }}
    .status {{ font-size: 14px; color: #444; min-height: 20px; }}
    .hint {{ font-size: 13px; color: #666; }}
    @media (max-width: 980px) {{ .layout {{ grid-template-columns: 1fr; }} .grid {{ grid-template-columns: 1fr; }} }}
  </style>
</head>
<body>
  <div class="layout">
    <div class="panel">
      <h1>Provider Approval Console</h1>
      <p class="hint">Pega el cuerpo del email del admin, parsea los datos, revisa los campos y luego guarda, aprueba o declina.</p>
      <label>
        <span>Contenido del email</span>
        <textarea id="emailBody" placeholder="Pega aqui el cuerpo del email de solicitud..."></textarea>
      </label>
      <div class="actions">
        <button class="secondary" id="parseBtn" type="button">Parsear email</button>
        <button class="secondary" id="loadTemplateBtn" type="button">Cargar vacio</button>
      </div>
      <div class="status" id="status"></div>
    </div>
    <div class="panel">
      <h2>Solicitud</h2>
      <div class="grid">
        {''.join(sections_html)}
        <label class="full"><span>Motivo de declinacion</span><textarea name="decline_reason" rows="3"></textarea></label>
      </div>
      <div class="actions">
        <button class="secondary" id="saveBtn" type="button">Guardar borrador</button>
        <button class="secondary" id="dryRunBtn" type="button">Dry run aprobacion</button>
        <button class="primary" id="approveBtn" type="button">Aprobar en Shopify</button>
        <button class="danger" id="declineBtn" type="button">Declinar</button>
      </div>
      <p class="hint">Para aprobar de verdad, este proceso necesita `SHOPIFY_STORE` y `SHOPIFY_ADMIN_TOKEN` en el entorno local.</p>
    </div>
  </div>
  <div class="layout" style="padding-top:0">
    <div class="panel" style="grid-column:1 / -1">
      <h2>Resultado</h2>
      <pre id="output"></pre>
    </div>
  </div>
  <script>
    const defaultData = {json.dumps(DEFAULT_FORM_DATA, ensure_ascii=False)};

    const formElements = Object.fromEntries(
      [...document.querySelectorAll('[name]')].map((element) => [element.name, element])
    );

    const statusEl = document.getElementById('status');
    const outputEl = document.getElementById('output');
    const emailBodyEl = document.getElementById('emailBody');

    function setStatus(message) {{
      statusEl.textContent = message || '';
    }}

    function currentData() {{
      const data = {{}};
      Object.entries(formElements).forEach(([name, element]) => {{
        data[name] = element.value;
      }});
      data.service_categories = (data.service_categories || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      return data;
    }}

    function fillForm(data) {{
      const merged = {{ ...defaultData, ...data }};
      Object.entries(formElements).forEach(([name, element]) => {{
        if (name === 'service_categories') {{
          element.value = Array.isArray(merged[name]) ? merged[name].join(', ') : (merged[name] || '');
        }} else {{
          element.value = merged[name] || '';
        }}
      }});
    }}

    async function callApi(path, payload) {{
      const response = await fetch(path, {{
        method: 'POST',
        headers: {{ 'Content-Type': 'application/json' }},
        body: JSON.stringify(payload),
      }});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Operacion fallida');
      return data;
    }}

    document.getElementById('parseBtn').addEventListener('click', async () => {{
      try {{
        const data = await callApi('/api/parse', {{ email_body: emailBodyEl.value }});
        fillForm(data.data);
        outputEl.textContent = JSON.stringify(data.data, null, 2);
        setStatus('Email parseado.');
      }} catch (error) {{
        setStatus(error.message);
      }}
    }});

    document.getElementById('loadTemplateBtn').addEventListener('click', () => {{
      fillForm(defaultData);
      outputEl.textContent = '';
      setStatus('Formulario vacio cargado.');
    }});

    document.getElementById('saveBtn').addEventListener('click', async () => {{
      try {{
        const data = await callApi('/api/save', currentData());
        outputEl.textContent = JSON.stringify(data, null, 2);
        setStatus('Borrador guardado.');
      }} catch (error) {{
        setStatus(error.message);
      }}
    }});

    document.getElementById('dryRunBtn').addEventListener('click', async () => {{
      try {{
        const data = await callApi('/api/approve-dry-run', currentData());
        outputEl.textContent = data.stdout || data.stderr || '';
        setStatus('Dry run completado.');
      }} catch (error) {{
        setStatus(error.message);
      }}
    }});

    document.getElementById('approveBtn').addEventListener('click', async () => {{
      try {{
        const data = await callApi('/api/approve', currentData());
        outputEl.textContent = JSON.stringify(data, null, 2);
        setStatus('Solicitud aprobada en Shopify.');
      }} catch (error) {{
        setStatus(error.message);
      }}
    }});

    document.getElementById('declineBtn').addEventListener('click', async () => {{
      try {{
        const data = await callApi('/api/decline', currentData());
        outputEl.textContent = JSON.stringify(data, null, 2);
        setStatus('Solicitud declinada y archivada.');
      }} catch (error) {{
        setStatus(error.message);
      }}
    }});

    fillForm(defaultData);
  </script>
</body>
</html>"""


class ApprovalConsoleHandler(BaseHTTPRequestHandler):
    def _send_json(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path != "/":
            self.send_error(HTTPStatus.NOT_FOUND)
            return

        body = page_html().encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        parsed = urlparse(self.path)
        try:
            payload = self._read_json()
            if parsed.path == "/api/parse":
                data = parse_email_body(payload.get("email_body", ""))
                self._send_json({"data": data})
                return

            if parsed.path == "/api/save":
                path = save_json(payload, DRAFTS_DIR, "draft")
                self._send_json({"saved_to": str(path)})
                return

            if parsed.path == "/api/approve-dry-run":
                code, stdout, stderr = run_helper(payload, execute=False)
                self._send_json({"returncode": code, "stdout": stdout, "stderr": stderr}, status=HTTPStatus.OK if code == 0 else HTTPStatus.BAD_REQUEST)
                return

            if parsed.path == "/api/approve":
                approved_snapshot = save_json(payload, APPROVED_DIR, "approved-request")
                code, stdout, stderr = run_helper(payload, execute=True)
                status = HTTPStatus.OK if code == 0 else HTTPStatus.BAD_REQUEST
                self._send_json(
                    {
                        "saved_to": str(approved_snapshot),
                        "returncode": code,
                        "stdout": stdout,
                        "stderr": stderr,
                    },
                    status=status,
                )
                return

            if parsed.path == "/api/decline":
                path = decline_submission(payload)
                self._send_json({"saved_to": str(path), "status": "declined"})
                return

            self.send_error(HTTPStatus.NOT_FOUND)
        except Exception as exc:
            self._send_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)


def run_server(port):
    ensure_private_dirs()
    server = ThreadingHTTPServer(("127.0.0.1", port), ApprovalConsoleHandler)
    print(f"Provider approval console disponible en http://127.0.0.1:{port}")
    print("Pulsa Ctrl+C para detenerla.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


def main():
    parser = argparse.ArgumentParser(description="Local console to review, approve or decline provider applications.")
    parser.add_argument("--port", type=int, default=8765, help="Puerto del servidor local.")
    args = parser.parse_args()
    run_server(args.port)


if __name__ == "__main__":
    main()

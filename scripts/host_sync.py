import argparse
import json
import os
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from urllib.parse import urlparse

XLSX_MIME_TYPE = (
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
)
MAX_FILE_SIZE = 4 * 1024 * 1024
POLL_INTERVAL_SECONDS = 2
STABLE_CHECKS = 2


def read_config(path):
    values = {}
    if not path.exists():
        return values

    for line_number, line in enumerate(
        path.read_text(encoding="utf-8").splitlines(), 1
    ):
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if "=" not in stripped:
            raise ValueError(f"Configuração inválida na linha {line_number}.")
        key, value = stripped.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")
    return values


def get_setting(name, config):
    return os.environ.get(name) or config.get(name)


def file_signature(path):
    stat = path.stat()
    return stat.st_size, stat.st_mtime_ns


def wait_for_stable_file(path):
    previous_signature = None
    stable_checks = 0

    while True:
        try:
            signature = file_signature(path)
            if signature == previous_signature:
                stable_checks += 1
            else:
                previous_signature = signature
                stable_checks = 0

            if stable_checks >= STABLE_CHECKS:
                content = path.read_bytes()
                if file_signature(path) == signature:
                    return content, signature
        except OSError as error:
            print(
                f"Aguardando o arquivo ficar disponível: {error}",
                file=sys.stderr,
            )

        time.sleep(POLL_INTERVAL_SECONDS)


def upload_file(url, token, content):
    if not content:
        raise ValueError("O arquivo está vazio.")
    if len(content) > MAX_FILE_SIZE:
        raise ValueError("A planilha excede o limite de 4 MB.")

    request = Request(
        url,
        data=content,
        headers={
            "Authorization": "Bearer " + token,
            "Content-Type": XLSX_MIME_TYPE,
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=60) as response:
            result = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        response_body = error.read().decode("utf-8", errors="replace")
        try:
            message = json.loads(response_body).get("error", response_body)
        except json.JSONDecodeError:
            message = response_body or error.reason
        raise RuntimeError(
            f"Envio recusado ({error.code}): {message}"
        ) from error
    except URLError as error:
        raise RuntimeError(
            f"Não foi possível conectar ao servidor: {error.reason}"
        ) from error
    except json.JSONDecodeError as error:
        raise RuntimeError("O servidor retornou uma resposta inválida.") from error

    print(result.get("message", "Planilha sincronizada."))


def run():
    parser = argparse.ArgumentParser(
        description="Envia e monitora a planilha de escala no Supabase."
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=Path(__file__).resolve().parent.parent / "host-sync.env",
        help="Arquivo local de configuração (padrão: host-sync.env na raiz).",
    )
    parser.add_argument(
        "--file",
        type=Path,
        help="Caminho da planilha; substitui SCHEDULE_FILE da configuração.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Envia uma vez e encerra, sem monitorar alterações.",
    )
    args = parser.parse_args()

    config = read_config(args.config)
    url = get_setting("HOST_SYNC_URL", config)
    token = get_setting("HOST_UPLOAD_TOKEN", config)
    configured_path = args.file or get_setting("SCHEDULE_FILE", config)

    if not url:
        raise ValueError("Configure HOST_SYNC_URL no host-sync.env ou no ambiente.")
    if not token:
        raise ValueError(
            "Configure HOST_UPLOAD_TOKEN no host-sync.env ou no ambiente."
        )
    if len(token) < 32:
        raise ValueError(
            "HOST_UPLOAD_TOKEN precisa ter pelo menos 32 caracteres."
        )
    if not configured_path:
        raise ValueError("Configure SCHEDULE_FILE ou informe --file.")

    parsed_url = urlparse(url)
    is_local_http = parsed_url.scheme == "http" and parsed_url.hostname in {
        "localhost", "127.0.0.1", "::1"
    }
    if not parsed_url.hostname or (
        parsed_url.scheme != "https" and not is_local_http
    ):
        raise ValueError("HOST_SYNC_URL deve usar HTTPS.")

    file_path = Path(configured_path).expanduser()
    if not file_path.is_absolute():
        file_path = file_path.resolve()
    if not file_path.is_file():
        raise FileNotFoundError(f"Arquivo não encontrado: {file_path}")

    if args.once:
        content, _ = wait_for_stable_file(file_path)
        upload_file(url, token, content)
        return

    print(f"Monitorando: {file_path}")
    print("Pressione Ctrl+C para encerrar.")

    last_signature = None
    while True:
        try:
            signature = file_signature(file_path)
            if signature != last_signature:
                content, stable_signature = wait_for_stable_file(file_path)
                upload_file(url, token, content)
                last_signature = stable_signature
        except OSError as error:
            print(f"Arquivo indisponível: {error}", file=sys.stderr)
            last_signature = None
        except (RuntimeError, ValueError) as error:
            print(f"Falha ao sincronizar: {error}", file=sys.stderr)

        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        print("\nMonitoramento encerrado.")
    except (OSError, ValueError) as error:
        print(f"Erro: {error}", file=sys.stderr)
        sys.exit(1)

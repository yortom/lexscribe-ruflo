# infra/scripts

- `generate-self-signed-cert.sh` — genera un certificado autofirmado en `infra/nginx/certs/lexscribe.{crt,key}` para desarrollo local. Ejecutar UNA vez antes de `docker compose up` la primera vez.

## Local stack

From repo root:
1. cp .env.example .env  (then fill secrets)
2. ./infra/scripts/generate-self-signed-cert.sh
3. docker compose -f infra/docker-compose.yml --env-file .env up --build
4. open https://localhost (accept self-signed warning)

# Plataforma de Gestión de Cumplimiento Ambiental

MVP de gestión de obligaciones ambientales. Incluye la estructura de frontend y backend, PostgreSQL, modelos relacionales, onboarding persistente, autenticación con cookie HttpOnly y un placeholder de dashboard protegido. No contiene CRUD de obligaciones, controles, evidencias, reportes ni IA.

## Requisitos

- Docker Desktop con Docker Compose.
- Node.js 20 o superior y pnpm para el frontend.
- Python 3.11 o superior para el backend.

## Configuración

Desde la raíz del proyecto, copia `.env.example` a `.env`. Luego copia `backend/.env.example` a `backend/.env` y `frontend/.env.example` a `frontend/.env.local`. Genera un valor largo y aleatorio para `JWT_SECRET_KEY`. En producción, configura `COOKIE_SECURE=true`; si frontend y API están en sitios distintos, usa `COOKIE_SAMESITE=none` junto con HTTPS.

## PostgreSQL

```powershell
docker compose up -d postgres
docker compose ps
```

La base queda disponible por defecto en `localhost:5432`, con los valores definidos en `.env`.

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Comprueba el servicio en `http://localhost:8000/health`. Debe responder `{"status":"ok","environment":"development"}`.

## Frontend

```powershell
cd frontend
pnpm install
pnpm dev
```

Abre `http://localhost:3000` para ver la página de verificación.

## Datos demo locales

Para poblar manualmente una base de desarrollo vacía con datos ficticios, después de ejecutar las migraciones:

```powershell
cd backend
python scripts/seed_demo.py
```

El script solo permite `APP_ENV=development`, no se ejecuta al iniciar la aplicación y es idempotente: si detecta la organización o los correos demo, no inserta duplicados. Las credenciales locales son `admin.demo@example.com` / `Demo2026!`.

## Autenticación

- `POST /auth/register`: crea una organización y su primer usuario con rol `ADMIN` en una transacción.
- `POST /auth/login`: verifica credenciales y entrega la sesión en una cookie HttpOnly.
- `GET /auth/me`: recupera el usuario y organización autenticados.

Las contraseñas se almacenan exclusivamente como hashes Argon2. El JWT no se guarda en `localStorage`; vive en una cookie HttpOnly con expiración configurable.

## Modelo inicial

- `Organization`: organización que utiliza la plataforma.
- `Role`: catálogo de roles `ADMIN`, `RESPONSIBLE` y `READER`.
- `User`: usuario asociado a una organización y rol. El correo es único dentro de su organización.
- `Obligation`: obligación ambiental con creador, responsable opcional, estado de cumplimiento e indicador de archivo.

Las obligaciones usan `is_active` para archivado y `compliance_status` para el estado operacional (`PENDING`, `IN_PROGRESS`, `COMPLIANT`, `OVERDUE`). La pertenencia del responsable a la misma organización se validará en la lógica de negocio cuando se implemente el caso de uso correspondiente.

## Base de datos

La migración inicial crea:

- Tablas y claves foráneas para el modelo inicial.
- Restricción `UNIQUE(organization_id, email)` en usuarios.
- Roles base.
- Trigger `updated_at` para `organizations`, `users` y `obligations`.
- Función de resumen de cumplimiento. Consulta [la documentación](docs/database/compliance-summary.md).

## Próximo incremento

El siguiente paso, sujeto a aprobación, será implementar el CRUD de obligaciones con autorización por rol.

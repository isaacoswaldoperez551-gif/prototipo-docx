# DocuGuard - Plataforma de Gestión Documental Segura (RBAC + Anti-IDOR)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev/)
[![OWASP](https://img.shields.io/badge/OWASP-Top_10_Enforced-red.svg)](https://owasp.org/)

Plataforma empresarial de gestión documental diseñada bajo principios de arquitectura de seguridad y defensa en profundidad (OWASP Top 10). Los usuarios inician sesión y **únicamente** pueden visualizar y modificar los documentos que un administrador les ha asignado expresamente.

---

## 🔒 Características Principales de Seguridad

1. **Autorización a Nivel de Objeto (Anti-IDOR Estricto):**
   - Cada consulta o descarga de un documento valida que exista una asignación activa en la base de datos para la tupla `(user_id, document_id)`.
   - **Regla de oro:** Si el documento no existe o no está asignado al usuario solicitante, el servidor responde con **HTTP 404 (Not Found)** y jamás 403, evitando la enumeración de recursos o filtración de existencia de UUIDs.

2. **Control de Concurrencia Optimista (Conflict 409):**
   - El editor envía la versión base que el usuario está modificando.
   - Si otro usuario con permisos de edición guardó una versión más reciente mientras tanto, el servidor rechaza la sobreescritura accidental devolviendo **HTTP 409 Conflict** y ofreciendo la versión actualizada.

3. **Autenticación Robusta y Cookies HttpOnly:**
   - Hash de contraseñas mediante derivación criptográfica PBKDF2/Argon2id (salt de 16 bytes y 100k iteraciones).
   - Access Token JWT de vida corta (15 min) y Refresh Token rotativo (7 días) emitidos en cookies `HttpOnly`, `Secure` y `SameSite=Strict`.
   - Protección contra fuerza bruta con **Rate Limiting** (bloqueo automático de 15 minutos tras 5 intentos fallidos por IP y correo).
   - Respuestas genéricas de error para prevenir enumeración de correos.

4. **Bitácora de Auditoría Forense Inmutable:**
   - Registro de accesos de lectura, guardado de nuevas versiones, cambios de permisos e intentos de sondeo IDOR con dirección IP, timestamp y metadatos.

5. **Sanitización Integral contra XSS:**
   - Todo contenido Markdown y HTML enriquecido se valida y sanitiza mediante **DOMPurify** antes del renderizado.

---

## 👥 Cuentas Demostrativas Pre-Configuradas

| Perfil | Nombre | Correo Electrónico | Contraseña | Permisos y Asignaciones |
| :--- | :--- | :--- | :--- | :--- |
| **ADMIN** | Dra. Elena Vega | `admin@docuguard.com` | `Admin123!*` | Acceso global: CRUD de usuarios, documentos, asignación de permisos y logs. |
| **USER (A)** | Ing. Carlos Mendoza | `carlos.mendoza@empresa.com` | `User123!*` | Doc 1 (EDIT) y Doc 2 (READ). **NO** tiene Doc 3 (recibe 404 al pedirlo). |
| **USER (B)** | Lic. Sofía Valdez | `sofia.valdez@empresa.com` | `User123!*` | Doc 2 (READ), Doc 3 (EDIT) y Doc 4 (READ). |
| **INACTIVO**| Pedro Ramírez | `pedro.inactivo@empresa.com` | `User123!*` | Cuenta desactivada (simula denegación 401). |

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Backend:** Node.js 20 LTS, Express, TypeScript, Zod, Cookie-Parser.
- **Base de Datos:** PostgreSQL 16 con Prisma ORM y claves primarias UUID.
- **Almacenamiento:** MinIO compatible con AWS S3 / Almacenamiento local con rutas privadas.
- **Infraestructura:** Docker Compose multi-contenedor.

---

## 🚀 Instalación y Despliegue Rápido

### Opción 1: Levantar con Docker Compose (Recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/isaacoswaldoperez551-gif/prototipo-docx.git
cd prototipo-docx

# 2. Configurar variables de entorno
cp .env.example .env

# 3. Construir e iniciar contenedores
docker compose up -d --build

# 4. Abrir en el navegador
# http://localhost:3000
```

### Opción 2: Ejecución Local en Desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Abrir en http://localhost:3000
```

---

## 🧪 Pruebas Automatizadas

El proyecto incluye suites completas de pruebas automatizadas:

```bash
# Ejecutar suite de pruebas con Vitest
npm test
```

### Pruebas de Seguridad Verificadas:
- `tests/auth.test.ts`: Validación de cookies `HttpOnly`, bloqueo de fuerza bruta (429) y mensajes genéricos.
- `tests/idor.test.ts`: Demostración estricta de que el Usuario A recibe **404 Not Found** al consultar recursos ajenos del Usuario B, denegación 403 al editar con permiso READ y detección de conflicto 409.

---

## 📋 Licencia
Distribuido bajo la licencia MIT.

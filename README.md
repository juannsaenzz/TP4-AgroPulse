# AgroPulse - IoT & Telemetría Agrícola

## Trabajo Práctico 4: Arquitectura de Aplicaciones Móviles

AgroPulse es un sistema distribuido para la monitorización de humedad y control automatizado de válvulas de riego en tiempo real, compuesto por una aplicación móvil (React Native) y un Worker simulador IoT (Node.js + Docker) conectado a una base de datos Supabase.

### Requisitos Previos
- Node.js v18+
- Docker & Docker Compose
- Cuenta en Supabase (o instancia local)
- Expo CLI

### Instalación y Reproducción (Repro)

1. **Clonar e Instalar la App Móvil:**
   ```bash
   git clone https://github.com/juannsaenzz/TP4-AgroPulse
   cd agropulse
   npm install
   ```

2. **Configurar Variables de Entorno:**
   - Copiar el archivo `.env.example` de la raíz a `.env` y configurar tus credenciales públicas de Supabase.
   - Copiar el archivo `infra/.env.example` a `infra/.env` y configurar tu `SUPABASE_SERVICE_ROLE_KEY` (¡nunca publicar esta key en el repo!).

3. **Base de Datos:**
   - Ejecutar el script `supabase/migrations/001_schema_and_policies.sql` en el SQL Editor de tu instancia de Supabase.
   - Ejecutar el script `supabase/migrations/002_seed.sql` para cargar los datos base.

4. **Levantar el Simulador IoT (Worker):**
   ```bash
   cd infra
   docker-compose up --build
   ```
   *Esto iniciará Redpanda y el Worker de Node.js que simulará las lecturas de humedad.*

5. **Iniciar la App:**
   ```bash
   cd ..
   npx expo start
   ```

### Usuarios de Prueba (Seed)
*(Contraseñas genéricas solo para ambiente de pruebas)*

| Rol | Email | Password |
| :--- | :--- | :--- |
| **Productor** (Admin) | productor@agropulse.test | password123 |
| **Operador** (Acción) | operador@agropulse.test | password123 |
| **Asesor** (Lectura) | asesor@agropulse.test | password123 |

### Arquitectura y Notas
- **Seguridad (RLS):** Toda la comunicación móvil utiliza JWT anónimos y está restringida estrictamente por Row Level Security.
- **Worker Autónomo:** El simulador opera de forma autónoma con privilegios elevados (`service_role`) inyectando telemetría a alta frecuencia sin comprometer el rendimiento de la app móvil.

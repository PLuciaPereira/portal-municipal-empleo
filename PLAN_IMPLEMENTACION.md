# PLAN DE IMPLEMENTACIÓN
## Portal Municipal de Empleo — Municipalidad de Funes

---

## 1. Estado actual del proyecto

El Portal de Empleo de Funes se encuentra actualmente en un estado de **prototipo funcional desconectado del backend de base de datos**.

Existe una base frontend implementada con **Next.js 16 (App Router)** y **Tailwind CSS v4**, que cuenta con la landing page pública, el catálogo de ofertas laborales con filtros del lado del cliente, el detalle de una oferta laboral y las páginas de login y registro de postulantes.

Sin embargo:
- **Toda la persistencia de datos actual es ficticia:** las ofertas y rubros se leen desde constantes en memoria (`lib/jobs.ts`) y la autenticación se maneja exclusivamente en el navegador mediante `localStorage` con usuarios demo precargados (`context/AuthContext.tsx`).
- **No existe integración real con Supabase:** las librerías cliente (`@supabase/supabase-js`, `@supabase/ssr`) no se encuentran instaladas en `package.json`, no existen clientes configurados en el código y no se realizan consultas a la base de datos.
- **Faltan los portales privados principales:** no están implementados los paneles ni los flujos para Postulantes (perfil, gestión de hasta 5 CVs, historial de postulaciones), Empresas (registro con aprobación, gestión de ofertas, recepción de candidatos preseleccionados) ni la Oficina de Empleo Municipal (aprobación de empresas y ofertas, preselección con prioridad Funes, derivación, cursos y estadísticas).
- **Inconsistencias en el modelo de base de datos:** las migraciones iniciales (`000` y `001`) comenzaron a unificar nombres en español (`perfil`, `empresas`, `ofertas`, `postulaciones`), pero carecen de estructuras clave requeridas por la documentación funcional, tales como la tabla de múltiples CVs (límite 5) con borrado lógico, la tabla de cursos y derivaciones, el estado de aprobación/rechazo de empresas con motivo, el estado de postulación `retirado_por_postulante` y mecanismos para evitar que las empresas accedan a datos de contacto privados de los candidatos.

---

## 2. Arquitectura actual

- **Framework Web:** Next.js 16.3.6 con React 19.2.8 y TypeScript 5 (App Router).
- **Estilos y Diseño:** Tailwind CSS v4 con `@tailwindcss/postcss`. Tokens de diseño basados en la identidad municipal de Funes definidos en `app/globals.css`.
- **Iconografía:** Componentes SVG codificados a mano en `components/ui/Icons.tsx` (pendiente estandarización con `lucide-react`).
- **Base de Datos & Auth:** Supabase PostgreSQL con RLS y Storage (`postulantes-cvs`). Actualmente desconectado en el frontend.
- **Migraciones SQL:** Carpeta `migrations/` con control cronológico:
  - `000_baseline_inicial.sql`: Estado base histórico (tablas en inglés, no ejecutable).
  - `001_adaptar_esquema_existente.sql`: Adaptación al esquema real en español (`perfil`, `empresas`, `ofertas`, `postulaciones`, `rubros`, `historial_postulacion`, `seguimiento`).
- **Estructura de Directorios:**
  - `app/`: Rutas públicas (`/`, `/ofertas`, `/ofertas/[id]`, `/login`, `/registro`).
  - `components/jobs/`: Componentes del catálogo y detalle de ofertas.
  - `components/layout/`: Barra de navegación (`Navbar`), pie de página (`Footer`), escudo oficial (`MunicipalLogo`), barra lateral (`AppSidebar`).
  - `components/ui/`: Botones, inputs, badges y cards básicos.
  - `context/`: `AuthContext.tsx` con manejo de estado en `localStorage`.
  - `lib/`: `jobs.ts` con datos de prueba (`MOCK_JOBS`, `MOCK_COMPANIES`, `MOCK_RUBROS`).
  - `types/`: `database.ts` con tipos TypeScript del esquema de base de datos.
  - `docs/`: Requerimientos funcionales (`requerimientos.md`) y Design System (`DESIGN_SYSTEM_PORTAL_MUNICIPAL_EMPLEO.md`).

---

## 3. Funcionalidades actuales

- [x] **Landing Page Pública:** Presentación institucional, explicación del rol de intermediación de la Oficina de Empleo, sección de cómo funciona y enlaces a ofertas.
- [x] **Catálogo Público de Ofertas:** Listado de ofertas de empleo con filtrado reactivo en cliente (por búsqueda de texto, rubro, jornada, zona de Funes y destacadas) y sincronización con parámetros de URL (`?q=...&rubro=...`).
- [x] **Ficha de Detalle de Oferta:** Información detallada del puesto, requisitos, ubicación, jornada, vacantes, botón de compartir y ofertas similares.
- [x] **Modal de Postulación Simulado:** Validación de formulario básico en cliente y generación de número de trámite ficticio guardado en `localStorage`.
- [x] **Modal de Autenticación Requerida:** Intercepta la postulación cuando el usuario no ha iniciado sesión, solicitando ingreso o registro.
- [x] **Autenticación Mock/Demo:** Formulario de login y registro que permite simular sesiones con perfiles demo (`postulante`, `empresa`, `municipalidad`, `admin`) almacenados en `localStorage`.
- [x] **Tokens de Diseño Institucional:** Paleta de colores oficial de la Municipalidad de Funes (`brand-900`, `brand-800`, `brand-100`, etc.) configurada en `globals.css`.

---

## 4. Funcionalidades pendientes

- [ ] **Conexión Real con Supabase:** Instalación de dependencias oficiales (`@supabase/supabase-js`, `@supabase/ssr`), creación de clientes cliente/servidor y configuración de `.env.local`.
- [ ] **Extensión del Modelo de Datos (Migración 002):**
  - Tabla de múltiples CVs por postulante (`curriculums` / `postulante_cvs`) con límite de 5 activos, nombre identificatorio y borrado lógico.
  - Asociación obligatoria del CV utilizado en cada postulación (`postulaciones.cv_id`).
  - Tabla de cursos y capacitaciones (`cursos`, `postulante_cursos`) para derivaciones municipales.
  - Estados de aprobación de empresas (`estado_empresa`: pendiente, aprobada, rechazada con motivo).
  - Estado `retirado_por_postulante` en el enum de postulaciones.
  - Blindaje de datos sensibles: vista segura para empresas que oculte DNI, teléfono, dirección y correo electrónico.
  - Distinción entre Administrador Completo y Administradores Operativos.
- [ ] **Autenticación Real con Supabase Auth:** Registro seguro con envío de metadatos, inicio de sesión por email/contraseña, recuperación de contraseña y sincronización con la tabla `perfil`.
- [ ] **Middleware de Control de Acceso (App Router):** Protección de rutas y redirección según rol autenticado (`postulante`, `empresa`, `municipalidad`/`admin`).
- [ ] **Portal de Postulantes (`/postulante`):**
  - Perfil laboral completo (datos personales, residencia en Funes, barrio, nivel educativo, habilidades).
  - Administrador de CVs: subida a bucket privado de Supabase Storage, asignación de nombres, límite de 5 activos y archivado lógico.
  - Historial de postulaciones con estados de avance en tiempo real.
  - Acción de retiro voluntario de una postulación con confirmación modal.
  - Sección de capacitaciones y cursos asignados.
- [ ] **Portal de Empresas (`/empresa`):**
  - Registro empresarial con CUIT, razón social, ubicación y contacto (ingreso en estado "Pendiente").
  - Pantalla informativa de estado de cuenta (pendiente de validación o rechazada con motivo explicativo).
  - Publicación y gestión de ofertas: borrador, envío a revisión, solicitud de baja con motivo.
  - Panel de candidatos presentados por la Oficina de Empleo (sin datos de contacto privados).
  - Acciones sobre candidatos: aceptar o rechazar (con motivo obligatorio), y registro del candidato contratado para cierre de oferta.
- [ ] **Portal de la Oficina de Empleo / Municipalidad (`/admin`):**
  - Panel general con indicadores clave.
  - Aprobación y rechazo de empresas con motivo.
  - Aprobación y rechazo de ofertas laborales con motivo.
  - Búsqueda y filtrado de postulantes aplicando prioridad para residentes de Funes.
  - Flujo de intermediación: preselección, registro de entrevistas preliminares y derivación formal a empresas.
  - Gestión de cursos de capacitación y derivación de postulantes que requieran formación.
  - Gestión de administradores (exclusivo para Administrador Completo).
  - Métricas y reportes estadísticos de intermediación laboral e inserción local.
- [ ] **Componentes de Sistema de Diseño y Accesibilidad:**
  - `PageContainer`, `PageHeader`, `ConfirmDialog` (para acciones sensibles con motivo), `Table`, `Select`/`Combobox`, `EmptyState`.
  - Reemplazo de SVG manuales por `lucide-react`.
  - Reemplazo de emojis funcionales en categorías por iconografía institucional.

---

## 5. Hallazgos

| ID | Clasificación | Hallazgo | Impacto y Acción Requerida |
|---|---|---|---|
| H-01 | **CRÍTICO** | Exposición de datos personales privados de postulantes en RLS actual | La política `perfil_empresa_select_derivado` de la migración `001` otorga `SELECT` a nivel de fila completa sobre `perfil`. En PostgreSQL RLS no restringe columnas, por lo que una empresa con consultas directas podría leer DNI, teléfono y domicilio. Se requiere crear una vista segura o función RPC con `SECURITY DEFINER` que devuelva únicamente los datos laborales permitidos. |
| H-02 | **CRÍTICO** | Frontend 100% desconectado de Supabase | No existen dependencias `@supabase/supabase-js` ni `@supabase/ssr` en `package.json`. No hay clientes Supabase. Todo corre con `localStorage` y datos simulados. Se debe estructurar la integración base de Supabase antes de implementar paneles. |
| H-03 | **ALTO** | Ausencia del modelo de datos para múltiples CVs | Los requerimientos exigen hasta 5 CVs activos por postulante con nombres identificatorios, archivado lógico y referencia inmutable al CV usado en cada postulación. La base actual solo tiene `perfil.cv_url TEXT`. Se debe crear la tabla `curriculums` y asociarla a `postulaciones`. |
| H-04 | **ALTO** | Ausencia del modelo de Cursos y Capacitaciones | El requerimiento exige una tabla de cursos en base de datos y registro de derivaciones con historial. Actualmente solo existen campos de texto libre en `seguimiento`. Se debe crear la tabla `cursos` y `postulante_cursos`. |
| H-05 | **ALTO** | Falta de estados y motivos de rechazo para Empresas | La tabla `empresas` solo cuenta con `verificada BOOLEAN`. No permite conocer si una empresa está pendiente o rechazada, ni registrar el motivo de rechazo requerido por la Oficina de Empleo. Se debe incorporar columna de estado y motivo. |
| H-06 | **ALTO** | Enum de postulaciones carece del estado de retiro voluntario | El requerimiento 15 y 31.16 establece que un postulante puede darse de baja de una postulación pasando a estado `retirado_por_postulante`. Dicho valor no existe en `application_status`. Intentar guardarlo generaría un error en base de datos. |
| H-07 | **ALTO** | Ausencia de Middleware y protección de rutas | No existe `middleware.ts` en Next.js. Cualquier usuario puede manipular su rol en `localStorage` o acceder a rutas internas sin verificación de sesión o rol real. |
| H-08 | **MEDIO** | Enlaces rotos (404) en la navegación actual | La Landing Page y el Navbar contienen enlaces a `/postulantes`, `/empresas` y `/admin` que actualmente no existen y devuelven 404. |
| H-09 | **MEDIO** | Contradicción con el Design System en iconografía y tokens | El Design System prohíbe el uso de emojis para categorías y exige `lucide-react`. La Landing usa emojis (`🛍️`, `🍽️`, etc.) y `components/ui/Icons.tsx` contiene 450 líneas de SVGs manuales. Además, botones y tarjetas usan clases hardcodeadas (`bg-emerald-700`) en vez de los tokens `--color-brand-*`. |
| H-10 | **MEDIO** | Inexistencia de componente modal reutilizable para acciones sensibles | Las reglas 24 y 31.39 exigen confirmación modal previa para cualquier acción sensible (bajas, rechazos, retiros), solicitando motivo en los casos correspondientes. No existe `ConfirmDialog` reutilizable en el código. |
| H-11 | **BAJO** | Falta de archivo `.env.local` | El repositorio cuenta con `.env.example`, pero no existe `.env.local` configurado en el entorno de trabajo. |
| H-12 | **MEJORA** | Alias redundantes en tipos de datos TypeScript | `types/database.ts` mantiene duplicados en inglés y español (`Job` vs `Oferta`, `Company` vs `Empresa`, `Application` vs `Postulacion`). Conviene estandarizar el dominio para mayor coherencia. |

---

## 6. Reglas generales de implementación

1. **Trabajo estricto por Fases:** No se comenzará una fase sin antes haber completado y validado los criterios de aceptación de la fase anterior.
2. **Prioridad a la intermediación y privacidad:** La base completa de postulantes nunca debe ser visible para empresas. Las empresas solo visualizan candidatos presentados por la Oficina de Empleo y sin datos de contacto privados (DNI, teléfono, dirección, correo).
3. **Prioridad para residentes de Funes:** En todos los listados de preselección municipal y filtros de ofertas, la residencia en Funes es un criterio de prioridad visible y funcional.
4. **Historial y Trazabilidad inmutables:** No se realiza borrado físico (`DELETE`) sobre ofertas con postulaciones, postulaciones registradas ni CVs utilizados en procesos históricos. Se utiliza borrado lógico y versionado.
5. **Confirmación obligatoria para acciones sensibles:** Toda acción que implique eliminar, rechazar, dar de baja o desvincular debe solicitar confirmación mediante un modal (`ConfirmDialog`) y registrar el motivo correspondiente en base de datos.
6. **Migraciones SQL acumulativas y manuales:** Las migraciones deben estar numeradas cronológicamente (`002_...`, `003_...`), ser incrementales y estar preparadas para su ejecución manual desde el SQL Editor de Supabase sin alterar migraciones históricas previas.
7. **Alineación con el Design System:** Se deben utilizar tokens de diseño (`brand-900`, `brand-800`, etc.), iconografía estándar (`lucide-react`), tipografía Geist y superficies limpias sin sobrecargar de verde.

---

## 7. Fases de implementación

---

### FASE 1 — Infraestructura Base, Supabase Client y Dependencias de UI

#### Objetivo
Establecer los cimientos técnicos de la aplicación: instalar dependencias requeridas, configurar el cliente de Supabase (SSR y Client) y construir los componentes base faltantes del Design System.

#### Alcance
- **Incluye:** Instalación de `@supabase/supabase-js`, `@supabase/ssr` y `lucide-react`. Creación de utilidades cliente y servidor para Supabase (`lib/supabase/`). Creación del archivo de variables `.env.local` (plantilla local). Implementación de componentes UI base: `ConfirmDialog`, `PageContainer`, `PageHeader`, `EmptyState`. Adaptación de `Button`, `Badge` e `Input` a los tokens de diseño institucional.
- **NO incluye:** Creación de páginas de dashboards, modificación de lógica de base de datos ni autenticación real.

#### Tareas
1. Instalar dependencias necesarias: `@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`.
2. Crear utilidades de conexión a Supabase:
   - `lib/supabase/client.ts` (navegador / Client Components).
   - `lib/supabase/server.ts` (Server Components, Server Actions y Route Handlers con cookies seguras).
3. Crear plantilla y configuración de entorno `.env.local` con las variables públicas y de servidor correspondientes.
4. Desarrollar componentes UI compartidos del Design System:
   - `components/ui/ConfirmDialog.tsx`: Modal accesible con soporte para confirmación simple y campo de motivo obligatorio.
   - `components/ui/EmptyState.tsx`: Estado vacío estándar con icono, título, descripción y acción opcional.
   - `components/layout/PageContainer.tsx`: Contenedor responsive estándar para páginas internas (`max-w-7xl`, padding uniforme).
   - `components/layout/PageHeader.tsx`: Cabecera unificada con título, descripción y barra de acciones.
5. Refactorizar `components/ui/Button.tsx` y `components/ui/Badge.tsx` para usar estrictamente los tokens del Design System (`--color-brand-800`, `variant="destructive"`, etc.).
6. Reemplazar los SVGs manuales de `components/ui/Icons.tsx` por exportaciones homogéneas de `lucide-react`.

#### Archivos o áreas involucradas
- `package.json`
- `.env.local`, `.env.example`
- `lib/supabase/client.ts`, `lib/supabase/server.ts`
- `components/ui/Button.tsx`, `components/ui/Badge.tsx`, `components/ui/Icons.tsx`
- `components/ui/ConfirmDialog.tsx`, `components/ui/EmptyState.tsx`
- `components/layout/PageContainer.tsx`, `components/layout/PageHeader.tsx`

#### Base de datos
No requiere cambios directos en Supabase. Se verifican las variables de conexión (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

#### Dependencias
Ninguna (fase inicial).

#### Resultado esperado
El proyecto cuenta con las dependencias necesarias, el cliente de Supabase listo para usarse y los componentes base del Design System para construir las siguientes pantallas sin duplicar código.

#### Criterios de aceptación
- `npm run build` compila sin errores.
- `npm run lint` pasa sin advertencias.
- Las utilidades de Supabase exportan clientes funcionales para cliente y servidor.
- `ConfirmDialog` permite abrirse, cerrarse, solicitar texto de motivo y devolver la confirmación.

#### Pruebas
- Verificar compilación TypeScript.
- Renderizar un componente con `ConfirmDialog` y validar el comportamiento accesible y de validación de motivo.

#### Riesgos y consideraciones
- Compatibilidad de Next.js 16 con el paquete `@supabase/ssr`. Utilizar la API documentada basada en `cookies` asíncronas de Next.js.

---

### FASE 2 — Extensión del Modelo de Datos (Migración 002) y Tipos

#### Objetivo
Alinear la base de datos de Supabase con todos los requerimientos funcionales documentados mediante una nueva migración SQL incremental (`002`) y actualizar las definiciones TypeScript.

#### Alcance
- **Incluye:** Redacción de la migración `migrations/002_extension_requerimientos_funcionales.sql` que incorpora: tabla de múltiples CVs (límite 5 activos y borrado lógico), asociación de CV a postulaciones, tabla de cursos y postulante_cursos, estados y motivo de rechazo de empresas, estado `retirado_por_postulante`, roles de administrador, vista segura de candidatos para empresas, y actualización de `types/database.ts`.
- **NO incluye:** Creación de páginas o componentes frontend.

#### Tareas
1. Crear el archivo `migrations/002_extension_requerimientos_funcionales.sql` con:
   - **Múltiples CVs:** Tabla `public.curriculums` vinculada a `perfil(id)` con campos `id`, `postulante_id`, `nombre_cv`, `archivo_url`, `es_principal`, `activo`, `created_at`, `updated_at`, `deleted_at`. Trigger para validar límite de 5 activos por postulante.
   - **Postulaciones:** Agregar columna `cv_id REFERENCES public.curriculums(id)` y `cv_url_snapshot TEXT` en `public.postulaciones`. Agregar valor `retirado_por_postulante` al enum `application_status`.
   - **Cursos y Capacitaciones:** Tabla `public.cursos` (id, titulo, descripcion, institucion, duracion, activo, created_at) y tabla `public.postulante_cursos` (id, postulante_id, curso_id, asignado_por, fecha_asignacion, estado, observaciones).
   - **Empresas:** Agregar enum `estado_empresa` (`pendiente`, `aprobada`, `rechazada`) y columnas `estado`, `motivo_rechazo`, `revisado_por`, `fecha_revision`.
   - **Rechazo de Candidatos por Empresas:** Agregar columnas `motivo_rechazo_empresa TEXT`, `fecha_rechazo_empresa TIMESTAMPTZ` a `public.postulaciones`.
   - **Administradores:** Columna `es_admin_general BOOLEAN DEFAULT false` en `perfil` con regla para impedir que exista menos de un administrador completo.
   - **Vista Segura de Candidatos:** Crear la vista `public.vista_candidatos_empresa` con `SECURITY DEFINER` que exponga únicamente: nombre, apellido, localidad, barrio, nivel educativo, habilidades, resumen laboral, CV asociado y estado de postulación, excluyendo terminantemente DNI, teléfono, dirección y correo electrónico.
   - **Políticas RLS:** Políticas para `curriculums`, `cursos`, `postulante_cursos` y ajuste sobre las vistas.
   - Registro en `_schema_migrations`.
2. Actualizar exhaustivamente `types/database.ts` para reflejar todas las nuevas tablas, columnas, vistas y relaciones.

#### Archivos o áreas involucradas
- `migrations/002_extension_requerimientos_funcionales.sql`
- `types/database.ts`

#### Base de datos
- Tablas creadas: `curriculums`, `cursos`, `postulante_cursos`.
- Tablas modificadas: `empresas`, `postulaciones`, `perfil`.
- Vistas creadas: `vista_candidatos_empresa`.
- Enums ampliados: `application_status`, `estado_empresa`.
- RLS y Triggers correspondientes.

#### Dependencias
Haber concluido la Fase 1.

#### Resultado esperado
Un script SQL listo para ser ejecutado manualmente en Supabase que cubre el 100% de las necesidades del modelo de datos, y tipos TypeScript sincronizados para el desarrollo posterior.

#### Criterios de aceptación
- La migración SQL es sintácticamente válida para PostgreSQL 15+.
- Respeta la nomenclatura en español preexistente (`perfil`, `empresas`, `ofertas`, etc.).
- Las políticas RLS no permiten a las empresas consultar tablas o datos no autorizados.
- `types/database.ts` compila sin errores.

#### Pruebas
- Validación sintáctica de la consulta SQL.
- Comprobación de tipos en TypeScript (`npm run lint`).

#### Riesgos y consideraciones
- Notificar al usuario que la migración `002` debe ser ejecutada manualmente en el SQL Editor de Supabase antes de continuar con la Fase 3.

---

### FASE 3 — Autenticación Real, Sesiones y Middleware de Roles

#### Objetivo
Reemplazar la autenticación simulada por el flujo real de Supabase Auth, integrando registro, login, cierre de sesión, persistencia de perfil y protección de rutas mediante Middleware de Next.js.

#### Alcance
- **Incluye:** Integración de Supabase Auth en `app/login/page.tsx` y `app/registro/page.tsx`. Creación de `middleware.ts` para proteger rutas por rol. Refactorización de `AuthContext.tsx` para sincronizar con la sesión de Supabase Auth y cargar el perfil de la base de datos.
- **NO incluye:** Paneles de usuario completos (se implementan en las fases 5, 6 y 7).

#### Tareas
1. Configurar el disparador `handle_new_user` en Supabase para sincronizar metadatos de usuario con la tabla `perfil`.
2. Refactorizar `app/login/page.tsx`:
   - Conectar con `supabase.auth.signInWithPassword`.
   - Manejo de errores amigable en español.
   - Redirección automática según el rol del perfil (`postulante` → `/postulante`, `empresa` → `/empresa`, `municipalidad`/`admin` → `/admin`).
3. Refactorizar `app/registro/page.tsx`:
   - Registro de postulante conectando con `supabase.auth.signUp`.
   - Inserción/actualización de datos del perfil inicial.
4. Crear flujo de registro específico para empresas en `app/registro/empresa/page.tsx` (solicitando CUIT, razón social, dirección, contacto).
5. Crear `middleware.ts`:
   - Refrescar la sesión de Supabase en cada request usando `@supabase/ssr`.
   - Proteger rutas privadas:
     - `/postulante/*` accesible solo para `postulante`.
     - `/empresa/*` accesible solo para `empresa`.
     - `/admin/*` accesible solo para `municipalidad` o `admin`.
   - Redirigir usuarios no autenticados al login con parámetro `?redirect=...`.
6. Adaptar `context/AuthContext.tsx` para proveer el usuario real de Supabase, su perfil de base de datos y helpers de conveniencia (`logout`, etc.).

#### Archivos o áreas involucradas
- `app/login/page.tsx`
- `app/registro/page.tsx`, `app/registro/empresa/page.tsx`
- `middleware.ts`
- `context/AuthContext.tsx`
- `components/layout/Navbar.tsx` (actualizar estado autenticado y redirección a sus respectivos paneles)

#### Base de datos
- `auth.users` y tabla `public.perfil`.
- Triggers de creación de usuarios.

#### Dependencias
Haber concluido la Fase 1 y ejecutado la migración de la Fase 2.

#### Resultado esperado
Los usuarios pueden registrarse e iniciar sesión de forma real y segura. El sistema identifica su rol en base de datos y el middleware bloquea accesos no autorizados a rutas protegidas.

#### Criterios de aceptación
- Un postulante puede registrarse y loguearse con email y contraseña.
- Una empresa puede registrarse y queda en estado `pendiente`.
- El middleware impide que un postulante entre a `/admin` o `/empresa`, y viceversa.
- El cierre de sesión destruye la sesión tanto en cookies como en cliente.

#### Pruebas
- Prueba manual de registro y login de postulante.
- Prueba manual de registro de empresa.
- Prueba de acceso forzado a ruta no permitida para verificar redirección.

#### Riesgos y consideraciones
- En desarrollo local, se debe contar con las credenciales reales de Supabase configuradas en `.env.local`.

---

### FASE 4 — Catálogo Público y Ficha de Ofertas Conectado a Supabase

#### Objetivo
Conectar el flujo público de ofertas laborales con la base de datos real de Supabase, reemplazando los datos en memoria por consultas a la tabla `ofertas` y optimizando la Landing Page.

#### Alcance
- **Incluye:** Refactorización de `lib/jobs.ts` para consultar las ofertas reales en Supabase (`estado = 'publicada'`). Consulta de rubros activos desde la tabla `rubros`. Limpieza de emojis en la Landing Page (`app/page.tsx`). Corrección de enlaces rotos en Landing, Navbar y Footer.
- **NO incluye:** Flujo de postulación autenticado con selección de CV múltiple (Fase 5).

#### Tareas
1. Refactorizar `lib/jobs.ts` para utilizar `createClient` de Supabase:
   - `getJobs()`: consulta ofertas con filtros de búsqueda, rubro, jornada, ordenadas por destacadas y fecha de creación.
   - `getJobById(id)`: consulta oferta por ID con joins a `empresas` (nombre de fantasía) y `rubros`.
   - `getRubros()`: consulta rubros activos.
   - `getSimilarJobs(id, rubroId)`: ofertas similares públicas.
2. Actualizar `app/ofertas/page.tsx` y `app/ofertas/[id]/page.tsx` como Server Components con SSR o ISR según corresponda.
3. Actualizar `JobCard.tsx` y `JobDetailView.tsx` para reflejar con claridad el aviso de prioridad para residentes de Funes establecido en los requerimientos.
4. Refactorizar la Landing Page (`app/page.tsx`):
   - Reemplazar emojis en categorías por iconos Lucide correspondientes.
   - Mostrar ofertas destacadas reales desde Supabase.
   - Corregir enlaces hacia los nuevos paneles (`/postulante`, `/empresa`, `/admin`).
5. Actualizar `Navbar.tsx` y `Footer.tsx` para que los enlaces apunten a rutas existentes.

#### Archivos o áreas involucradas
- `lib/jobs.ts`
- `app/page.tsx`
- `app/ofertas/page.tsx`, `app/ofertas/[id]/page.tsx`
- `components/jobs/JobCard.tsx`, `components/jobs/JobCatalogView.tsx`, `components/jobs/JobDetailView.tsx`
- `components/layout/Navbar.tsx`, `components/layout/Footer.tsx`

#### Base de datos
- Consultas `SELECT` sobre `ofertas`, `empresas`, `rubros` mediante políticas RLS públicas.

#### Dependencias
Haber concluido las Fases 1, 2 y 3.

#### Resultado esperado
Cualquier visitante puede navegar el portal, ver las ofertas publicadas reales desde Supabase, filtrarlas y ver su detalle sin errores ni enlaces rotos.

#### Criterios de aceptación
- Las ofertas mostradas provienen directamente de la tabla `ofertas` en Supabase.
- Solo se muestran ofertas con `estado = 'publicada'` y `deleted_at IS NULL`.
- No hay errores de consola ni enlaces que den 404.
- La Landing Page cumple con el Design System (sin emojis funcionales).

#### Pruebas
- Cargar ofertas de prueba en Supabase y verificar su aparición inmediata en el catálogo público.
- Probar filtros combinados (texto + rubro + jornada).

#### Riesgos y consideraciones
- Asegurar que la política RLS `ofertas_public_select_published` esté activa y funcionando correctamente para usuarios anónimos.

---

### FASE 5 — Área de Postulante: Perfil, Múltiples CVs y Postulaciones

#### Objetivo
Desarrollar el área privada completa para las personas que buscan empleo: gestión del perfil laboral, administración de hasta 5 CVs con subida a Supabase Storage y borrado lógico, y módulo de postulaciones con selección inmutable de CV y opción de retiro voluntario.

#### Alcance
- **Incluye:** Páginas bajo `/postulante`:
  - `/postulante/perfil`: Datos personales, residencia en Funes, barrio, experiencia y competencias.
  - `/postulante/cvs`: Carga y gestión de hasta 5 CVs (PDF/DOCX), nombre identificatorio, archivado lógico.
  - `/postulante/postulaciones`: Historial con estado de avance, fecha, CV usado y botón de darse de baja.
  - `/postulante/capacitaciones`: Cursos asignados por la Oficina de Empleo.
  - Refactorización de `JobApplyModal`: selector obligatorio del CV activo a utilizar.
- **NO incluye:** Paneles de empresa ni de la Oficina de Empleo.

#### Tareas
1. Crear el layout del postulante en `app/postulante/layout.tsx` con navegación interna (`AppSidebar` o tabs).
2. Desarrollar `app/postulante/perfil/page.tsx`:
   - Formulario de edición de datos personales, teléfono, dirección, barrio y residencia en Funes.
   - Datos laborales: nivel educativo, situación laboral actual, disponibilidad y habilidades.
3. Desarrollar `app/postulante/cvs/page.tsx`:
   - Listado de CVs activos (máximo 5).
   - Componente de subida de archivo a Supabase Storage (bucket `postulantes-cvs`).
   - Campo para nombre identificatorio (ej: "CV Comercial", "CV Administrativo").
   - Acción para archivar CV con modal de confirmación (`ConfirmDialog`), aplicando borrado lógico (`activo = false`, `deleted_at = now()`).
4. Refactorizar el modal de postulación `JobApplyModal.tsx`:
   - Cargar los CVs activos del usuario.
   - Exigir la selección de uno de sus CVs para postularse.
   - Registrar la postulación en la tabla `postulaciones` con `cv_id` y snapshot.
   - Impedir postularse más de una vez a la misma oferta activa.
5. Desarrollar `app/postulante/postulaciones/page.tsx`:
   - Listado histórico de postulaciones con badges de estado (`postulado`, `en_revision`, `preseleccionado`, etc.).
   - Visualización del CV que se utilizó en esa postulación específica.
   - Botón "Darse de baja": abre `ConfirmDialog` con solicitud de motivo y actualiza el estado a `retirado_por_postulante`.
6. Desarrollar `app/postulante/capacitaciones/page.tsx`:
   - Consulta de cursos en los que el postulante fue inscripto o derivado por la Oficina de Empleo.

#### Archivos o áreas involucradas
- `app/postulante/*`
- `components/jobs/JobApplyModal.tsx`
- `components/postulante/*` (CVManager, ApplicationsList, ProfileForm)
- Storage bucket `postulantes-cvs`

#### Base de datos
- Tablas: `perfil`, `curriculums`, `postulaciones`, `historial_postulacion`, `postulante_cursos`.
- Storage: `postulantes-cvs`.

#### Dependencias
Haber concluido las Fases 1, 2, 3 y 4.

#### Resultado esperado
El postulante dispone de un entorno completo para mantener su perfil, cargar hasta 5 CVs, postularse eligiendo qué CV enviar, ver su historial de avance y retirarse voluntariamente si lo desea.

#### Criterios de aceptación
- No se permite cargar un 6to CV si ya existen 5 activos.
- Al archivar un CV, no se elimina de la base de datos física y las postulaciones históricas siguen asociadas a él.
- El usuario solo puede postularse si tiene al menos un CV cargado.
- El retiro de una postulación cambia el estado a `retirado_por_postulante` y queda registrado en el historial.

#### Pruebas
- Subir 5 CVs y verificar que el sistema bloquee el sexto.
- Archivar un CV y verificar que quede inactivo.
- Postularse a una oferta seleccionando un CV y verificar la persistencia en `postulaciones`.
- Darse de baja de una postulación y comprobar la actualización de estado.

#### Riesgos y consideraciones
- Políticas de Storage en Supabase: validar que el usuario solo pueda subir archivos a su propia carpeta (`auth.uid()`).

---

### FASE 6 — Área de Empresa: Registro, Gestión de Ofertas y Candidatos

#### Objetivo
Implementar el portal exclusivo para empresas: ciclo de aprobación de la empresa, creación y gestión de ofertas laborales, y recepción/evaluación confidencial de candidatos presentados por la Oficina de Empleo.

#### Alcance
- **Incluye:** Rutas bajo `/empresa`:
  - `/empresa/perfil`: Datos de la empresa, CUIT, contacto, y estado de verificación.
  - `/empresa/estado`: Pantalla informativa si la cuenta está pendiente o fue rechazada con motivo.
  - `/empresa/ofertas`: Listado de ofertas propias con sus respectivos estados (Borrador, Pendiente, Publicada, Rechazada, Finalizada).
  - `/empresa/ofertas/nueva` y `/empresa/ofertas/[id]/editar`: Formulario de creación/edición de oferta (guardar borrador o enviar a revisión).
  - `/empresa/ofertas/[id]/candidatos`: Visualización segura de candidatos preseleccionados por la Oficina de Empleo (sin datos de contacto privados).
  - Acciones sobre candidatos: Aceptar o rechazar (con modal y motivo obligatorio), y marcar candidato contratado para finalizar la oferta.
- **NO incluye:** Acceso a la base completa de postulantes (estrictamente restringido por intermediación).

#### Tareas
1. Crear el layout de empresa en `app/empresa/layout.tsx` con verificación del estado de la empresa:
   - Si `estado === 'pendiente'`, redirigir o mostrar pantalla de aviso.
   - Si `estado === 'rechazada'`, mostrar motivo de rechazo y permitir corregir información.
2. Desarrollar `app/empresa/perfil/page.tsx`:
   - Visualización y edición de datos comerciales y de contacto.
3. Desarrollar `app/empresa/ofertas/page.tsx`:
   - Tabla con ofertas de la empresa, vacantes, fecha de creación y estado.
   - Acción de dar de baja oferta publicada con modal de confirmación y motivo.
   - Acción de eliminar borrador o eliminar oferta pendiente.
4. Desarrollar `app/empresa/ofertas/nueva/page.tsx` y edición:
   - Formulario completo de oferta: título, rubro, descripción, requisitos, experiencia, tipo de jornada, tipo de contrato, vacantes, fecha límite.
   - Opciones: "Guardar como Borrador" o "Enviar a Revisión de la Oficina de Empleo".
   - Restricción: la empresa no puede pasar una oferta directamente a "Publicada".
5. Desarrollar `app/empresa/ofertas/[id]/candidatos/page.tsx`:
   - Consulta a la vista segura `vista_candidatos_empresa`.
   - Visualización de candidatos que tengan estado `presentado_a_empresa`, `seleccionado` o `contratado`.
   - Acceso al CV correspondiente mediante URL firmada de Supabase Storage.
   - Verificación de que no se muestren datos personales (DNI, teléfono, email, dirección).
6. Implementar acciones sobre el candidato presentado:
   - Botón "Aceptar / Avanzar": actualiza estado a `seleccionado`.
   - Botón "Rechazar candidato": abre `ConfirmDialog` requiriendo motivo de rechazo obligatorio y guarda en `motivo_rechazo_empresa` y en historial.
   - Botón "Registrar contratación": marca al candidato como `contratado` y permite finalizar la oferta laboral.

#### Archivos o áreas involucradas
- `app/empresa/*`
- `components/empresa/*` (CompanyOffersTable, CandidateEvaluationCard, JobOfferForm)

#### Base de datos
- Tablas: `empresas`, `ofertas`, `postulaciones`, `historial_postulacion`.
- Vistas: `vista_candidatos_empresa`.

#### Dependencias
Haber concluido las Fases 1, 2, 3, 4 y 5.

#### Resultado esperado
La empresa puede registrarse, gestionar sus ofertas a través de la revisión municipal, consultar únicamente a los candidatos que la Oficina de Empleo le presentó, y registrar el resultado de contratación o rechazo con motivo.

#### Criterios de aceptación
- Una empresa en estado pendiente o rechazada no puede publicar ofertas.
- Una oferta en estado pendiente no puede ser editada por la empresa.
- La empresa no puede ver candidatos con estado `postulado` ni `preseleccionado` (solo los presentados formalmente).
- La empresa no puede ver DNI ni datos de contacto de ningún postulante.
- El rechazo de un candidato exige ingresar un motivo obligatorio.

#### Pruebas
- Crear una oferta como borrador y luego enviarla a revisión.
- Comprobar que una oferta en revisión no permita edición.
- Evaluar a un candidato presentado y registrar rechazo con motivo.
- Marcar candidato contratado y finalizar la oferta.

#### Riesgos y consideraciones
- Garantizar que las URLs firmadas del CV no expongan rutas públicas sin vencimiento.

---

### FASE 7 — Área de Oficina de Empleo / Municipalidad: Intermediación y Gestión

#### Objetivo
Construir el centro operativo de la Oficina de Empleo: revisión y aprobación de empresas, revisión y publicación de ofertas, motor de búsqueda y preselección de postulantes con prioridad para residentes de Funes, derivación formal a empresas, gestión de cursos y administración de usuarios.

#### Alcance
- **Incluye:** Rutas bajo `/admin`:
  - `/admin/dashboard`: Resumen de tareas pendientes (empresas por revisar, ofertas por aprobar, postulaciones por procesar).
  - `/admin/empresas`: Listado y ficha de empresas; acciones para aprobar o rechazar con motivo.
  - `/admin/ofertas`: Listado de todas las ofertas; acciones para aprobar (publicar), rechazar con motivo o dar de baja.
  - `/admin/postulantes`: Búsqueda avanzada y filtrado de la base completa de postulantes con destaque de prioridad Funes.
  - `/admin/ofertas/[id]/postulaciones`: Gestión del embudo de selección por oferta (revisión, preselección, entrevistas, derivación formal a la empresa).
  - `/admin/capacitaciones`: Catálogo de cursos y asignación de postulantes que necesitan capacitación.
  - `/admin/administradores`: Gestión de administradores operativos (solo accesible para el Administrador Completo).
- **NO incluye:** Estadísticas profundas y auditoría de métricas (Fase 8).

#### Tareas
1. Crear el layout de administración en `app/admin/layout.tsx` con navegación institucional y verificación de rol `municipalidad` o `admin`.
2. Desarrollar `app/admin/dashboard/page.tsx`:
   - Tarjetas de acción rápida: Empresas pendientes de validación, Ofertas pendientes de revisión, Postulaciones sin revisar.
3. Desarrollar `app/admin/empresas/page.tsx`:
   - Filtros por estado (`pendiente`, `aprobada`, `rechazada`).
   - Modal para aprobar empresa o rechazar con motivo explicativo (`ConfirmDialog`).
4. Desarrollar `app/admin/ofertas/page.tsx`:
   - Filtros por estado (`pendiente_revision`, `publicada`, `finalizada`, etc.).
   - Acción "Aprobar y Publicar": cambia estado a `publicada`, registra revisor y fecha.
   - Acción "Rechazar oferta": requiere motivo y notifica a la empresa.
   - Acción "Dar de baja": permite a la Municipalidad retirar una oferta pública con motivo.
5. Desarrollar `app/admin/postulantes/page.tsx`:
   - Buscador general de postulantes con filtros por localidad (prioridad Funes automática), rubro de interés, nivel educativo y habilidades.
   - Ficha completa del postulante con acceso a datos de contacto, historial de postulaciones y cursos asignados.
6. Desarrollar el flujo de selección en `app/admin/ofertas/[id]/postulaciones/page.tsx`:
   - Visualización de todos los postulantes anotados en la oferta.
   - Indicador visual destacado: **Residente de Funes (Prioridad)**.
   - Acciones de cambio de estado:
     - Marcar "En revisión".
     - Marcar "Preseleccionado".
     - Registrar "Entrevista preliminar" con notas confidenciales de la Oficina de Empleo.
     - "Presentar a Empresa" (derivar formalmente): actualiza a `presentado_a_empresa`, registrando fecha y orientador responsable.
7. Desarrollar `app/admin/capacitaciones/page.tsx`:
   - Alta y listado de cursos en la tabla `cursos`.
   - Asignación de postulantes a cursos con registro de motivo de derivación.
8. Desarrollar `app/admin/administradores/page.tsx`:
   - Verificación estricta: solo visible y operable si el usuario es Administrador Completo (`es_admin_general === true`).
   - Alta de administradores operativos y baja de cuentas.
   - Restricción: impedimento de darse de baja a sí mismo y de dejar al sistema sin ningún Administrador Completo.

#### Archivos o áreas involucradas
- `app/admin/*`
- `components/admin/*` (CompaniesReviewTable, OffersReviewTable, ApplicantsFilter, SelectionFunnel, CoursesManager)

#### Base de datos
- Tablas: `perfil`, `empresas`, `ofertas`, `postulaciones`, `historial_postulacion`, `cursos`, `postulante_cursos`, `seguimiento`.
- Políticas RLS completas para rol `admin` y `municipalidad`.

#### Dependencias
Haber concluido las Fases 1, 2, 3, 4, 5 y 6.

#### Resultado esperado
La Oficina de Empleo cuenta con el control total para intermediar: revisa empresas y ofertas, preselecciona postulantes dando prioridad a los vecinos de Funes, presenta los perfiles adecuados a las empresas, asigna capacitaciones y gestiona su equipo de trabajo.

#### Criterios de aceptación
- Ninguna oferta creada por empresa aparece pública sin la aprobación previa de la Oficina de Empleo.
- El panel destaca claramente a los postulantes residentes de Funes.
- Al derivar un candidato, este pasa a estar visible para la empresa correspondiente.
- El rechazo de empresas u ofertas exige ingresar un motivo.
- Solo el Administrador Completo puede gestionar otros administradores.

#### Pruebas
- Flujo completo de aprobación de empresa y oferta.
- Postular un usuario de Funes y uno de otra localidad; verificar el orden de prioridad visual.
- Derivar un postulante a la empresa y verificar que aparezca en el panel de dicha empresa.
- Probar que un administrador operativo no pueda acceder a `/admin/administradores`.

#### Riesgos y consideraciones
- Asegurar que las notas confidenciales de la Oficina de Empleo (`notas_oficina_empleo`) nunca se transmitan a los componentes del portal de empresas.

---

### FASE 8 — Estadísticas, Seguimiento y Trazabilidad Histórica

#### Objetivo
Implementar el módulo de estadísticas e indicadores de gestión laboral para la Municipalidad, y blindar la trazabilidad histórica de todas las entidades del sistema.

#### Alcance
- **Incluye:** Página `/admin/estadisticas`. Consultas y métricas agregadas en tiempo real. Registro de seguimiento posterior a la contratación (`seguimiento`). Verificación de que no existan borrados en cascada que destruyan datos históricos de ofertas, postulaciones o CVs.
- **NO incluye:** Nuevos flujos transaccionales.

#### Tareas
1. Desarrollar `app/admin/estadisticas/page.tsx`:
   - Cantidad total de postulantes registrados (residentes de Funes vs otras localidades).
   - Cantidad de ofertas laborales creadas, aprobadas y finalizadas.
   - Cantidad total de postulaciones procesadas.
   - Cantidad de candidatos derivados/presentados a empresas.
   - Cantidad de contrataciones efectivas registradas en el portal.
   - Cantidad de postulantes derivados a cursos de capacitación.
   - Distribución de ofertas y contrataciones por rubro o sector laboral.
2. Desarrollar `app/admin/seguimiento/page.tsx`:
   - Registro de seguimiento post-contratación sobre personas que consiguieron empleo.
   - Detección y registro de necesidades de capacitación en el puesto.
3. Auditoría de integridad referencial:
   - Verificar que al dar de baja una oferta, las postulaciones e historial queden intactos.
   - Verificar que al archivar un CV, las postulaciones sigan referenciando el registro archivado sin inconsistencias.

#### Archivos o áreas involucradas
- `app/admin/estadisticas/page.tsx`
- `app/admin/seguimiento/page.tsx`
- `lib/stats.ts`
- `components/admin/StatsCharts.tsx`

#### Base de datos
- Consultas agregadas sobre `perfil`, `ofertas`, `postulaciones`, `seguimiento`, `cursos`.

#### Dependencias
Haber concluido las Fases 1 a 7.

#### Resultado esperado
La Municipalidad de Funes puede evaluar el impacto de su política de empleo mediante datos precisos y cuantitativos, y el sistema garantiza una trazabilidad histórica completa.

#### Criterios de aceptación
- Las estadísticas reflejan fielmente los registros de la base de datos.
- Se diferencia correctamente el volumen de vecinos de Funes respecto a otras localidades.
- La baja o finalización de procesos no elimina datos históricos.

#### Pruebas
- Verificar concordancia entre los conteos de la base de datos y las métricas del dashboard.

#### Riesgos y consideraciones
- Optimizar consultas estadísticas mediante índices o funciones agregadas en PostgreSQL para evitar sobrecarga en la base de datos.

---

### FASE 9 — Blindaje de UI/UX, Accesibilidad, Responsive y Confirmaciones Sensibles

#### Objetivo
Realizar una revisión exhaustiva de la interfaz de usuario en todas las vistas del proyecto para asegurar el cumplimiento estricto del Design System, la accesibilidad web (a11y), la experiencia en dispositivos móviles y la presencia de modales de confirmación en todas las acciones críticas.

#### Alcance
- **Incluye:** Revisión integral de todas las páginas de los tres portales (Postulante, Empresa, Municipalidad) y públicas. Unificación de botones, badges, modales y tablas. Verificación de diseño responsive (mobile, tablet, desktop). Verificación de accesibilidad y navegación por teclado.
- **NO incluye:** Cambios en el modelo de base de datos ni nuevas reglas de negocio.

#### Tareas
1. Integración universal de `ConfirmDialog`:
   - Dar de baja una oferta (solicitar motivo).
   - Rechazar una empresa (solicitar motivo).
   - Rechazar una oferta (solicitar motivo).
   - Rechazar un candidato presentado (solicitar motivo).
   - Darse de baja de una postulación (solicitar motivo).
   - Archivar un CV.
   - Dar de baja un administrador.
2. Revisión de contraste y tokens:
   - Eliminar cualquier clase de color HEX o clases Tailwind no estandarizadas (`emerald-*` directas sustituidas por variables de marca).
   - Asegurar legibilidad del escudo oficial sobre fondos oscuros y contrastes correctos en badges.
3. Adaptación responsive de tablas complejas:
   - Implementar vistas de tarjeta (card layout) para tablas en pantallas móviles de menos de 768px.
4. Accesibilidad (a11y):
   - Focus visible en todos los elementos interactivos.
   - Etiquetas `aria-label` en botones que contienen solo iconos.
   - Validación semántica de formularios y asociación de labels con inputs.

#### Archivos o áreas involucradas
- Todos los componentes y vistas del proyecto.

#### Base de datos
Ninguno.

#### Dependencias
Haber concluido las Fases 1 a 8.

#### Resultado esperado
La aplicación presenta una interfaz consistente, institucional, moderna, accesible y totalmente funcional tanto en teléfonos móviles como en computadoras de escritorio.

#### Criterios de aceptación
- Todas las acciones sensibles despliegan `ConfirmDialog` antes de ejecutarse.
- Los tres perfiles de usuario comparten el mismo lenguaje visual.
- El sitio es 100% operable en pantallas de 375px de ancho.
- No se observan textos cortados ni desbordamientos horizontales.

#### Pruebas
- Prueba en emulador móvil (Chrome DevTools / Firefox Responsive View).
- Navegación completa solo mediante teclado (Tab, Enter, Escape).

#### Riesgos y consideraciones
- Evitar que los modales queden bloqueados o no cierren con la tecla Escape.

---

### FASE 10 — Pruebas Integrales, Optimización y Preparación para Producción

#### Objetivo
Ejecutar un ciclo de control de calidad integral de extremo a extremo, verificar la seguridad y las políticas RLS en Supabase, optimizar el rendimiento del build y preparar la documentación para el despliegue.

#### Alcance
- **Incluye:** Pruebas de integración de todos los flujos de usuario. Auditoría de seguridad de RLS y almacenamiento. Verificación del build de producción (`npm run build`). Documentación de variables de entorno y guía de despliegue.
- **NO incluye:** Nuevas funcionalidades.

#### Tareas
1. Prueba integral de extremo a extremo (E2E manual):
   - **Flujo 1:** Postulante se registra → sube 2 CVs → consulta oferta → se postula eligiendo CV 1 → consulta estado → se retira.
   - **Flujo 2:** Empresa se registra → queda pendiente → Municipio la aprueba → Empresa carga oferta borrador → la envía a revisión → Municipio la aprueba → oferta queda pública.
   - **Flujo 3:** Municipio revisa postulaciones de la oferta → prioriza postulante de Funes → registra entrevista → deriva candidato a empresa → Empresa evalúa y registra contratación → Oferta finaliza.
2. Auditoría de seguridad RLS:
   - Probar consultas simulando token de empresa para verificar que no pueda leer `SELECT * FROM perfil`.
   - Probar que un postulante no pueda descargar CVs ajenos de Supabase Storage.
3. Verificación de rendimiento y optimización:
   - Revisión de advertencias en `npm run build`.
   - Optimización de imágenes (`next/image`) y fuentes Geist.
4. Preparación de documentación final:
   - Actualización de `README.md` con instrucciones claras de puesta en marcha, migraciones de base de datos y despliegue.

#### Archivos o áreas involucradas
- Todo el repositorio.
- `README.md`

#### Base de datos
- Verificación de políticas RLS y roles en producción.

#### Dependencias
Haber concluido las Fases 1 a 9.

#### Resultado esperado
La plataforma se encuentra completamente probada, segura, optimizada y lista para entrar en operación en el entorno de producción de la Municipalidad de Funes.

#### Criterios de aceptación
- `npm run build` compila con 0 errores y 0 advertencias críticas.
- `npm run lint` pasa con 0 errores.
- Todos los flujos de los tres tipos de usuarios funcionan de punta a punta.
- No existen fugas de privacidad en las políticas RLS.

#### Pruebas
- Matriz de pruebas completa cubriendo todos los casos de uso principales y casos límite.

#### Riesgos y consideraciones
- Asegurar el correcto seteo de las variables de entorno de producción en el proveedor de hosting (ej. Vercel o servidor municipal).

---

## 8. Dependencias entre fases

El desarrollo sigue un orden estrictamente dependiente de la arquitectura y la lógica de negocio:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 1: Infraestructura Base, Supabase Client y Dependencias de UI     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 2: Extensión del Modelo de Datos (Migración 002) y Tipos TS       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 3: Autenticación Real, Sesiones y Middleware de Roles             │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 4: Catálogo Público y Ficha de Ofertas Conectado a Supabase       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 5: Área de Postulante (Perfil, Múltiples CVs y Postulaciones)    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 6: Área de Empresa (Registro, Gestión de Ofertas y Candidatos)    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 7: Área de Oficina de Empleo / Municipalidad (Intermediación)     │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 8: Estadísticas, Seguimiento y Trazabilidad Histórica            │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 9: Blindaje de UI/UX, Accesibilidad, Responsive y Confirmaciones  │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 10: Pruebas Integrales, Optimización y Preparación para Producción│
└────────────────────────────────────────────────────────────────────────┘
```

### Tabla de dependencias

| Fase | Título | Fases Requeridas Previas |
|---|---|---|
| **Fase 1** | Infraestructura Base, Supabase Client y UI | Ninguna (Inicio) |
| **Fase 2** | Extensión del Modelo de Datos y Tipos TS | Fase 1 |
| **Fase 3** | Autenticación Real y Middleware de Roles | Fase 1, Fase 2 |
| **Fase 4** | Catálogo Público Conectado a Supabase | Fase 1, Fase 2, Fase 3 |
| **Fase 5** | Área de Postulante (Perfil, CVs, Postulaciones) | Fase 1, Fase 2, Fase 3, Fase 4 |
| **Fase 6** | Área de Empresa (Ofertas, Candidatos) | Fase 1, Fase 2, Fase 3, Fase 4, Fase 5 |
| **Fase 7** | Área de Oficina de Empleo (Intermediación) | Fase 1, Fase 2, Fase 3, Fase 4, Fase 5, Fase 6 |
| **Fase 8** | Estadísticas y Trazabilidad | Fase 1 a Fase 7 |
| **Fase 9** | Blindaje UI/UX, Accesibilidad y Modales | Fase 1 a Fase 8 |
| **Fase 10**| Pruebas Integrales y Preparación para Producción | Fase 1 a Fase 9 |

---

## 9. Checklist general

- [x] **Fase 1** — Infraestructura Base, Supabase Client y Dependencias de UI
- [ ] **Fase 2** — Extensión del Modelo de Datos (Migración 002) y Tipos
- [ ] **Fase 3** — Autenticación Real, Sesiones y Middleware de Roles
- [ ] **Fase 4** — Catálogo Público y Ficha de Ofertas Conectado a Supabase
- [ ] **Fase 5** — Área de Postulante: Perfil, Múltiples CVs y Postulaciones
- [ ] **Fase 6** — Área de Empresa: Registro, Gestión de Ofertas y Candidatos
- [ ] **Fase 7** — Área de Oficina de Empleo / Municipalidad: Intermediación y Gestión
- [ ] **Fase 8** — Estadísticas, Seguimiento y Trazabilidad Histórica
- [ ] **Fase 9** — Blindaje de UI/UX, Accesibilidad, Responsive y Confirmaciones Sensibles
- [ ] **Fase 10** — Pruebas Integrales, Optimización y Preparación para Producción

---

## 10. Estado de avance

- **Fase actual:** Fase 1 (Completada).
- **Estado:** Finalizada con éxito. Lista para avanzar a Fase 2 a requerimiento del usuario.
- **Fecha de inicio:** 2026-10-07.
- **Fecha de finalización:** 2026-10-07.
- **Observaciones:** Dependencias instaladas (`@supabase/supabase-js`, `@supabase/ssr`, `lucide-react`). Clientes de Supabase para navegador y servidor creados en `lib/supabase/`. Componentes base de UI y Layout creados (`ConfirmDialog`, `EmptyState`, `PageContainer`, `PageHeader`). Botones, badges e iconografía estandarizados con tokens del Design System y Lucide. Compilación TypeScript y linting validados con 0 errores.


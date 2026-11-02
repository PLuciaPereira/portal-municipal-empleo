# Portal Municipal de Empleo — Municipalidad de Funes

Plataforma web oficial para la gestión, vinculación e intermediación laboral entre la ciudadanía y el sector productivo de la ciudad de Funes y su región metropolitana.

---

## 🏛️ Presentación y Propósito

El **Portal Municipal de Empleo de Funes** es una iniciativa de modernización impulsada para centralizar y hacer más transparente el proceso de inserción laboral en la ciudad.

Históricamente, los procesos de intermediación dependían de la recepción dispersa de currículums en papel, correos electrónicos o mensajes de mensajería, volcados manualmente en planillas de cálculo. Esta plataforma digitaliza y estructura todo el circuito:

- **Intermediación Pública y Gratuita:** La Oficina de Empleo actúa como nexo activo, garantizando igualdad de oportunidades y acompañamiento profesional.
- **Prioridad a la Comunidad Local:** Prioriza a los vecinos residentes de Funes en los procesos de preselección laboral, promoviendo el desarrollo y empleo local.
- **Privacidad y Protección de Datos:** Las empresas no tienen acceso abierto a la base general de postulantes. Solo acceden a los perfiles formalmente derivados y preseleccionados por la Oficina de Empleo para una búsqueda específica, preservando la confidencialidad de los vecinos.
- **Trazabilidad Integral:** Cada etapa del proceso (publicación de oferta, postulación, derivación, entrevista y contratación) queda registrada y auditable.

---

## 🔗 Enlaces del Proyecto

| Recurso | Enlace / Estado |
| :--- | :--- |
| **Repositorio GitHub** | [https://github.com/PLuciaPereira/portal-municipal-empleo](https://github.com/PLuciaPereira/portal-municipal-empleo) |
| **Aplicación en Producción (Vercel)** | `[Completar con URL de despliegue en Vercel, ej: https://portal-empleo-funes.vercel.app]` |

---

## 👥 Funcionalidades Principales por Rol

El sistema organiza sus servicios según tres tipos de usuarios con responsabilidades e interfaces diferenciadas:

### 1. Postulante (Ciudadano)
- **Acceso público y registro simple:** Consulta del catálogo de ofertas de empleo activas con filtros por rubro, modalidad y palabras clave.
- **Perfil laboral integral:** Carga de datos de contacto, educación, experiencia laboral, habilidades y situación de residencia (con validación de residencia en Funes).
- **Gestión de Currículums Múltiples:** Capacidad de almacenar hasta 5 CVs distintos en PDF o Word para postularse según el perfil requerido por cada búsqueda.
- **Postulación y seguimiento:** Postulación ágil a búsquedas activas y panel personal para conocer el estado de sus postulaciones o retirar su candidatura de forma voluntaria.

### 2. Empresa / Empleador
- **Registro institucional:** Solicitud de alta sujeta a revisión y homologación por parte de la Oficina de Empleo.
- **Publicación de ofertas laborales:** Formulario guiado para dar de alta solicitudes de puestos, requisitos, condiciones de contratación y ubicación.
- **Gestión de búsquedas:** Panel de control para consultar el estado de sus ofertas (pendientes, aprobadas, pausadas o finalizadas).
- **Recepción de candidatos preseleccionados:** Visualización de los postulantes formalmente derivados por el equipo municipal para cada búsqueda, con herramientas para registrar el estado de contacto (en evaluación, entrevistado, contratado o no seleccionado).

### 3. Oficina de Empleo (Municipalidad de Funes)
- **Centro de Control Municipal:** Aprobación o rechazo fundamentado de nuevas empresas y ofertas laborales antes de su publicación.
- **Intermediación y Preselección:** Búsqueda y filtrado de candidatos en la base municipal aplicando criterios de idoneidad y prioridad para residentes locales, conformando ternas derivadas formalmente a cada empresa.
- **Capacitación y Formación Continua:** Registro y administración de cursos y capacitaciones municipales, permitiendo derivar postulantes para mejorar su empleabilidad.
- **Estadísticas de Gestión:** Indicadores e informes sobre volumen de búsquedas, postulaciones registradas, perfiles derivados y contrataciones concretadas.

---

## 🛠️ Tecnologías Utilizadas

El proyecto fue desarrollado utilizando estándares modernos de desarrollo web, priorizando rendimiento, seguridad y experiencia de usuario:

| Tecnología | Versión | Rol en el Proyecto |
| :--- | :--- | :--- |
| **Next.js** | `16.3.6` | Framework principal full-stack (App Router, optimización de rutas y renderizado del lado del servidor). |
| **React** | `19.2.8` | Biblioteca de interfaces de usuario interactivas, basada en componentes reutilizables. |
| **TypeScript** | `5` | Tipado estático robusto para garantizar estabilidad, mantenibilidad y prevención de errores. |
| **Tailwind CSS** | `4` | Sistema de diseño y estilizado moderno, adaptado a la identidad visual y colores institucionales de Funes. |
| **Supabase** | `2.117.3` | Backend como servicio: base de datos PostgreSQL, autenticación de usuarios y almacenamiento de archivos (CVs). |
| **Row Level Security (RLS)** | *PostgreSQL* | Reglas de seguridad a nivel de base de datos para asegurar el aislamiento estricto de la información de los postulantes. |
| **Lucide React** | `1.52.0` | Iconografía clara y consistente en todos los módulos del sistema. |
| **GitHub** | — | Alojamiento de código fuente y control de versiones colaborativo. |
| **Vercel** | — | Plataforma de integración continua y despliegue en la nube. |

---

## 🔑 Usuarios de Demostración

Para la evaluación del sistema se han dispuesto cuentas de prueba precargadas con datos y configuradas para cada rol:

| Rol / Perfil | Correo Electrónico | Contraseña | Descripción / Alcance |
| :--- | :--- | :--- | :--- |
| **👤 Postulante** | `postulante@funes.com` | `Funes2026!` | Juan Pérez (Residente en Funes, perfil laboral completo, carga de CVs y postulaciones). |
| **🏢 Empresa** | `empresa@funes.com` | `Funes2026!` | Empresa Funes SRL (Gestión y publicación de ofertas, seguimiento de candidatos derivados). |
| **🏛️ Oficina de Empleo** | `administracion@funes.com` | `Funes2026!` | Administración Municipal (Homologación de empresas/ofertas, preselección con prioridad Funes y métricas). |


> Estas credenciales están destinadas exclusivamente a instancias de evaluación académica, demostración y pruebas funcionales de la plataforma.

---

## 🧭 Guía Rápida para Probar el Sistema

1. **Ingreso general:** Acceda a la URL del portal publicado. En la página de inicio podrá visualizar las búsquedas laborales vigentes.
2. **Exploración de ofertas:** Utilice el buscador para filtrar ofertas por rubro o tipo de puesto e ingrese al detalle de cualquiera de ellas.
3. **Inicio de sesión:** Presione en el botón **"Ingresar"** en la barra superior y utilice alguna de las cuentas de prueba proporcionadas según el rol que desee evaluar.
4. **Navegación según rol:**
   - Como **Postulante**, ingrese a *"Mi Perfil"* y *"Mis Postulaciones"*.
   - Como **Empresa**, acceda a *"Mis Ofertas"* para ver las búsquedas activas y candidatos presentados.
   - Como **Municipalidad**, ingrese al módulo de administración para explorar las solicitudes pendientes, las ternas de candidatos y las métricas.

---

## 💻 Instrucciones para Ejecución Local

Si desea clonar y ejecutar el entorno de desarrollo en su equipo local:

### Requisitos Previos
- **Node.js** (versión 20.x o superior recomendada)
- Gestor de paquetes **npm** (incluido con Node.js)
- Un proyecto configurado en **Supabase** con las tablas y esquemas correspondientes

### Pasos de Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/PLuciaPereira/portal-municipal-empleo.git
   cd portal-municipal-empleo
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar las variables de entorno:**  
   Cree un archivo `.env.local` en la raíz del proyecto tomando como plantilla `.env.example`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anonima-publica
   SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role-privada
   ```

4. **Iniciar el servidor local:**
   ```bash
   npm run dev
   ```
   Abra su navegador en [http://localhost:3000](http://localhost:3000) para acceder a la aplicación.

---

## 👥 Equipo de Desarrollo y Contexto Institucional

- **Institución / Organismo:** Funes Tech Lab- Beex
- **Área:** Oficina de Empleo
- **Desarrollador:** Lucia Pereira
- **Año:** 2026

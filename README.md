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
| **Aplicación en Producción (Vercel)** | https://portal-municipal-empleo-pd67-9fm5lt8p1-lutech.vercel.app |

---

## 👥 Funcionalidades Principales por Rol (Requisitos Mínimos del MVP)

El sistema organiza sus servicios según tres tipos de usuarios con responsabilidades e interfaces diferenciadas, cumpliendo integralmente con los flujos obligatorios solicitados:

### 1. Postulante (Ciudadano)
- **Acceso público y registro simple:** Consulta del catálogo público de ofertas de empleo activas con filtros por rubro, modalidad y palabras clave.
- **Perfil laboral integral:** Carga de datos de contacto, educación, experiencia laboral, habilidades y situación de residencia (con validación de residencia en Funes). Permite seleccionar múltiples categorías laborales de interés.
- **Gestión de Currículums Múltiples:** Capacidad de almacenar hasta 5 CVs distintos en PDF o Word en Supabase Storage, seleccionando el más conveniente para cada postulación.
- **Postulación y seguimiento:** Postulación a vacantes activas y panel personal con historial completo de postulaciones, derivaciones, resultados y motivo en caso de no selección, con opción de retiro voluntario de candidaturas.

### 2. Empresa / Empleador
- **Registro institucional:** Solicitud de alta sujeta a revisión y homologación por parte de la Oficina de Empleo.
- **Publicación y administración de ofertas laborales:** Formulario guiado para dar de alta solicitudes de puestos, requisitos, condiciones de contratación, jornada y ubicación. Ciclo de vida completo: creación, guardado en borrador, envío a revisión, consulta y cierre de ofertas.
- **Gestión y decisión sobre candidatos derivados:** Acceso restringido exclusivamente a postulantes formalmente derivados por el equipo municipal para cada búsqueda. Registro de la decisión final obligatoria: **Contratado** o **No contratado** (con motivo de rechazo explícito y obligatorio).
- **Aislamiento y confidencialidad:** El acceso a los datos de contacto y CV finaliza automáticamente cuando concluye el proceso o el candidato se retira.

### 3. Oficina de Empleo (Municipalidad de Funes)
- **Centro de Control y Homologación:** Aprobación o rechazo fundamentado de nuevas empresas y ofertas laborales antes de su publicación.
- **Intermediación y Búsqueda de Postulantes:** Búsqueda y filtrado de candidatos en la base municipal por rubro y categoría laboral, aplicando criterios de idoneidad y prioridad para residentes locales.
- **Coordinación de Preentrevistas y Derivación Formal:** Posibilidad de registrar instancias de preentrevista previas a la derivación (instancia opcional registrada formalmente) y derivación de ternas de candidatos idóneos a las empresas solicitantes.
- **Gestión de Cursos y Capacitación Continua:** Registro de cursos y talleres municipales, derivación de postulantes para fortalecer sus competencias laborales y consulta de antecedentes de capacitación asignados.
- **Trazabilidad y Reglas de Seguimiento:** Historial unificado por postulante con registro de todas sus postulaciones, derivaciones, resultados y conteo acumulado de rechazos.

---

## 🚀 Funcionalidades Adicionales respecto del MVP

### 1. Tablero Ejecutivo Municipal con Datos Reales
- **Panel Analítico en Tiempo Real (`AdminStatsView`):** Dashboard administrativo conectado directamente a la base de datos de Supabase a través de consultas agregadas en `lib/stats.ts`, sin datos estáticos ni simulados.
- **Indicadores Clave de Gestión (KPIs):** Monitoreo continuo de más de 12 métricas reales:
  - Total de postulantes registrados.
  - Padrón local discriminado: Residentes de Funes vs. otras localidades, con **cálculo automático del porcentaje de absorción comunitaria** (prioridad local).
  - Estado de las ofertas: Publicadas, pendientes de revisión, borradores, finalizadas y dadas de baja.
  - Embudo de intermediación municipal: Postulaciones en revisión, preseleccionados, entrevistas registradas, derivados a empresas, rechazados con motivo, contrataciones efectivas y retiros voluntarios.
  - Indicadores del programa de capacitación: Total de cursos, cursos activos y postulantes derivados a formación.
  - Gestión corporativa: Total de empresas, aprobadas, pendientes y rechazadas.
- **Mapeo Multidimensional por Rubro Económico:** Matriz analítica cruzada que relaciona la cantidad de ofertas generadas con las **contrataciones efectivas concretadas por cada sector productivo**, permitiendo al Municipio evaluar el impacto socioeconómico real en el territorio.

### 2. Módulo de Inclusión Digital y Registro Asistido Presencial
- **Superación de la Brecha Digital:** Diseñado para la atención en ventanilla municipal de personas mayores o con dificultades de acceso a herramientas informáticas.
- **Alta Presencial de Legajos (`ManualProfileRegister`):** Permite al operador municipal registrar el perfil completo, datos educativos, disponibilidad horaria, adjuntar CV o foto y dejar constancia auditable del administrador que asistió al vecino (`registro_asistido = true`).

### 3. Vinculación e Invitación Proactiva a Vacantes
- **Sugerencia Institucional de Empleo (`InviteToJobModal`):** Permite a los agentes de la Oficina de Empleo vincular activamente vacantes publicadas con perfiles calificados del padrón, enviándoles una invitación interna formal que orienta e incentiva su postulación.

### 4. Coordinación Integral y Agendamiento de Entrevistas
- **Gestión Completa de Citas (`ScheduleInterviewModal` y `CompanyScheduleInterviewModal`):** Módulo para fijar fecha, hora mediante selector especializado (`TimePicker`), modalidad (presencial, virtual o telefónica), lugar o enlace y notas tanto en sede municipal como en panel empresarial.
- **Flujo de Reprogramación y Cancelación con Motivo:** Persistencia histórica de cancelaciones y reprogramaciones justificadas, notificando al postulante.

### 5. Ciclo de Subsanación Comercial con Historial de Revisiones (RPC)
- **Reenvío Seguro de Solicitud de Empresa Rechazada:** Procedimiento almacenado (`reenviar_solicitud_empresa`) bajo `SECURITY DEFINER` que permite a una empresa rechazada corregir su razón social, datos comerciales o documentación y volver a solicitar homologación municipal.
- **Trazabilidad y Auditoría:** Almacena los motivos y fechas de revisiones anteriores en una estructura `JSONB` (`historial_revisiones`) e impone un límite estricto de hasta 3 reenvíos para evitar saturación operativa.

### 6. Reactivación Controlada de Postulaciones Retiradas (RPC)
- **Flexibilidad con Seguridad:** Si un postulante retiró voluntariamente su candidatura a una oferta que sigue activa, puede reactivarla mediante la función transaccional `reactivar_postulacion`.
- **Actualización de CV y Blindaje Histórico:** Permite actualizar el currículum seleccionado para esa postulación, manteniendo inalterables las postulaciones cerradas o contratadas.

### 7. Centro de Notificaciones y Avisos Preventivos In-App
- **Centro Interactivo de Avisos (`NotificationBell`):** Componente de campana con contador dinámico de no leídos y actualización periódica en segundo plano.
- **Trazabilidad de Eventos:** Notificaciones automáticas ante homologación de ofertas, citaciones a entrevistas, derivaciones formales e invitaciones a vacantes.
- **Detección Preventiva de Desactualización de CV:** Algoritmo que examina la antigüedad de los archivos adjuntos y sugiere al ciudadano actualizar su CV si transcurrieron más de 180 días desde su última carga.

### 8. Seguridad Algorítmica, RLS en Profundidad y UX
- **Validación Matemática Oficial de CUIT:** Algoritmo de Módulo 11 en frontend y backend para impedir altas de empresas con identificadores tributarios apócrifos o inválidos.
- **Políticas RLS Estrictas y Snapshots Inmutables:** Los CVs adjuntos a una postulación quedan capturados en snapshot histórico inmutable (`cv_url_snapshot`). Las vistas de candidatos aplican `SECURITY INVOKER`, garantizando que ninguna empresa pueda consultar datos privados sin una derivación formal vigente.
- **Editor Enriquecido de Ofertas (`RichTextToolbar`):** Soporte de formato Markdown rápido (negritas, listas y viñetas) en las descripciones y requisitos de puestos para mayor legibilidad ciudadana.
- **Renovación Rápida de Vigencia (+30 Días):** Función RPC `renovar_oferta_empresa` que extiende la publicación por 30 días corridos de forma controlada.

---

## 🛠️ Tecnologías Utilizadas

El proyecto fue desarrollado utilizando estándares modernos de desarrollo web, priorizando rendimiento, seguridad y experiencia de usuario:

| Tecnología | Versión | Rol en el Proyecto |
| :--- | :--- | :--- |
| **Next.js** | `16.3.6` | Framework principal full-stack (App Router, optimización de rutas y Server Actions). |
| **React** | `19.2.8` | Biblioteca de interfaces de usuario interactivas y modulares basada en componentes. |
| **TypeScript** | `5` | Tipado estático robusto para garantizar estabilidad, integridad de modelos y prevención de errores. |
| **Tailwind CSS** | `4` | Sistema de diseño y estilizado moderno, adaptado a la identidad visual de la Municipalidad de Funes. |
| **Supabase** | `2.117.3` | Backend as a Service: base de datos relacional PostgreSQL, autenticación y Supabase Storage para CVs. |
| **PostgreSQL & RLS** | Engine | Procedimientos RPC (`SECURITY DEFINER`), triggers de integridad histórica y Row Level Security estricto. |
| **Lucide React** | `1.52.0` | Iconografía accesible, clara y consistente en todos los módulos del sistema. |
| **GitHub** | — | Alojamiento de código fuente y control de versiones colaborativo. |
| **Vercel** | — | Plataforma de integración continua y despliegue en la nube en alta disponibilidad. |

---

## 🔑 Usuarios de Demostración

Para la evaluación del sistema se han dispuesto cuentas de prueba precargadas con datos y configuradas para cada rol:

| Rol / Perfil | Correo Electrónico | Contraseña | Descripción / Alcance |
| :--- | :--- | :--- | :--- |
| **👤 Postulante** | `postulante@funes.com` | `Funes2026!` | Juan Pérez (Residente en Funes, perfil laboral completo, carga de CVs y postulaciones). |
| **🏢 Empresa** | `empresa@funes.com` | `Funes2026!` | Empresa Funes SRL (Gestión y publicación de ofertas, seguimiento de candidatos derivados). |
| **🏛️ Oficina de Empleo** | `administracion@funes.com` | `Funes2026!` | Administración Municipal (Homologación de empresas/ofertas, preselección con prioridad Funes y métricas). |


---

## 🧭 Guía Rápida para Probar el Sistema

1. **Ingreso general:** Acceda a la URL del portal publicado ([https://portal-municipal-empleo-cung.vercel.app/](https://portal-municipal-empleo-cung.vercel.app/)). En la página de inicio podrá visualizar las búsquedas laborales vigentes.
2. **Exploración de ofertas:** Utilice el buscador para filtrar ofertas por rubro o tipo de puesto e ingrese al detalle de cualquiera de ellas.
3. **Inicio de sesión:** Presione en el botón **"Ingresar"** en la barra superior y utilice alguna de las cuentas de prueba proporcionadas según el rol que desee evaluar.
4. **Navegación según rol:**
   - Como **Postulante**, ingrese a *"Mi Perfil"* y *"Mis Postulaciones"*.
   - Como **Empresa**, acceda a *"Mis Ofertas"* para ver las búsquedas activas y candidatos presentados.
   - Como **Municipalidad**, ingrese al módulo de administración para explorar las solicitudes pendientes, las ternas de candidatos, los cursos de capacitación y el tablero de estadísticas con datos reales.

---

## 👥 Equipo de Desarrollo y Contexto Institucional

- **Institución / Organismo:** Funes Tech Lab — Beex
- **Área:** Oficina de Empleo — Municipalidad de Funes
- **Desarrollador:** Lucia Pereira
- **Año:** 2026

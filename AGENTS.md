<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Instrucciones del proyecto - Portal Funes

## Contexto

Este proyecto es una plataforma web de empleo destinada principalmente a personas de Funes y empresas relacionadas con la ciudad.

La documentación funcional del proyecto se encuentra en la carpeta `docs/`.

Antes de realizar cambios importantes en la funcionalidad, consultar la documentación correspondiente.

## Tecnologías

- Next.js
- TypeScript
- React
- Tailwind CSS
- Supabase
- PostgreSQL

## Reglas de desarrollo

- Mantener el código simple y entendible.
- Utilizar componentes reutilizables.
- Evitar duplicar código.
- Mantener una estructura de carpetas ordenada.
- No instalar nuevas dependencias sin indicarlo previamente.
- No modificar configuraciones importantes sin explicar el motivo.
- No eliminar funcionalidades existentes sin autorización.
- No modificar archivos que no sean necesarios para resolver la tarea.
- Mantener el diseño consistente en todas las páginas.
- Priorizar una interfaz clara y sencilla para usuarios con diferentes niveles de conocimientos tecnológicos.
- La plataforma debe estar pensada para el contexto de Funes.
- Las ofertas laborales son públicas.
- La base completa de postulantes no debe quedar expuesta públicamente.
- La Oficina de Empleo mantiene el rol de intermediación entre empresas y postulantes.

## Antes de modificar el proyecto

Analizar primero la estructura existente y los archivos relacionados con la tarea.

Si existe una funcionalidad similar, reutilizarla en lugar de crear una implementación duplicada.

Después de realizar cambios, explicar brevemente:
1. Qué archivos se modificaron.
2. Qué se cambió.
3. Si se agregaron dependencias.
4. Si hay algo que deba probarse manualmente.
<!-- BEGIN:nextjs-agent-rules -->

**# This is NOT the Next.js you know**

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

## Reglas obligatorias de Git y control de versiones

**El control de versiones de Git es responsabilidad exclusiva del usuario. El agente no tiene autorización para modificarlo.**

- El agente puede consultar el estado del repositorio mediante `git status` cuando sea necesario.
- El agente puede consultar la rama actual mediante `git branch --show-current` cuando sea necesario.
- Puede consultar información de solo lectura para verificar el estado del repositorio, siempre que sea relevante para la tarea.
- **No ejecutar comandos que modifiquen el estado, el historial o la estructura de Git.**
- No crear, cambiar, renombrar ni eliminar ramas.
- No realizar `git add`, `git commit`, `git push` ni `git pull`.
- No ejecutar `git merge`, `git rebase`, `git cherry-pick` ni `git reset`.
- No ejecutar `git checkout` ni `git switch`, ya que pueden cambiar de rama o modificar archivos.
- No ejecutar `git stash`, ni guardar, recuperar o descartar cambios mediante Git.
- No revertir cambios ni restaurar archivos usando comandos de Git.
- No modificar etiquetas, referencias, remotos ni configuraciones de Git.
- No ejecutar comandos destructivos o de limpieza, como `git clean`.
- No realizar operaciones de Git de forma automática, indirecta ni como parte de scripts, tareas o herramientas auxiliares.
- No modificar archivos internos de Git ni ejecutar comandos equivalentes mediante otras herramientas.
- No asumir que el usuario autoriza una operación de Git por el simple hecho de pedir una modificación de código.
- Si una tarea requiere cambiar de rama, crear un commit, recuperar una versión anterior o realizar cualquier otra operación de control de versiones, explicar qué se necesita y dejar que el usuario lo haga manualmente.
- Si detectás cambios previos del usuario en el repositorio, no los sobrescribas ni los elimines. Trabajá únicamente sobre los archivos necesarios para la tarea.
- Antes de una tarea importante, si resulta útil, verificá la rama actual y el estado del repositorio. Esta consulta no autoriza ninguna modificación posterior de Git.

**Regla principal:** el agente puede modificar el código del proyecto según las instrucciones recibidas, pero nunca puede gestionar versiones, ramas, commits ni otros elementos de Git. Todas esas operaciones quedan exclusivamente en manos del usuario.

## Antes de modificar el proyecto

Analizar primero la estructura existente y los archivos relacionados con la tarea.

Si existe una funcionalidad similar, reutilizarla en lugar de crear una implementación duplicada.

Después de realizar cambios, explicar brevemente:

1. Qué archivos se modificaron.
2. Qué se cambió.
3. Si se agregaron dependencias.
4. Si hay algo que deba probarse manualmente.

No realizar operaciones de Git para registrar, publicar, revertir o respaldar los cambios. Si corresponde, indicar al usuario qué pasos puede realizar manualmente.

<!-- agy --dangerously-skip-permissions -->

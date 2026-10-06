# DESIGN SYSTEM — PORTAL MUNICIPAL DE EMPLEO

**Producto:** Portal Municipal de Empleo — Municipalidad de Funes  
**Versión:** 1.0  
**Estado:** Base de diseño aprobable para implementación  
**Stack objetivo:** Next.js + TypeScript + Tailwind CSS + shadcn/ui + Lucide Icons

---

# 1. OBJETIVO

Definir una identidad visual y un conjunto de reglas de interfaz compartidas para todo el Portal Municipal de Empleo.

El sistema debe transmitir una identidad:

- institucional;
- moderna;
- clara;
- accesible;
- confiable;
- consistente entre Postulante, Empresa y Municipalidad.

La interfaz no debe parecer un sistema administrativo antiguo ni trasladar literalmente la estética de una pieza publicitaria.

La identidad municipal se expresa principalmente mediante:

- el verde institucional;
- el escudo;
- la tipografía;
- la composición;
- los componentes compartidos.

---

# 2. ALCANCE

Este Design System aplica a:

- landing pública;
- autenticación;
- área de Postulante;
- área de Empresa;
- área de Municipalidad;
- dashboards;
- perfiles;
- ofertas laborales;
- postulaciones;
- candidatos;
- formularios;
- tablas y listados;
- filtros;
- modales;
- navegación;
- estados y feedback;
- vistas responsive.

## Fuera de alcance

Este documento no define:

- lógica de negocio;
- permisos;
- modelo de datos;
- endpoints;
- flujo funcional detallado de postulaciones;
- contenido editorial definitivo;
- ilustraciones o fotografías de campañas.

---

# 3. PRINCIPIOS VISUALES

## 3.1 Institucional sin sobrecargar

El verde municipal identifica la aplicación, pero no debe ocupar toda la interfaz.

Usar verde principalmente en:

- navegación;
- botones principales;
- elementos activos;
- enlaces relevantes;
- iconografía institucional;
- acentos;
- estados positivos.

Las superficies de trabajo deben permanecer mayormente blancas o gris-verdosas muy claras.

## 3.2 Jerarquía clara

Cada pantalla debe tener una acción principal claramente identificable.

### Evitar

- múltiples botones primarios compitiendo;
- exceso de badges;
- cards dentro de cards sin necesidad;
- bordes fuertes;
- sombras pronunciadas;
- grandes bloques de color sin función.

## 3.3 Un único producto

Postulante, Empresa y Municipalidad usan el mismo Design System.

No crear una paleta diferente para cada rol.

### Pueden cambiar

- navegación;
- contenido;
- acciones;
- estructura del dashboard.

### No deben cambiar

- tipografía;
- botones;
- inputs;
- radios;
- sombras;
- paleta principal;
- lenguaje visual.

---

# 4. IDENTIDAD DE MARCA

## 4.1 Escudo

El escudo blanco de la Municipalidad de Funes se utiliza sobre fondos verdes oscuros.

### Usos recomendados

- sidebar;
- header institucional;
- login;
- footer;
- bloques de marca.

No colocar el escudo blanco directamente sobre fondos blancos o demasiado claros.

## 4.2 Lockup recomendado

Cuando exista espacio:

```text
Escudo Municipalidad de Funes
Portal de Empleo
```

En espacios reducidos se permite utilizar solamente el escudo.

---

# 5. PALETA

La paleta parte de la identidad visual municipal utilizada como referencia.

## 5.1 Brand

| Token | Valor | Uso |
|---|---|---|
| `brand-900` | `#06452B` | navegación, hover fuerte |
| `brand-800` | `#075A36` | primary |
| `brand-600` | `#307A52` | elementos secundarios |
| `brand-400` | `#69BD91` | acentos |
| `brand-100` | `#E3F2E9` | selección y fondos suaves |

## 5.2 Neutrales

| Token | Valor | Uso |
|---|---|---|
| `background` | `#F5F8F6` | fondo general |
| `surface` | `#FFFFFF` | cards, formularios, paneles |
| `border` | `#DCE8E0` | bordes y separadores |
| `foreground` | `#202B26` | texto principal |
| `muted-foreground` | `#66756B` | texto secundario |

## 5.3 Colores semánticos

Los colores semánticos no reemplazan al verde institucional.

Definir tokens independientes:

- `success`
- `warning`
- `danger`
- `info`

No utilizar `brand` para representar errores o advertencias.

---

# 6. TOKENS TAILWIND / CSS

Los componentes no deben contener colores HEX repetidos.

La fuente de verdad debe vivir en los tokens globales.

```css
:root {
  --brand-900: #06452b;
  --brand-800: #075a36;
  --brand-600: #307a52;
  --brand-400: #69bd91;
  --brand-100: #e3f2e9;

  --background: #f5f8f6;
  --surface: #ffffff;
  --border: #dce8e0;

  --foreground: #202b26;
  --muted-foreground: #66756b;

  --primary: #075a36;
  --primary-hover: #06452b;
  --primary-foreground: #ffffff;

  --secondary: #e3f2e9;
  --secondary-foreground: #075a36;

  --radius-sm: 0.5rem;
  --radius-md: 0.625rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
```

Si el proyecto utiliza la configuración moderna de Tailwind/shadcn, estos tokens deben mapearse a sus variables semánticas en la capa global correspondiente.

---

# 7. TIPOGRAFÍA

## 7.1 Familia

Preferencia:

- Geist
- Inter
- sans-serif

No mezclar múltiples familias tipográficas en la aplicación.

## 7.2 Escala recomendada

| Uso | Tamaño | Peso |
|---|---:|---:|
| Display | 36–40 px | 700 |
| H1 | 30–32 px | 700 |
| H2 | 24 px | 600–700 |
| H3 | 20 px | 600 |
| Body | 16 px | 400 |
| Body small | 14 px | 400 |
| Label | 14 px | 500 |
| Caption | 12 px | 400–500 |

En mobile los títulos pueden reducirse un nivel visual cuando sea necesario.

---

# 8. ESPACIADO

Usar la escala estándar de Tailwind siempre que sea posible.

Valores predominantes:

- `4px` — microespaciado;
- `8px` — elementos relacionados;
- `12px` — controles compactos;
- `16px` — separación interna habitual;
- `24px` — grupos/secciones;
- `32px` — bloques principales;
- `48px` — separación de secciones grandes;
- `64px` — secciones de landing.

No introducir valores arbitrarios si existe un token equivalente.

---

# 9. RADIUS

| Elemento | Radius |
|---|---|
| Input | 10 px aprox. |
| Button | 10 px aprox. |
| Card | 12 px |
| Modal | 16 px |
| Badge | pill o 6–8 px según variante |
| Avatar / Icon container | circular o 10–12 px |

Evitar cards excesivamente redondeadas.

---

# 10. SOMBRAS

La interfaz se apoya primero en superficie, borde y espaciado.

Las sombras deben ser discretas.

## Card normal

Borde sutil, sin sombra o con `shadow-sm`.

## Elemento elevado

Usar una sombra moderada solamente para:

- dropdown;
- popover;
- modal;
- command menu;
- elementos flotantes.

No usar sombras fuertes en todas las cards.

---

# 11. LAYOUT

## 11.1 Desktop autenticado

Estructura recomendada:

```text
┌───────────────┬─────────────────────────────────────────┐
│               │ Header / contexto / usuario             │
│   Sidebar     ├─────────────────────────────────────────┤
│               │                                         │
│               │              Page content               │
│               │                                         │
└───────────────┴─────────────────────────────────────────┘
```

## 11.2 Contenido

Ancho máximo recomendado para páginas de contenido:

```text
max-w-7xl
```

Los formularios no deben expandirse innecesariamente a todo el viewport.

## 11.3 PageContainer

Todas las páginas internas deben utilizar un contenedor compartido.

Responsabilidades:

- ancho máximo;
- padding responsive;
- separación vertical;
- alineación.

---

# 12. SIDEBAR

## Apariencia

- fondo `brand-900` o `brand-800`;
- escudo blanco;
- texto blanco o blanco atenuado;
- íconos Lucide;
- item activo claramente visible;
- separadores mínimos.

### Item normal

Fondo transparente.

### Hover

Fondo blanco con baja opacidad.

### Item activo

Debe diferenciarse mediante fondo claro/translúcido y mayor contraste, no únicamente mediante cambio de color del texto.

### Marca

Parte superior:

```text
[Escudo] MUNICIPALIDAD
         DE FUNES
         Portal de Empleo
```

En modo compacto puede quedar únicamente el escudo.

---

# 13. HEADER DE PÁGINA

Componente compartido: `PageHeader`.

Puede contener:

- breadcrumb opcional;
- título;
- descripción;
- acción principal;
- acciones secundarias opcionales.

Ejemplo:

```text
Ofertas laborales                     [+ Nueva oferta]
Gestioná las búsquedas activas de tu empresa.
```

En mobile las acciones pasan debajo del título.

---

# 14. BUTTON

Basado en shadcn/ui Button.

## Variantes

### Primary

- fondo `brand-800`;
- texto blanco;
- hover `brand-900`.

Para la acción principal de la vista.

### Secondary

- fondo `brand-100`;
- texto `brand-800`.

### Outline

- fondo transparente/blanco;
- borde;
- texto principal.

### Ghost

Para acciones de baja jerarquía.

### Destructive

Reservado para acciones destructivas reales.

## Regla

Una sección no debe contener varios botones primary con igual jerarquía salvo que representen acciones equivalentes.

---

# 15. INPUTS

Basados en los componentes de shadcn/ui.

Altura visual consistente.

Cada campo debe tener:

```text
Label
[ Input                         ]
Texto de ayuda / error
```

## Estados

- default;
- hover;
- focus;
- disabled;
- error.

El focus debe ser claramente visible y utilizar el color institucional.

Los errores deben usar el token semántico de error, no verde.

---

# 16. SELECT / COMBOBOX

Usar Select para conjuntos acotados.

Usar Combobox cuando:

- existen muchas opciones;
- se requiere búsqueda;
- se seleccionan categorías extensas.

Para selección múltiple, mostrar elementos seleccionados de manera clara y removible.

---

# 17. CARD

Componente base:

- superficie blanca;
- borde sutil;
- radius 12px;
- padding consistente;
- sombra mínima.

Una card debe agrupar información relacionada.

No utilizar una card solamente para envolver cada texto o métrica.

---

# 18. JOBCARD

Componente específico del Portal.

Estructura recomendada:

```text
┌────────────────────────────────────────────┐
│ [icon/logo]  Desarrollador Frontend        │
│              Empresa                       │
│                                            │
│ 📍 Funes        Jornada completa           │
│                                            │
│ [Tecnología] [React] [Junior]              │
│                                            │
│ Publicada hace 2 días       Ver oferta →   │
└────────────────────────────────────────────┘
```

## Prioridades

1. puesto;
2. empresa;
3. ubicación/modalidad;
4. condiciones relevantes;
5. categorías;
6. antigüedad;
7. acción.

Evitar llenar la card de información secundaria.

---

# 19. CANDIDATECARD

Para Empresa y Municipalidad.

Debe permitir identificar rápidamente:

- nombre;
- categorías laborales;
- información profesional resumida;
- estado de la postulación;
- fecha;
- acción disponible.

No mostrar datos sensibles que no correspondan al contexto o permiso del actor.

---

# 20. BADGE

Usar badges para información breve:

- estado;
- categoría;
- modalidad;
- tipo de jornada.

No convertir párrafos o información extensa en badges.

Los estados deben mantener el mismo color y etiqueta en toda la aplicación.

---

# 21. ESTADOS DE POSTULACIÓN

El Design System debe admitir visualmente los estados funcionales definidos por el producto.

## Regla estricta

El componente visual no inventa estados.

Los estados definitivos deben provenir del dominio.

Cada estado debe tener:

- label;
- color semántico;
- fondo;
- foreground;
- icono opcional.

Centralizar el mapping en un único lugar.

---

# 22. TABLES

Usar tabla cuando el usuario necesite comparar varias entidades por columnas.

Ejemplos:

- gestión municipal;
- empresas;
- ofertas;
- postulaciones administrativas.

## Características

- header diferenciado suavemente;
- filas con altura cómoda;
- hover discreto;
- acciones al extremo derecho;
- empty state;
- loading state;
- paginación cuando corresponda.

En mobile no forzar tablas ilegibles: utilizar cards o una representación responsive definida.

---

# 23. FILTROS

Los filtros deben ubicarse cerca del listado que afectan.

Orden recomendado:

```text
[Buscar........................] [Categoría ▼] [Estado ▼] [Más filtros]
```

Los filtros activos deben ser visibles y fáciles de limpiar.

No esconder filtros básicos detrás de un modal en desktop.

---

# 24. MODAL / DIALOG

Usar Dialog de shadcn/ui.

Estructura:

```text
Título
Descripción opcional

Contenido

Cancelar                Acción
```

No utilizar modales para procesos largos que deberían ser una página.

Las acciones destructivas requieren confirmación explícita.

---

# 25. DASHBOARD

Los dashboards deben priorizar información accionable.

## Municipalidad

Puede incluir:

- postulaciones pendientes de revisión;
- candidatos a derivar;
- empresas pendientes;
- ofertas activas;
- actividad reciente.

## Empresa

Puede incluir:

- ofertas activas;
- candidatos derivados;
- estados recientes;
- acceso a publicar oferta.

## Postulante

Puede incluir:

- postulaciones;
- estado de cada postulación;
- perfil;
- ofertas recientes o relevantes.

Las métricas no deben convertirse en grandes cards sin contexto únicamente para llenar espacio.

---

# 26. LANDING PÚBLICA

La landing puede tener mayor libertad compositiva que el panel administrativo.

Debe mantener:

- paleta;
- tipografía;
- radius;
- botones;
- identidad municipal.

## Estructura visual sugerida

1. Navbar
2. Hero
3. Buscador de ofertas
4. Categorías / accesos
5. Ofertas destacadas o recientes
6. Cómo funciona
7. Bloque institucional
8. Footer

El objetivo visual principal debe ser facilitar el acceso a las ofertas laborales.

---

# 27. LOGIN

El login debe sentirse parte del mismo producto.

## Desktop

```text
┌────────────────────────┬──────────────────────────────┐
│                        │                              │
│ Identidad institucional│          Login              │
│ / mensaje / gráfica    │                              │
│                        │                              │
└────────────────────────┴──────────────────────────────┘
```

En mobile se prioriza el formulario y la marca se simplifica.

### Evitar

- mensajes que asuman género;
- iconografía decorativa difícil de interpretar;
- cards flotantes innecesarias;
- fondos visualmente cargados.

---

# 28. EMPTY STATES

Todo listado debe definir su estado vacío.

Un empty state puede contener:

- icono;
- título;
- explicación breve;
- acción, solamente si existe una acción útil.

Ejemplo:

```text
Todavía no publicaste ofertas

Cuando publiques una búsqueda laboral,
aparecerá en este espacio.

[Publicar una oferta]
```

---

# 29. LOADING

Preferir skeletons que respeten la estructura final.

Evitar spinners grandes como única respuesta para pantallas completas.

Las acciones puntuales pueden usar spinner dentro del botón.

---

# 30. FEEDBACK

Toda mutación debe comunicar resultado.

Usar:

- toast para confirmaciones no bloqueantes;
- error inline para validación;
- alert para información persistente;
- dialog para confirmaciones críticas.

No depender exclusivamente del color para comunicar estados.

---

# 31. ICONOGRAFÍA

Biblioteca estándar:

**Lucide React**

## Reglas

- 16px en controles pequeños;
- 18–20px en navegación;
- 20–24px en acciones destacadas;
- grosor consistente;
- evitar mezclar bibliotecas.

No utilizar emojis como iconos funcionales de producción.

---

# 32. RESPONSIVE

Breakpoints según Tailwind.

## Mobile

- sidebar → navegación móvil;
- grids → una columna;
- acciones de PageHeader → debajo del título;
- cards → ancho completo;
- tablas complejas → representación mobile específica;
- filtros → reordenados sin perder accesibilidad.

## Tablet

Usar 1–2 columnas según contenido.

## Desktop

Aprovechar espacio sin estirar formularios y textos innecesariamente.

---

# 33. ACCESIBILIDAD

Requisitos mínimos:

- contraste suficiente;
- navegación por teclado;
- focus visible;
- labels asociados a campos;
- botones con nombre accesible;
- iconos sin texto con `aria-label`;
- estados no comunicados únicamente por color;
- targets táctiles adecuados;
- HTML semántico.

No eliminar outlines sin proporcionar un reemplazo visible.

---

# 34. COMPONENTES COMPARTIDOS

La aplicación debe priorizar composición sobre duplicación.

Base recomendada:

```text
components/
  ui/
    button
    input
    select
    dialog
    badge
    card
    table
    dropdown-menu
    command
    popover
    tooltip
    skeleton
    alert

  layout/
    AppSidebar
    AppHeader
    PageContainer
    PageHeader

  jobs/
    JobCard
    JobStatusBadge

  candidates/
    CandidateCard

  applications/
    ApplicationStatusBadge

  shared/
    EmptyState
    SearchInput
    FilterBar
    ConfirmDialog
```

Los nombres finales deben respetar las convenciones existentes del repositorio.

No crear duplicados si ya existe un componente equivalente.

---

# 35. REGLAS ESTRICTAS DE IMPLEMENTACIÓN

- Utilizar shadcn/ui como base cuando exista un componente adecuado.
- Utilizar Tailwind para estilos cuando exista una utilidad equivalente.
- No distribuir valores HEX dentro de componentes.
- No duplicar componentes por rol si la diferencia puede resolverse mediante props/composición.
- No crear variantes visuales sin necesidad funcional.
- No usar estilos inline salvo necesidad técnica justificada.
- No mezclar bibliotecas de iconos.
- No usar emojis como iconografía funcional.
- Mantener estados hover, focus, disabled, loading y error.
- Mantener responsive en cada componente.
- No inventar estados de dominio desde UI.
- No modificar la identidad visual según el rol.
- No hacer hardcode de colores de estado en múltiples componentes.
- No agregar animaciones que dificulten la interacción.
- Respetar `prefers-reduced-motion` cuando existan animaciones.
- Antes de crear un componente nuevo, verificar si existe uno reutilizable.

---

# 36. MOTION

La animación debe ser funcional y discreta.

## Permitido

- fade;
- pequeños desplazamientos;
- expansión/colapso;
- feedback de hover;
- transiciones de sidebar;
- aparición de dropdown/popover/dialog.

## Duración habitual

```text
150–250ms
```

Evitar animaciones continuas en áreas administrativas.

---

# 37. CRITERIOS DE ACEPTACIÓN DEL DESIGN SYSTEM

Una implementación se considera alineada cuando:

- utiliza la paleta mediante tokens;
- mantiene verde institucional + superficies claras;
- utiliza componentes compartidos;
- utiliza shadcn/ui como base;
- utiliza Lucide para iconografía;
- conserva jerarquía visual consistente;
- funciona en desktop, tablet y mobile;
- posee estados de interacción completos;
- no duplica componentes sin justificación;
- mantiene el mismo lenguaje visual en los tres roles;
- respeta accesibilidad básica;
- el escudo municipal se utiliza con contraste adecuado;
- las ofertas laborales tienen mayor protagonismo que elementos decorativos.

---

# 38. VALIDACIONES ANTES DE CERRAR UNA PANTALLA

Para cada pantalla verificar:

- ¿Existe un único objetivo visual principal?
- ¿La acción principal es evidente?
- ¿Los componentes ya existen o realmente necesitan crearse?
- ¿Todos los colores provienen de tokens?
- ¿Funciona correctamente en mobile?
- ¿Los estados vacíos están definidos?
- ¿Los estados loading están definidos?
- ¿Los errores están definidos?
- ¿Existe focus visible?
- ¿Las acciones destructivas están claramente diferenciadas?
- ¿La información secundaria compite visualmente con la principal?
- ¿La pantalla mantiene la identidad del Portal de Empleo?

---

# 39. DIRECCIÓN VISUAL FINAL

El Portal Municipal de Empleo debe sentirse como un **producto digital municipal contemporáneo**.

La identidad se construye con:

**verde institucional + blanco + fondos muy claros + tipografía limpia + espaciado generoso + componentes simples + escudo municipal.**

El verde debe identificar y jerarquizar, no cubrir innecesariamente la interfaz.

La landing pública puede ser más expresiva. Las áreas autenticadas deben priorizar claridad, velocidad de lectura y operación.

Postulante, Empresa y Municipalidad deben percibirse como **tres experiencias dentro del mismo sistema**, no como tres aplicaciones distintas.

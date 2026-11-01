# CAD-Viewer (Español)

[English](./README.md) | [简体中文](./README.zh-CN.md) | [日本語](./README.ja.md) | [한국어](./README.ko.md) | [Español](./README.es.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [Čeština](./README.cs.md)

[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-simple-viewer.svg?label=cad-simple-viewer)](https://www.npmjs.com/package/@mlightcad/cad-simple-viewer)
[![npm downloads](https://img.shields.io/npm/dy/@mlightcad/cad-viewer.svg?label=cad-viewer)](https://www.npmjs.com/package/@mlightcad/cad-viewer)

<a href="https://trendshift.io/repositories/16129?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-16129" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/trendshift/repositories/16129/daily?language=TypeScript" alt="mlightcad%2Fcad-viewer | Trendshift" width="250" height="55"/></a>

cad-viewer es un editor de dibujos CAD que funciona `completamente en el navegador, sin depender de ningún servicio backend`. Cada sesión empieza con un dibujo nuevo en blanco; los dibujos no se cargan desde archivos ni se guardan en ellos.
El procesamiento geométrico y el renderizado se realizan directamente en el navegador, lo que hace que cad-viewer sea ideal para el uso sin conexión y los flujos de trabajo sensibles a la privacidad.

- [**🌐 Página de inicio**](https://mlightcad.com/)
- **🌐 Demo en vivo**: [Netlify](https://mlightcad.netlify.app/) · [GitHub Pages](https://mlightcad.github.io/cad-viewer/)
- **🌐 Documentación de la API**: [Read the Docs](https://cad-viewer.readthedocs.io/en/latest/) (versionada) · [Servidor MCP](https://gitmcp.io/mlightcad/cad-viewer)
- [**🌐 Wiki**](https://github.com/mlightcad/cad-viewer/wiki)
- X (Twitter): [@mlightcad](https://x.com/mlightcad)
- YouTube: [@mlightcad](https://www.youtube.com/@mlightcad)
- Medium: [@mlightcad](https://medium.com/@mlightcad)
- DEV.to: [@mlightcad](https://dev.to/mlightcad)
- Juejin(稀土掘金): [@mlightcad](https://juejin.cn/column/7501992214283501579)

## Características

- Renderizado **de alto rendimiento** de dibujos grandes a más de 60 FPS fluidos
- **No requiere backend** — Los archivos se analizan y procesan completamente en el navegador
- **Mayor seguridad de los datos** — Los archivos nunca abandonan su dispositivo, garantizando privacidad total
- **Integración sencilla** — No se necesita configuración de servidor ni infraestructura backend
- Arquitectura modular para una integración fluida con terceros
- **Diseño móvil y gestos táctiles** — Interfaz responsive para teléfono/tableta y gestos táctiles (pellizcar para zoom, arrastrar con un dedo, tocar para seleccionar) integrados en `@mlightcad/cad-simple-viewer`, sin necesidad de una app móvil aparte
- Flujos de trabajo de edición sin conexión y en línea
- Motores de renderizado 3D THREE.js con técnicas avanzadas de optimización
- Diseñado para extensibilidad e integración con plataformas como CMS, Notion y WeChat

## Primeros pasos

### Requisitos previos

- [Node.js](https://nodejs.org/) >= 24
- [pnpm](https://pnpm.io/) >= 10

### Instalación

```bash
git clone https://github.com/mlightcad/cad-viewer.git
cd cad-viewer
pnpm install
```

### Desarrollo

```bash
# Iniciar el visor completo (cad-viewer)
pnpm dev

# O iniciar el visor simple
pnpm dev:simple
```

### Compilación

```bash
pnpm build
```

### Vista previa

```bash
# Vista previa del visor completo
pnpm preview

# Vista previa del visor simple
pnpm preview:simple
```

## Cómo usar

¿Es nuevo en CAD Viewer? La **[guía de usuario](https://mlightcad.com/cad-viewer/docs/)** ofrece instrucciones paso a paso sobre la interfaz del visor, las operaciones en escritorio y táctiles, y las herramientas de marcas y medición.

### Operaciones en navegador de escritorio
- **Seleccionar**: Clic izquierdo en las entidades
- **Acercar/alejar**: Rueda del ratón hacia arriba/abajo
- **Desplazar**: Mantenga pulsado el botón central del ratón y arrastre
- **Borrar**: Seleccione entidades y pulse la tecla `Del`

### Operaciones en navegador de tableta/móvil
- **Seleccionar**: Toque las entidades
- **Zoom**: Pellizco con dos dedos
- **Desplazar**: Arrastre con un dedo

## Sistema de plugins

CAD-Viewer está construido en torno a un **sistema de plugins** modular en [`@mlightcad/cad-simple-viewer`](packages/cad-simple-viewer). Los plugins implementan la interfaz `AcApPlugin` y se enganchan al ciclo de vida del visor mediante `onLoad` / `onUnload`, normalmente para registrar comandos, añadir interfaz de usuario o conectar flujos de exportación/importación.

Cargue los plugins a través de `AcApDocManager.instance.pluginManager` (`loadPlugin`, `registerLazyPlugin` o `plugins.fromConfig` al crear el administrador de documentos). Los plugins admiten **carga diferida**: registre un pequeño stub por adelantado y descargue el paquete pesado solo cuando el usuario ejecute el comando relacionado.

El monorepo incluye varios plugins propios. Cada uno se centra en un aspecto; combínelos según sea necesario. **La instalación, el registro y los detalles de la API están en el README de cada paquete** — consulte los enlaces a continuación.

### Plugins oficiales

| Paquete | Función | Comandos / capacidades |
|---------|------|-------------------------|
| [`@mlightcad/cad-simple-ui-plugin`](packages/cad-simple-ui-plugin) | **Barra de herramientas y paleta de mediciones** para `cad-simple-viewer` (DOM plano, sin Vue/React) | `measurementpanel`, barra de herramientas predeterminada (vista, medición, tema, idioma) |

### `@mlightcad/cad-simple-ui-plugin` — Interfaz de usuario para el visor simple

[`cad-simple-viewer`](packages/cad-simple-viewer) deliberadamente **no incluye interfaz de aplicación** — solo el lienzo y el núcleo CAD. Si incrusta el visor simple en su propia aplicación web y desea una interfaz lista para usar sin adoptar el shell completo basado en Vue de [`cad-viewer`](packages/cad-viewer), **`cad-simple-ui-plugin` es la capa de interfaz prevista**.

Proporciona:

- Una **barra de herramientas configurable** (colocación en cualquier borde, comandos CAD predeterminados, menús anidados, elementos personalizados)
- Un **panel acoplable** con pestaña de **mediciones**
- **Sincronización de tema** con la sysvar `COLORTHEME` y los tokens CSS `--ml-ui-*` en su elemento host
- **Sincronización de idioma** con `AcApI18n` (inglés / chino / checo / turco)

Todos los widgets son independientes del framework (DOM plano). La aplicación completa de Vue [`cad-viewer`](packages/cad-viewer) tiene su propia interfaz Element Plus y no requiere este plugin; use `cad-simple-ui-plugin` cuando construya directamente sobre `cad-simple-viewer`.

→ **Inicio rápido, personalización de la barra de herramientas y opciones:** [packages/cad-simple-ui-plugin/README.md](packages/cad-simple-ui-plugin/README.md)

## Rendimiento

CAD-Viewer está diseñado para un **rendimiento excepcional** y puede manejar dibujos muy grandes manteniendo altas tasas de fotogramas. Emplea múltiples tecnologías avanzadas de renderizado para optimizar el rendimiento:

- **Materiales de shader personalizados**: Utiliza materiales de shader acelerados por GPU para renderizar tipos de línea complejos y patrones de sombreado de forma eficiente
- **Agrupación de geometría**: Fusiona puntos, líneas y áreas con el mismo material para reducir drásticamente las draw calls
- **Renderizado instanciado**: Optimiza el renderizado de geometrías repetidas mediante técnicas de instanciación
- **Optimización de geometría en búfer**: Gestión eficiente de memoria y fusión de geometría para reducir la sobrecarga de GPU
- **Caché de materiales**: Reutiliza materiales entre entidades similares para minimizar los cambios de estado
- **Optimización WebGL**: Aprovecha las funciones modernas de WebGL para renderizado acelerado por hardware

Estas optimizaciones permiten que CAD-Viewer renderice sin problemas dibujos CAD complejos con miles de entidades manteniendo interacciones de usuario fluidas.

## Hoja de ruta

El objetivo de este proyecto es crear un **sistema 2D similar a AutoCAD en el navegador** (visor + editor), con arquitectura modular e integración independiente del framework.

Leyenda:
- [x] Completado
- [ ] Planificado
- [ ] ⏳ En progreso

### Capa central de archivos y datos

#### Modelo de datos

* [x] Modelo de datos de entidades unificado
* [x] Soporte de tabla de capas
* [x] Estructura de bloques / inserciones
* [ ] ⏳ Gestión de handle e ID de objeto: actualmente objectId es igual al handle y se representa como una cadena en lugar de bigint (int64).
* [ ] ⏳ Soporte de XData / diccionario de extensiones
* [ ] Manejo de entidades proxy

### Renderizado y rendimiento

#### Motor de renderizado

* [x] Renderizado basado en WebGL (Three.js)
* [x] Canal optimizado solo para 2D
* [x] Organización de escena por capas
* [x] Renderizado de layout / espacio papel
* [ ] Soporte de entidades viewport

#### Optimización de rendimiento

* [x] Fusión y agrupación de geometría
* [x] Indexación espacial (básica)
* [x] Índice espacial avanzado (R-tree / BVH)
* [ ] Renderizado con nivel de detalle (LOD)
* [ ] Multi-lienzo / renderizado en mosaico para dibujos muy grandes

### Visualización y navegación

#### Controles de vista

* [x] Desplazamiento
* [x] Zoom (rueda / zoom por ventana)
* [x] Ajustar a vista / extensión
* [ ] Vistas con nombre
* [ ] Historial de vistas (deshacer / rehacer cambios de vista)

#### Controles de visualización

* [x] Visualización de grosor de línea
* [ ] Escalado de tipo de línea
* [x] Cambio de fondo / tema

### Selección e interacción

#### Selección

* [x] Selección de entidad única
* [x] Resaltar entidades seleccionadas
* [x] Selección por ventana
* [x] Selección por cruce
* [x] Filtros de selección (por tipo / capa)
* [x] Ciclo de selección

#### Ajuste (OSNAP)

* [x] Punto final
* [x] Punto medio
* [x] Centro
* [x] Intersección
* [ ] Perpendicular / tangente
* [x] Más cercano
* [ ] Seguimiento de ajuste


### Edición y modificación

#### Edición básica

* [x] Marco de edición de entidades
* [x] Mover
* [x] Copiar
* [x] Rotar
* [ ] Escalar
* [x] Eliminar
* [x] Deshacer / rehacer

#### Edición de geometría

* [x] Puntos de agarre
* [ ] Estirar
* [ ] Recortar
* [ ] Extender
* [x] Desfase
* [ ] Explotar
* [ ] Unir / filete / chaflán (2D)

### Herramientas de dibujo y creación

#### Entidades básicas

* [x] Línea
* [x] Polilínea
* [x] Spline
* [x] Círculo
* [x] Arco
* [x] Elipse
* [x] Rectángulo / polígono

#### Entidades avanzadas

* [x] Sombreado
* [ ] Texto (una línea / multilínea)
* [ ] Cotas (lineal, alineada, angular)
* [ ] Creación e inserción de bloques

### Medición

* [x] Distancia
* [x] Longitud de arco
* [x] Área
* [x] Ángulo
* [ ] Coordenada
* [ ] Estadísticas de entidades (longitud, área, recuento)

### Cota

* [x] Cota lineal
* [ ] Cota angular
* [ ] Coordenada

### Propiedades y paneles de interfaz

#### Paleta de propiedades

* [x] Propiedades de entidad seleccionada
* [ ] Edición de color, tipo de línea
* [x] Actualización en vivo al cambiar

#### Paneles e interfaz

* [ ] Administrador de bloques
* [x] Historial de comandos / consola
* [x] Barra de estado (ajuste, ortogonal, cuadrícula)

#### Sistema de comandos

* [x] Registro de comandos
* [x] Alias de comandos
* [x] Indicaciones de comandos (estilo AutoCAD)

### Integración y extensibilidad

#### Integración con frameworks

* [x] Núcleo independiente del framework
* [ ] Ejemplo de integración con React
* [x] Ejemplo de integración con Vue
* [ ] Integración con OpenLayers / Map
* [ ] Incrustación en CMS / Notion

#### Sistema de plugins

* [x] API de plugins
* [ ] Soporte de entidades personalizadas
* [x] Comando personalizado

### Edición sin conexión y en línea

#### Editor sin conexión

* [x] Edición local en el navegador
* [ ] Guardar conjunto de cambios / diff
* [ ] Persistencia en IndexedDB

#### Editor en línea

* [ ] Diseño de API backend
* [ ] Autenticación de usuarios
* [ ] Control de versiones de archivos
* [ ] Control de acceso multiusuario
* [ ] Colaboración en tiempo real (futuro)

### Plataformas objetivo

* [ ] Visor de Mini Program de WeChat
* [x] Soporte de navegador móvil (diseño responsive y gestos táctiles)

### Documentación y comunidad

* [x] Documentación de arquitectura
* [x] Referencia de API
* [ ] Guía de contribución
* [x] Proyectos de ejemplo
* [x] Mantenimiento de hoja de ruta y registro de cambios

Esta hoja de ruta es intencionalmente detallada para que los colaboradores puedan ver claramente **qué existe**, **qué falta** y **dónde se necesita ayuda**.

## Contribuir

¡Las contribuciones son bienvenidas! Abra issues o pull requests para correcciones de errores, nuevas funciones o sugerencias. Para informes de errores, proporcionar un enlace al dibujo problemático ayudará a reproducir y corregir el problema.

## Licencia

El monorepo cad-viewer está principalmente bajo licencia [MIT](LICENSE).
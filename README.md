# FitWalk – PWA de actividad física
Proyecto Integrador · Aplicaciones Web Progresivas · UTM · Opción 4: Aplicación de Actividad Física

## 1. Problemática
Muchas personas quieren caminar más, pero las apps deportivas exigen Internet constante, cuenta y plan de pago. FitWalk registra caminatas con GPS, calcula estadísticas y metas, y funciona **sin conexión**.

## 2. Objetivos
- **General:** desarrollar una PWA instalable que registre caminatas, rutas y metas personales.
- **Específicos:** rastrear ruta con Geolocation API; guardar datos en IndexedDB (CRUD); consumir una API REST de clima; funcionar offline con Service Worker; publicar en HTTPS (GitHub Pages).

## 3. Arquitectura
```
Navegador ── index.html + style.css + app.js (UI, lógica)
   │            ├─ IndexedDB  → stores: walks, settings
   │            ├─ Geolocation / Notifications / Web Share (APIs del dispositivo)
   │            ├─ Leaflet → teselas de OpenStreetMap (se guardan en caché al verlas)
   └─ fetch → Open-Meteo (API REST)
   └─ sw.js (Service Worker): cache-first para la app, network-first para la API
manifest.json + icons/  → instalación
```
## 4. Tecnologías
HTML5, CSS3 (grid/flex, modo oscuro), JavaScript ES2020, **Leaflet 1.9.4** (mapa interactivo, incluido localmente en `lib/leaflet/`) con teselas de OpenStreetMap, IndexedDB, Service Worker, Web App Manifest, Open-Meteo (REST, sin API key), GitHub Pages.

## 5. Cumplimiento de requisitos
| # | Requisito | Dónde |
|---|-----------|-------|
| 1 | Responsiva | `style.css` (grid auto-fit, viewport, touch ≥44 px); mapas adaptables |
| 2 | Manifest + instalable | `manifest.json`, botón «Instalar» |
| 3 | Service Worker offline | `sw.js` |
| 4 | API REST | Open-Meteo (`btnWeather` en `app.js`) |
| 5 | ≥2 capacidades | Geolocalización, Notificaciones (meta cumplida), Compartir |
| 6 | IndexedDB | `openDB()` en `app.js` |
| 7 | CRUD | Crear (rastreo/manual), Leer (historial), Actualizar (editar), Borrar |
| 8 | Errores, validación, seguridad | atributos HTML + validación JS, `try/catch`, CSP, `textContent` (anti-XSS), coordenadas redondeadas al consultar la API, datos solo en el dispositivo |
| 9 | HTTPS | GitHub Pages |
| 10 | Pruebas + Lighthouse | Sección 7 |

## 6. Publicar en GitHub Pages
1. Crea un repositorio público y sube **el contenido** de esta carpeta (que `index.html` quede en la raíz).
2. *Settings → Pages → Deploy from a branch → main / (root) → Save*.
3. Tu enlace: `https://TU-USUARIO.github.io/NOMBRE-REPO/`
Todas las rutas son relativas, por lo que funciona en subcarpetas.

Local: `python3 -m http.server 8000` y abre `http://localhost:8000` (localhost cuenta como contexto seguro).

## 7. Pruebas (llenar con tus evidencias)
| Prueba | Dispositivo 1 (ej. Android/Chrome) | Dispositivo 2 (ej. PC/Edge) |
|---|---|---|
| Instalación | | |
| Rastreo GPS | | |
| Clima (API) | | |
| Offline (modo avión, recargar) | | |
| CRUD | | |
| Notificación de meta | | |

**Lighthouse:** Chrome → F12 → Lighthouse → Mobile → categorías Performance, Accessibility, Best Practices, SEO → captura de resultados. (Las pruebas PWA se revisan en *Application → Manifest / Service Workers*.)

**Evidencias sugeridas:** captura del prompt de instalación, pestaña *Network* con la respuesta de Open-Meteo, app abierta con «Sin conexión», datos en *Application → IndexedDB → fitwalk*.

## 8. Guion del video (5 min)
0:00 problema y objetivo · 0:30 instalación · 1:15 caminata con GPS y ruta · 2:15 clima (API) · 2:45 CRUD y meta con notificación · 3:30 offline · 4:15 Lighthouse y GitHub Pages · 4:45 conclusiones.

## 9. Mapa
Leaflet muestra la ruta en vivo y la ruta de cada caminata guardada (zoom y desplazamiento). Los archivos de Leaflet están en `lib/leaflet/` para que funcionen offline. Las teselas (imágenes del mapa) vienen de OpenStreetMap y el Service Worker guarda en caché hasta 400 de las que se hayan visto; sin Internet solo se verán esas, pero la línea de la ruta se dibuja siempre. Atribución obligatoria: © OpenStreetMap contributors.

## 10. Uso de la app
Iniciar/Finalizar caminata (se guarda si supera 10 m) · registro manual (útil en PC sin GPS) · meta semanal con barra de progreso · historial con ver ruta, editar, compartir y borrar.

## 11. Créditos
Equipo: _(nombres)_ · Profesor: Dr. Aurelio Mex Mex · Clima: Open-Meteo.com · Mapas: Leaflet y © OpenStreetMap contributors

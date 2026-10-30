# Perfumare — Opciones de publicación web

> Documento de referencia para decidir cómo publicar y operar el catálogo de Perfumare.
> Fecha: 2026-10-30 · Proyecto: `milena` · Cliente: Milena

---

## 🔗 Enlace de acceso actual

**https://jeinsperfumes-developver.github.io/milena/**

Funciona desde cualquier dispositivo con internet (celular, PC, tablet). No requiere instalación ni clave para ver el catálogo.

---

## 1. GitHub Pages (opción actual) ⭐

| Aspecto | Detalle |
|---|---|
| Costo | **Gratis** |
| Dominio | `jeinsperfumes-developver.github.io/milena/` |
| HTTPS | Incluido automáticamente |
| Actualizaciones | Automáticas al hacer push (deploy vía GitHub Actions) |
| Límites | Sitios estáticos (HTML/CSS/JS). ~1 GB por repo, 100 GB tráfico/mes |
| Desventajas | URL larga, no es "tu" dominio, repositorio público |

**Por qué es la mejor opción hoy:** gratis, sin servidor que mantener, sin costo mensual, HTTPS incluido y deploys automáticos. Perfecto para un catálogo de 3.840 productos con imágenes ya alojadas en el repo de Camila.

**Mejora futura con el mismo GitHub Pages:** conectar un dominio propio (ej. `perfumare.com`) — se paga solo el dominio (~$10-15 USD/año), el hosting sigue gratis.

---

## 2. Dominio gratis

| Servicio | Dominio | Condiciones |
|---|---|---|
| **eu.org** | `tunombre.eu.org` | Gratis definitivo, aprobación manual (días/semanas) |
| **FreeDNS (afraid.org)** | subdominios varios | Gratis, orientado a DNS |
| **DuckDNS** | `perfumare.duckdns.org` | Gratis, ideal para apuntar a un servidor local |
| **no-ip** | `perfumare.ddns.net` | Gratis 30 días, luego confirma cada mes (o pago único) |
| **js.org** | `perfumare.js.org` | Gratis para proyectos JS open source (repo público requerido) |

**Recomendación:** si solo se quiere una URL más corta sin pagar, `js.org` o `duckdns.org`. Si se quiere marca propia, comprar `.com` (~$10-15/año) y conectarlo a GitHub Pages.

---

## 3. Hosting gratis (alternativas a GitHub Pages)

| Servicio | Qué ofrece | Límite relevante |
|---|---|---|
| **Netlify** | Deploy automático desde GitHub, HTTPS | 100 GB tráfico/mes gratis |
| **Vercel** | Deploy automático desde GitHub, HTTPS | Generoso para sitios estáticos |
| **Cloudflare Pages** | Deploy desde GitHub, red global (CDN) | Ilimitado para estáticos, 500 builds/mes |
| **Neocities** | Hosting estático sencillo | 1 GB gratis |
| **Google Sites** | Constructor visual, sin código | Limitado en personalización |

**Nota:** para este proyecto (sitio 100% estático), Netlify / Vercel / Cloudflare Pages son equivalentes a GitHub Pages; solo cambian la URL y el panel de administración. Todas permiten conectar dominio propio gratis.

---

## 4. Alojado en local (servidor en casa)

| Requisito | Detalle |
|---|---|
| Equipo | MiniMac u otro siempre encendido |
| Software | `python3 -m http.server` / Caddy / nginx |
| Dominio | DuckDNS + apertura de puerto en router |
| Acceso externo | Requiere IP pública + redirección de puerto o Tailscale |

**Opciones de acceso:**
- **Tailscale** (ya lo tienes): solo visible para tus dispositivos — no sirve para cliente.
- **DNS + puerto abierto**: funciona pero expone tu red; requiere IP pública y mantener el equipo encendido 24/7.
- **Cloudflare Tunnel**: gratis, sin abrir puertos, equipo encendido 24/7.

**Veredicto:** no recomendado para un catálogo que la clienta debe abrir desde su celular en cualquier momento. La disponibilidad dependería de tu equipo y tu red. Úsalo solo como entorno de pruebas.

---

## 5. Comparativa rápida

| | GitHub Pages | Netlify/Vercel/CF | Dominio propio | Local |
|---|---|---|---|---|
| Costo | $0 | $0 | ~$10-15/año | $0 (luz/PC) |
| Disponibilidad | Alta (GitHub) | Alta | Alta | Depende de tu equipo |
| URL corta | No | No (subdominio) | **Sí** | No |
| Mantenimiento | Cero | Cero | Cero | Alto |
| HTTPS | Sí | Sí | Sí | Complejo |

---

## 6. Pendiente: aprobación de la clienta ⚠️

> **Necesitamos la selección/aprobación del contenido por parte de Milena.**

**Flujo definido:**
1. Milena revisa el catálogo en el enlace y **selecciona** las fragancias que aprueba (check azul → carrito).
2. **Envía la cotización por WhatsApp** desde el propio sitio (botón "Enviar cotización por WhatsApp" en el carrito).
3. El mensaje llega al WhatsApp de Jeisson (312 388 7226) **indicando si cada producto es LISTA BLANCA o LISTA NEGRA**:
   - **LISTA BLANCA** ✅ → producto aprobado, se queda en el catálogo público.
   - **LISTA NEGRA** ⛔ → producto no aprobado, debe quitarse del catálogo público.
   (Clasificación manual en el mensaje según lo acordado con la clienta.)

**Destinos disponibles en el sitio:**
- Milena: +57 300 608 3290
- Jeisson (pruebas): +57 312 388 7226

---

## 7. Otros detalles de interés

- **Catálogo:** 3.840 fragancias importadas del catálogo de Camila (mismas imágenes, enlazadas al repo existente para no duplicar 740 MB).
- **Modo admin:** clave `MilenaTomasJeins` → importar Excel/CSV, exportar CSV, editar/eliminar productos, vaciar catálogo. Todo se guarda en el navegador (localStorage) del dispositivo donde se use.
- **⚠️ Importante sobre localStorage:** los cambios del admin (ediciones, importaciones) viven **solo en el navegador** donde se hacen. Al cargar por primera vez, cada visitante descarga `catalogo.csv` desde el repo. Para que un cambio hecho en admin lo vean todos, hay que re-exportar el CSV y subirlo al repo (yo lo hago con un commit).
- **Privacidad:** el repo es público (necesario para Pages gratis). Las claves del admin viajan ofuscadas en el JS del cliente — es un filtro de uso, no seguridad real. No poner datos sensibles en el catálogo.
- **Actualización del catálogo:** flujo recomendado → Milena aprueba → admin importa el Excel final → exporta CSV → se sube al repo → deploy automático a la web.
- **Moneda y precios:** selector de moneda en el menú lateral (USD, ARS, CLP, COP, MXN, PEN, EUR, BRL, BOB) + interruptor "Mostrar precios".
- **Deploys:** cada push a la rama `main` publica automáticamente (GitHub Actions). Cero intervención manual.

---

*Documento generado para el proyecto Perfumare (`milena`). Enlace vivo: https://jeinsperfumes-developver.github.io/milena/*

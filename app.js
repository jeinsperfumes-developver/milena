/* ============================================================
   Perfumare · Perfumería — lógica de la app (proyecto milena)
   Sin backend: todo corre en el navegador del visitante.
   ============================================================ */

(() => {
  "use strict";

  /* ---------------- Estado ---------------- */

  const CLAVE_DATOS = "milena_catalogo_v1";
  const CLAVE_ROL = "milena_rol_v1";
  const CLAVE_ADMIN = "MilenaTomasJeins";
  const CLAVE_PREFS = "milena_prefs_v1";
  const CLAVE_CARRITO = "milena_carrito_v1";
  const CLAVE_DESTINO = "milena_destino_v1";
  const CSV_REPO = "catalogo.csv";

  // WhatsApp de la cliente (Milena) y de pruebas
  const WHATSAPP_MILENA = "573006083290"; // Milena: 300 608 3290 (Colombia +57)
  const WHATSAPP_PRUEBAS = "573123887226"; // Pruebas: 312 388 7226
  const DESTINOS_WHATSAPP = [
    { id: "milena", nombre: "Milena (300 608 3290)", num: WHATSAPP_MILENA },
    { id: "pruebas", nombre: "Yo · pruebas (312 388 7226)", num: WHATSAPP_PRUEBAS },
  ];

  /** @type {Producto[]} */
  let productos = [];
  let categoriaActiva = "todas";
  let prefs = { moneda: "$ COP", mostrarPrecios: false };
  let destinoCotizacion = "milena";
  let rol = "invitado"; // "invitado" | "admin"
  /** @type {{codigo: string, nombre: string, precio: number, cant: number}[]} */
  let carrito = [];

  /* ---------------- Utilidades DOM ---------------- */

  const $ = (id) => document.getElementById(id);

  const elementos = {
    btnMenu: $("btnMenu"),
    drawer: $("drawer"),
    drawerBackdrop: $("drawerBackdrop"),
    btnCerrarDrawer: $("btnCerrarDrawer"),
    inputBusqueda: $("inputBusqueda"),
    btnLimpiarBusqueda: $("btnLimpiarBusqueda"),
    chkPrecios: $("chkPrecios"),
    selMoneda: $("selMoneda"),
    chipsCategorias: $("chipsCategorias"),
    selOrden: $("selOrden"),
    inputPrecioMax: $("inputPrecioMax"),
    outPrecioMax: $("outPrecioMax"),
    infoResultados: $("infoResultados"),
    grid: $("gridProductos"),
    estadoVacio: $("estadoVacio"),
    sinResultados: $("sinResultados"),
    modalBackdrop: $("modalBackdrop"),
    btnCerrarModal: $("btnCerrarModal"),
    toast: $("toast"),
    statTotal: $("statTotal"),
    statCategorias: $("statCategorias"),
    heroSub: $("heroSub"),
    modalMedia: $("modalMedia"),
    modalCategoria: $("modalCategoria"),
    modalTitulo: $("modalTitulo"),
    modalPrecio: $("modalPrecio"),
    modalDescripcion: $("modalDescripcion"),
    modalMeta: $("modalMeta"),
    btnSeleccionarModal: $("btnSeleccionarModal"),
    // Carrito / cotización
    btnCarrito: $("btnCarrito"),
    carritoBadge: $("carritoBadge"),
    carritoBackdrop: $("carritoBackdrop"),
    carritoDrawer: $("carritoDrawer"),
    btnCerrarCarrito: $("btnCerrarCarrito"),
    carritoLista: $("carritoLista"),
    carritoVacio: $("carritoVacio"),
    carritoPie: $("carritoPie"),
    carritoTotal: $("carritoTotal"),
    btnEnviarCotizacion: $("btnEnviarCotizacion"),
    destinoCot: $("destinoCot"),
    btnFlotanteCarrito: $("btnFlotanteCarrito"),
    flotanteBadge: $("flotanteBadge"),
    // Admin
    btnImportarTop: $("btnImportarTop"),
    btnImportarMenu: $("btnImportarMenu"),
    btnExportar: $("btnExportar"),
    btnVaciar: $("btnVaciar"),
    btnSalirAdmin: $("btnSalirAdmin"),
    notaRol: $("notaRol"),
    loginBackdrop: $("loginBackdrop"),
    btnCerrarLogin: $("btnCerrarLogin"),
    formLogin: $("formLogin"),
    inputClave: $("inputClave"),
    loginError: $("loginError"),
    inputArchivo: $("inputArchivo"),
    cargando: $("cargando"),
  };

  let temporizadorToast = null;

  function toast(mensaje, esError = false) {
    elementos.toast.textContent = mensaje;
    elementos.toast.classList.toggle("error", esError);
    elementos.toast.hidden = false;
    requestAnimationFrame(() => elementos.toast.classList.add("visible"));
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => {
      elementos.toast.classList.remove("visible");
      setTimeout(() => (elementos.toast.hidden = true), 300);
    }, 2600);
  }

  const escapar = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );

  /* ---------------- Normalización de columnas ---------------- */

  const CAMPOS = {
    codigo: ["codigo", "código", "sku", "code", "id", "referencia", "ref", "cod"],
    nombre: ["nombre", "producto", "name", "titulo", "título", "descripcion corta", "articulo", "artículo", "item"],
    descripcion: ["descripcion", "descripción", "description", "detalle", "detalles", "notas", "observaciones"],
    categoria: ["categoria", "categoría", "category", "rubro", "tipo", "linea", "línea", "grupo", "coleccion", "colección"],
    precio: ["precio", "price", "valor", "preciounitario", "precio unitario", "costo", "pvp", "venta", "importe"],
    precioAnterior: ["precioanterior", "precio anterior", "precio viejo", "oldprice", "old price", "preciotachado", "precio tachado", "oferta", "preciooferta", "precio oferta"],
    imagen: ["imagen", "image", "foto", "url imagen", "urlimagen", "img", "imageurl", "image url", "link imagen", "linkimagen", "imagenurl", "foto url"],
    imagen2: ["imagen2", "imagen 2", "image2", "image 2", "foto2", "foto 2", "segunda imagen"],
    stock: ["stock", "disponible", "cantidad", "inventory", "inventario", "existencia", "existencias"],
  };

  const normalizarClave = (s) =>
    String(s ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[\s_\-\.]+/g, " ")
      .replace(/\s+/g, " ");

  function detectarCampo(encabezado) {
    const clave = normalizarClave(encabezado);
    if (!clave) return null;
    for (const [campo, aliases] of Object.entries(CAMPOS)) {
      if (aliases.some((a) => a === clave)) return campo;
    }
    for (const [campo, aliases] of Object.entries(CAMPOS)) {
      if (aliases.some((a) => clave.startsWith(a) || a.startsWith(clave))) return campo;
    }
    return null;
  }

  /* ---------------- Parseo de precios ---------------- */

  function parsearPrecio(valor) {
    if (valor === null || valor === undefined || valor === "") return NaN;
    if (typeof valor === "number") return valor;
    let s = String(valor).trim();
    if (!s) return NaN;
    const tieneComa = s.includes(","),
      tienePunto = s.includes(".");
    s = s.replace(/[^\d.,\-]/g, "");
    if (tieneComa && tienePunto) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (tieneComa) {
      const partes = s.split(",");
      if (partes.length === 2 && partes[1].length <= 2) s = partes.join(".");
      else s = s.replace(/,/g, "");
    } else if (tienePunto) {
      const partes = s.split(".");
      const esMiles = partes.length > 1 && partes.slice(1).every((p) => /^\d{3}$/.test(p)) && /^\d+$/.test(partes[0]);
      if (esMiles) s = partes.join("");
    }
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  }

  /* ---------------- Lectura CSV ---------------- */

  function csvABjetos(textoOVacio) {
    const texto = typeof textoOVacio === "string"
      ? textoOVacio
      : new TextDecoder().decode(textoOVacio);

    const limpio = texto.replace(/^\uFEFF/, "");
    const filas = parsearCSV(limpio);
    if (!filas.length) return [];

    const encabezados = filas[0];
    const mapa = encabezados.map(detectarCampo);

    return filas
      .slice(1)
      .filter((f) => f.some((c) => String(c ?? "").trim() !== ""))
      .map((f) => {
        const obj = {};
        mapa.forEach((campo, i) => {
          if (campo && !(campo in obj)) obj[campo] = String(f[i] ?? "").trim();
        });
        return {
          codigo: obj.codigo || "",
          nombre: obj.nombre || "",
          descripcion: obj.descripcion || "",
          categoria: obj.categoria || "Sin categoría",
          precio: parsearPrecio(obj.precio),
          precioAnterior: obj.precioAnterior ? parsearPrecio(obj.precioAnterior) : NaN,
          imagen: obj.imagen || "",
          imagen2: obj.imagen2 || "",
          stock: obj.stock || "",
        };
      })
      .filter((p) => p.nombre !== "");
  }

  function parsearCSV(texto) {
    const separador = detectarSeparador(texto);
    const filas = [];
    let fila = [], celda = "", enComillas = false;

    for (let i = 0; i < texto.length; i++) {
      const ch = texto[i];
      if (enComillas) {
        if (ch === '"') {
          if (texto[i + 1] === '"') { celda += '"'; i++; }
          else enComillas = false;
        } else celda += ch;
      } else if (ch === '"') {
        enComillas = true;
      } else if (ch === separador) {
        fila.push(celda); celda = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && texto[i + 1] === "\n") i++;
        fila.push(celda); celda = "";
        if (fila.length > 1 || fila[0] !== "") filas.push(fila);
        fila = [];
      } else {
        celda += ch;
      }
    }
    fila.push(celda);
    if (fila.length > 1 || fila[0] !== "") filas.push(fila);
    return filas;
  }

  function detectarSeparador(texto) {
    const muestra = texto.slice(0, 4000);
    const conteo = { ",": 0, ";": 0, "\t": 0 };
    let enComillas = false;
    for (const ch of muestra) {
      if (ch === '"') enComillas = !enComillas;
      else if (!enComillas && ch in conteo) conteo[ch]++;
    }
    return Object.entries(conteo).sort((a, b) => b[1] - a[1])[0][0];
  }

  /* ---------------- Lectura de archivos ---------------- */

  function leerLibro(archivo) {
    return new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
      lector.onload = (e) => {
        try {
          if (/\.csv$/i.test(archivo.name)) resolve({ csv: e.target.result });
          else resolve({ binario: e.target.result });
        } catch (err) { reject(err); }
      };
      lector.readAsArrayBuffer(archivo);
    });
  }

  async function importarArchivo(archivo) {
    elementos.cargando.hidden = false;
    try {
      const { csv, binario } = await leerLibro(archivo);
      let nuevos;
      if (csv !== undefined) {
        nuevos = csvABjetos(csv);
      } else if (window.XLSX) {
        const libro = XLSX.read(binario, { type: "array" });
        const hoja = libro.Sheets[libro.SheetNames[0]];
        nuevos = csvABjetos(XLSX.utils.sheet_to_csv(hoja));
      } else {
        throw new Error("La librería de Excel no cargó. Revisa tu conexión.");
      }
      if (!nuevos.length) throw new Error("No encontré filas válidas (columna «nombre»).");
      productos = nuevos;
      guardarDatos();
      categoriaActiva = "todas";
      renderizarTodo();
      toast(`Importados ${nuevos.length} productos.`);
    } catch (err) {
      toast(err.message || "Error al importar.", true);
    } finally {
      elementos.cargando.hidden = true;
      elementos.inputArchivo.value = "";
    }
  }

  function guardarDatos() {
    try { localStorage.setItem(CLAVE_DATOS, JSON.stringify(productos)); } catch { }
  }

  function descargar(nombre, contenido, tipo = "text/csv;charset=utf-8") {
    const blob = new Blob(["\uFEFF" + contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function exportarCSV() {
    if (!productos.length) return toast("No hay productos para exportar.", true);
    const filas = [["codigo", "nombre", "descripcion", "categoria", "precio", "precio anterior", "imagen", "imagen2", "stock"]];
    for (const p of productos) {
      filas.push([
        p.codigo, p.nombre, p.descripcion, p.categoria,
        Number.isFinite(p.precio) ? String(p.precio).replace(".", ",") : "",
        Number.isFinite(p.precioAnterior) ? String(p.precioAnterior).replace(".", ",") : "",
        p.imagen, p.imagen2 || "", p.stock,
      ]);
    }
    descargar("catalogo.csv", filas.map((f) => f.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\r\n"));
    toast("catalogo.csv descargado. Súbelo a la raíz del repo para publicarlo.");
  }

  /* ---------------- Roles: invitado / admin ---------------- */

  function aplicarRol() {
    const esAdmin = rol === "admin";
    document.querySelectorAll("[data-solo-admin]").forEach((el) => (el.hidden = !esAdmin));
    elementos.btnSalirAdmin.hidden = !esAdmin;
    elementos.notaRol.hidden = esAdmin;
    if (!esAdmin) {
      elementos.notaRol.innerHTML =
        'Estás como <strong>invitado</strong>: puedes filtrar y armar tu selección.<br/><button class="btn-quitar" id="btnPedirAdmin" type="button">Soy Milena (entrar como admin)</button>';
      const b = $("btnPedirAdmin");
      if (b) b.addEventListener("click", () => { cerrarDrawer(); abrirLogin(); });
    }
    renderizarTodo();
  }

  function abrirLogin() {
    elementos.loginBackdrop.hidden = false;
    elementos.loginError.hidden = true;
    elementos.inputClave.value = "";
    requestAnimationFrame(() => elementos.loginBackdrop.classList.add("visible"));
    setTimeout(() => elementos.inputClave.focus(), 60);
  }

  function cerrarLogin() {
    elementos.loginBackdrop.classList.remove("visible");
    setTimeout(() => (elementos.loginBackdrop.hidden = true), 280);
  }

  function intentarLogin(clave) {
    if (clave === CLAVE_ADMIN) {
      rol = "admin";
      try { localStorage.setItem(CLAVE_ROL, rol); } catch { }
      cerrarLogin();
      aplicarRol();
      toast("Modo administrador activo.");
    } else {
      elementos.loginError.hidden = false;
      elementos.inputClave.select();
    }
  }

  function salirAdmin() {
    rol = "invitado";
    try { localStorage.setItem(CLAVE_ROL, rol); } catch { }
    aplicarRol();
    cerrarDrawer();
    toast("Volviste al modo invitado.");
  }

  /* ---------------- Preferencias ---------------- */

  function cargarPrefs() {
    try {
      const crudo = localStorage.getItem(CLAVE_PREFS);
      if (crudo) prefs = { ...prefs, ...JSON.parse(crudo) };
    } catch { /* ignorar */ }
    elementos.selMoneda.value = prefs.moneda;
    elementos.chkPrecios.checked = prefs.mostrarPrecios;
  }

  function guardarPrefs() {
    try { localStorage.setItem(CLAVE_PREFS, JSON.stringify(prefs)); } catch { /* ignorar */ }
  }

  /* ---------------- Destino de cotización ---------------- */

  function destinoActivo() {
    return DESTINOS_WHATSAPP.find((d) => d.id === destinoCotizacion) || DESTINOS_WHATSAPP[0];
  }

  function renderizarDestinoCot() {
    const cont = elementos.destinoCot;
    cont.innerHTML = "";
    DESTINOS_WHATSAPP.forEach((d) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "destino-pill";
      b.textContent = d.nombre;
      b.setAttribute("role", "radio");
      b.setAttribute("aria-checked", String(d.id === destinoCotizacion));
      b.classList.toggle("activo", d.id === destinoCotizacion);
      b.addEventListener("click", () => {
        destinoCotizacion = d.id;
        try { localStorage.setItem(CLAVE_DESTINO, d.id); } catch { /* ignorar */ }
        renderizarDestinoCot();
      });
      cont.appendChild(b);
    });
  }

  function cargarDestino() {
    try {
      const guardado = localStorage.getItem(CLAVE_DESTINO);
      if (guardado && DESTINOS_WHATSAPP.some((d) => d.id === guardado)) destinoCotizacion = guardado;
    } catch { /* ignorar */ }
    renderizarDestinoCot();
  }

  /* ---------------- Filtrado y render ---------------- */

  function normalizarTexto(s) {
    return String(s ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function productosFiltrados() {
    const q = normalizarTexto(elementos.inputBusqueda.value.trim());
    const orden = elementos.selOrden.value;
    const conPrecio = productos.filter((p) => Number.isFinite(p.precio));
    const precioMaxReal = Math.max(...conPrecio.map((p) => p.precio), 0);
    const umbral = (elementos.inputPrecioMax.value / 100) * precioMaxReal;
    const filtroActivo = elementos.inputPrecioMax.value < 100;

    let lista = productos.filter((p) => {
      if (categoriaActiva !== "todas" && p.categoria !== categoriaActiva) return false;
      if (filtroActivo && Number.isFinite(p.precio) && p.precio > umbral) return false;
      if (q) {
        const blob = normalizarTexto(`${p.nombre} ${p.descripcion} ${p.categoria} ${p.codigo}`);
        if (!blob.includes(q)) return false;
      }
      return true;
    });

    const comparadores = {
      "precio-asc": (a, b) => a.precio - b.precio,
      "precio-desc": (a, b) => b.precio - a.precio,
      "nombre-asc": (a, b) => a.nombre.localeCompare(b.nombre, "es"),
      "nombre-desc": (a, b) => b.nombre.localeCompare(a.nombre, "es"),
    };
    if (orden !== "relevante") lista.sort(comparadores[orden] || (() => 0));
    return lista;
  }

  function formatearPrecio(n) {
    if (!prefs.mostrarPrecios || !Number.isFinite(n)) return "";
    const esEntero = Number.isInteger(n);
    const numero = new Intl.NumberFormat("es-CO", {
      minimumFractionDigits: esEntero ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(n);
    return `${prefs.moneda} ${numero}`;
  }

  function inicialChulis(nombre) {
    for (const palabra of String(nombre).split(/\s+/)) {
      if (palabra.length) return palabra[0].toUpperCase();
    }
    return "•";
  }

  function renderizarCategorias() {
    const conteo = new Map();
    for (const p of productos) conteo.set(p.categoria, (conteo.get(p.categoria) || 0) + 1);

    const categorias = [...conteo.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"));
    elementos.chipsCategorias.replaceChildren();

    const chipTodas = crearChip("todas", "Todas", productos.length);
    elementos.chipsCategorias.appendChild(chipTodas);
    for (const [cat, n] of categorias) {
      elementos.chipsCategorias.appendChild(crearChip(cat, cat, n));
    }
    elementos.statCategorias.textContent = categorias.length;
  }

  function crearChip(valor, etiqueta, n) {
    const b = document.createElement("button");
    b.className = "chip" + (categoriaActiva === valor ? " activo" : "");
    b.setAttribute("role", "tab");
    b.setAttribute("aria-selected", categoriaActiva === valor ? "true" : "false");
    b.innerHTML = `${escapar(etiqueta)}<span class="n">${n}</span>`;
    b.addEventListener("click", () => {
      categoriaActiva = valor;
      renderizarCategorias();
      renderizarGrid();
    });
    return b;
  }

  const esFotoValida = (imagen) =>
    /^https?:\/\/.+/.test(imagen) || /^(?!\/)[\w][\w\/ .-]*\.(jpe?g|png|webp|avif|gif|svg)$/i.test(imagen.trim());

  function fotosProducto(p) {
    const fotos = [p.imagen, p.imagen2]
      .map((f) => String(f ?? "").trim())
      .filter((f) => f && esFotoValida(f));
    return [...new Set(fotos)].reverse();
  }

  function conectarCarrusel(root, total) {
    const pista = root.querySelector(".carrusel-pista");
    const puntos = [...root.querySelectorAll(".carrusel-punto")];
    let indice = 0;

    function irA(n) {
      indice = ((n % total) + total) % total;
      pista.style.transform = `translateX(-${indice * 100}%)`;
      puntos.forEach((p, j) => p.classList.toggle("activo", j === indice));
    }

    root.querySelector(".carrusel-flecha.prev").addEventListener("click", (e) => {
      e.stopPropagation();
      irA(indice - 1);
    });
    root.querySelector(".carrusel-flecha.next").addEventListener("click", (e) => {
      e.stopPropagation();
      irA(indice + 1);
    });
    puntos.forEach((p, j) => p.addEventListener("click", (e) => {
      e.stopPropagation();
      irA(j);
    }));

    let x0 = null, arrastro = false;
    const UMBRAL_SWIPE = 30;
    root.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; arrastro = false; }, { passive: true });
    root.addEventListener("touchmove", (e) => {
      if (x0 === null) return;
      if (Math.abs(e.touches[0].clientX - x0) > UMBRAL_SWIPE) arrastro = true;
    }, { passive: true });
    root.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > UMBRAL_SWIPE) irA(dx < 0 ? indice + 1 : indice - 1);
      x0 = null;
    });
    root.addEventListener("click", (e) => { if (arrastro) { e.stopPropagation(); arrastro = false; } }, true);

    let mx0 = null;
    root.addEventListener("mousedown", (e) => { mx0 = e.clientX; e.preventDefault(); });
    root.addEventListener("mouseup", (e) => {
      if (mx0 === null) return;
      const dx = e.clientX - mx0;
      if (Math.abs(dx) > UMBRAL_SWIPE) { irA(dx < 0 ? indice + 1 : indice - 1); arrastro = true; }
      mx0 = null;
    });
  }

  /* ---------------- Selección con animación macOS ---------------- */

  // Hace saltar el check (rebote elástico) y el pop de la tarjeta
  function animarSeleccion(art, check) {
    check.classList.remove("saltando");
    art.classList.remove("pop");
    void check.offsetWidth; // reinicia animaciones
    void art.offsetWidth;
    check.classList.add("saltando");
    art.classList.add("pop");
    setTimeout(() => {
      check.classList.remove("saltando");
      art.classList.remove("pop");
    }, 520);
  }

  // Punto azul que vuela desde el check hasta el botón del carrito
  function volarAlCarrito(desdeEl) {
    if (!desdeEl || !elementos.btnCarrito) return;
    const origen = desdeEl.getBoundingClientRect();
    const destino = elementos.btnCarrito.getBoundingClientRect();

    const punto = document.createElement("div");
    punto.className = "punto-volador";
    punto.style.left = `${origen.left + origen.width / 2 - 11}px`;
    punto.style.top = `${origen.top + origen.height / 2 - 11}px`;
    document.body.appendChild(punto);

    // Arco: escala al inicio, vuela con curva, encoge al llegar
    const dx = destino.left + destino.width / 2 - (origen.left + origen.width / 2);
    const dy = destino.top + destino.height / 2 - (origen.top + origen.height / 2);

    requestAnimationFrame(() => {
      punto.style.transform = `translate(${dx}px, ${dy}px) scale(0.35)`;
      punto.style.opacity = "0.9";
    });

    setTimeout(() => punto.remove(), 700);

    // Salto del badge y del botón del carrito
    setTimeout(() => {
      elementos.carritoBadge.classList.remove("saltando");
      elementos.btnCarrito.classList.remove("saltando");
      void elementos.carritoBadge.offsetWidth;
      elementos.carritoBadge.classList.add("saltando");
      elementos.btnCarrito.classList.add("saltando");
      setTimeout(() => {
        elementos.carritoBadge.classList.remove("saltando");
        elementos.btnCarrito.classList.remove("saltando");
      }, 520);
    }, 480);
  }

  const claveProducto = (p) => p.codigo || p.nombre;
  const estaEnCarrito = (p) => carrito.some((i) => claveProducto(i) === claveProducto(p));

  /* ---------------- Tarjeta de producto ---------------- */

  const SVG_CHECK = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  function tarjetaProducto(p, i) {
    const art = document.createElement("article");
    art.className = "tarjeta" + (estaEnCarrito(p) ? " seleccionada" : "");
    art.style.animationDelay = `${Math.min(i, 12) * 30}ms`;
    art.tabIndex = 0;
    art.setAttribute("aria-label", p.nombre);

    const fotos = fotosProducto(p);
    const agotado = /^(no|0|sin|false|agotado)/i.test(p.stock.trim());

    let media;
    if (fotos.length > 1) {
      const slides = fotos
        .map((f, j) => `<img src="${escapar(f)}" alt="${escapar(p.nombre)} (foto ${j + 1})" loading="lazy" onerror="this.remove()" />`)
        .join("");
      const puntos = fotos.map((_, j) => `<span class="carrusel-punto${j === 0 ? " activo" : ""}"></span>`).join("");
      media = `
        <div class="carrusel" data-indice="0">
          <div class="carrusel-pista">${slides}</div>
          <button class="carrusel-flecha prev" type="button" aria-label="Foto anterior">‹</button>
          <button class="carrusel-flecha next" type="button" aria-label="Foto siguiente">›</button>
          <div class="carrusel-puntos">${puntos}</div>
        </div>`;
    } else if (fotos.length === 1) {
      media = `<img src="${escapar(fotos[0])}" alt="${escapar(p.nombre)}" loading="lazy" onerror="this.remove()" />`;
    } else {
      media = `<span class="sin-foto">${escapar(inicialChulis(p.nombre))}</span>`;
    }

    const badge = p.categoria && p.categoria !== "Sin categoría"
      ? `<span class="tarjeta-badge">${escapar(p.categoria)}</span>` : "";

    const precioHTML = formatearPrecio(p.precio);
    const anterior = Number.isFinite(p.precioAnterior) && p.precioAnterior > p.precio && formatearPrecio(p.precioAnterior)
      ? `<small>${escapar(formatearPrecio(p.precioAnterior))}</small>` : "";

    const stock = p.stock.trim()
      ? `<span class="tarjeta-stock${agotado ? " agotado" : ""}">${agotado ? "Agotado" : "Disponible"}</span>` : "";

    art.innerHTML = `
      <div class="tarjeta-media">${media}${badge}
        <button class="tarjeta-check${estaEnCarrito(p) ? " marcado" : ""}" type="button"
          role="checkbox" aria-checked="${estaEnCarrito(p)}"
          aria-label="Seleccionar ${escapar(p.nombre)}">${SVG_CHECK}</button>
        <button class="tarjeta-ver" type="button" aria-label="Ver detalle de ${escapar(p.nombre)}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M21 3l-9 9M9 21H3v-6M3 21l7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
      <div class="tarjeta-cuerpo">
        <h3 class="tarjeta-nombre">${escapar(p.nombre)}</h3>
        ${p.codigo ? `<span class="tarjeta-codigo">${escapar(p.codigo)}</span>` : ""}
        ${p.descripcion ? `<p class="tarjeta-descripcion">${escapar(p.descripcion)}</p>` : ""}
        <div class="tarjeta-pie">
          ${precioHTML ? `<span class="tarjeta-precio">${escapar(precioHTML)}${anterior}</span>` : ""}
          ${stock}
        </div>
      </div>`;

    const carrusel = art.querySelector(".carrusel");
    if (carrusel) conectarCarrusel(carrusel, fotos.length);

    // --- Interacción del check (selección) ---
    const check = art.querySelector(".tarjeta-check");
    check.addEventListener("click", (e) => {
      e.stopPropagation();
      alternarSeleccion(p, art, check);
    });

    // Toda la tarjeta también selecciona (excepto carrusel/ver)
    art.addEventListener("click", (e) => {
      if (e.target.closest(".carrusel-flecha") || e.target.closest(".carrusel-punto") || e.target.closest(".tarjeta-ver")) return;
      alternarSeleccion(p, art, check);
    });

    // Doble clic = ver detalle del producto
    art.addEventListener("dblclick", (e) => {
      if (e.target.closest(".carrusel-flecha") || e.target.closest(".carrusel-punto")) return;
      abrirModal(p);
    });

    // Botón lupa = ver detalle (útil en móvil)
    art.querySelector(".tarjeta-ver").addEventListener("click", (e) => {
      e.stopPropagation();
      abrirModal(p);
    });

    // Teclado: Enter selecciona, F/ArrowRight abre detalle
    art.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        alternarSeleccion(p, art, check);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        abrirModal(p);
      }
    });

    return art;
  }

  function alternarSeleccion(p, art, check) {
    if (estaEnCarrito(p)) {
      quitarDelCarrito(claveProducto(p));
      art.classList.remove("seleccionada");
      check.classList.remove("marcado");
      check.setAttribute("aria-checked", "false");
      animarSeleccion(art, check);
      toast(`${p.nombre} quitado de la selección.`);
    } else {
      agregarAlCarrito(p);
      art.classList.add("seleccionada");
      check.classList.add("marcado");
      check.setAttribute("aria-checked", "true");
      animarSeleccion(art, check);
      volarAlCarrito(check);
    }
    actualizarBotonModal(p);
  }

  // Refresca el botón del modal si el producto mostrado cambió de estado
  let productoModal = null;

  function actualizarBotonModal(p) {
    if (!productoModal || !elementos.btnSeleccionarModal) return;
    if (claveProducto(productoModal) !== claveProducto(p)) return;
    const dentro = estaEnCarrito(productoModal);
    elementos.btnSeleccionarModal.classList.toggle("activo", dentro);
    elementos.btnSeleccionarModal.textContent = dentro ? "✓ En tu selección" : "Seleccionar";
  }

  /* ---------------- Render del grid ---------------- */

  function actualizarControlesPrecio() {
    const hayPrecios = prefs.mostrarPrecios && productos.some((p) => Number.isFinite(p.precio));
    document.querySelectorAll("#selOrden option[value^='precio-']").forEach((o) => (o.hidden = !hayPrecios));
    elementos.inputPrecioMax.closest(".rango-wrap").style.display = hayPrecios ? "" : "none";
    if (!hayPrecios && elementos.selOrden.value.startsWith("precio-")) elementos.selOrden.value = "relevante";
  }

  function renderizarGrid() {
    const lista = productosFiltrados();
    elementos.grid.replaceChildren();
    lista.forEach((p, i) => elementos.grid.appendChild(tarjetaProducto(p, i)));

    const hayDatos = productos.length > 0;
    elementos.estadoVacio.hidden = hayDatos;
    elementos.grid.hidden = !hayDatos;
    elementos.sinResultados.hidden = !(hayDatos && lista.length === 0);
    elementos.infoResultados.textContent = hayDatos
      ? `Mostrando ${lista.length} de ${productos.length} fragancias`
      : "";

    const conPrecio = productos.filter((p) => Number.isFinite(p.precio));
    const precioMax = conPrecio.length ? Math.max(...conPrecio.map((p) => p.precio)) : 0;
    elementos.inputPrecioMax.disabled = !conPrecio.length;
    actualizarEtiquetaPrecio(precioMax);
  }

  function actualizarEtiquetaPrecio(precioMaxReal) {
    const v = Number(elementos.inputPrecioMax.value);
    if (v >= 100 || !precioMaxReal) {
      elementos.outPrecioMax.textContent = "Todos";
    } else {
      const hasta = Math.round((v / 100) * precioMaxReal);
      elementos.outPrecioMax.textContent = `hasta ${prefs.moneda} ${new Intl.NumberFormat("es-CO").format(hasta)}`;
    }
  }

  function renderizarTodo() {
    renderizarCategorias();
    renderizarGrid();
    actualizarControlesPrecio();
    elementos.statTotal.textContent = productos.length;
    const fecha = new Date().toLocaleDateString("es", { day: "numeric", month: "long" });
    elementos.heroSub.textContent = productos.length
      ? `${productos.length} fragancias · catálogo actualizado al ${fecha}`
      : "Catálogo de fragancias listo para explorar.";
  }

  /* ---------------- Modal detalle ---------------- */

  function abrirModal(p) {
    const fotos = fotosProducto(p);
    if (fotos.length > 1) {
      const slides = fotos
        .map((f, j) => `<img src="${escapar(f)}" alt="${escapar(p.nombre)} (foto ${j + 1})" />`)
        .join("");
      const puntos = fotos.map((_, j) => `<span class="carrusel-punto${j === 0 ? " activo" : ""}"></span>`).join("");
      elementos.modalMedia.innerHTML = `
        <div class="carrusel" data-indice="0">
          <div class="carrusel-pista">${slides}</div>
          <button class="carrusel-flecha prev" type="button" aria-label="Foto anterior">‹</button>
          <button class="carrusel-flecha next" type="button" aria-label="Foto siguiente">›</button>
          <div class="carrusel-puntos">${puntos}</div>
        </div>`;
      conectarCarrusel(elementos.modalMedia.querySelector(".carrusel"), fotos.length);
    } else if (fotos.length === 1) {
      elementos.modalMedia.innerHTML = `<img src="${escapar(fotos[0])}" alt="${escapar(p.nombre)}" />`;
    } else {
      elementos.modalMedia.innerHTML = `<span class="sin-foto">${escapar(inicialChulis(p.nombre))}</span>`;
    }

    elementos.modalCategoria.textContent = p.categoria || "";
    elementos.modalTitulo.textContent = p.nombre;
    elementos.modalPrecio.textContent = formatearPrecio(p.precio);
    elementos.modalPrecio.hidden = !formatearPrecio(p.precio);
    elementos.modalDescripcion.textContent = p.descripcion || "";

    const metas = [];
    if (p.codigo) metas.push(`Código: ${p.codigo}`);
    if (p.stock.trim()) metas.push(`Stock: ${p.stock}`);
    if (prefs.mostrarPrecios && Number.isFinite(p.precioAnterior) && p.precioAnterior > p.precio)
      metas.push(`Antes: ${formatearPrecio(p.precioAnterior)}`);
    elementos.modalMeta.innerHTML = metas.map(escapar).join("<br/>");

    productoModal = p;
    actualizarBotonModal(p);

    // Panel admin: editar (solo modo admin)
    const editorViejo = document.getElementById("editorProducto");
    if (editorViejo) editorViejo.remove();
    const btnEditarViejo = document.getElementById("btnEditarAdmin");
    if (btnEditarViejo) btnEditarViejo.remove();
    if (rol === "admin") {
      elementos.btnSeleccionarModal.insertAdjacentHTML("afterend",
        `<button class="btn-editar-admin" id="btnEditarAdmin" type="button">✎ Editar producto (admin)</button>`);
      const btnEditar = document.getElementById("btnEditarAdmin");
      if (btnEditar) btnEditar.addEventListener("click", () => abrirEditorProducto(p));
    }

    elementos.modalBackdrop.hidden = false;
    requestAnimationFrame(() => elementos.modalBackdrop.classList.add("visible"));
    document.body.style.overflow = "hidden";
    elementos.btnCerrarModal.focus();
  }

  function cerrarModal() {
    elementos.modalBackdrop.classList.remove("visible");
    document.body.style.overflow = "";
    productoModal = null;
    setTimeout(() => (elementos.modalBackdrop.hidden = true), 280);
  }

  /* ---------------- Edición admin (modal detalle) ---------------- */

  function guardarProductoEditado(p, cambios) {
    Object.assign(p, cambios);
    guardarDatos();
    renderizarTodo();
  }

  function eliminarProducto(p) {
    if (!confirm(`¿Eliminar "${p.nombre}" del catálogo?`)) return;
    productos = productos.filter((x) => x !== p);
    quitarDelCarrito(claveProducto(p));
    guardarDatos();
    cerrarModal();
    renderizarTodo();
    toast(`"${p.nombre}" eliminado.`);
  }

  function abrirEditorProducto(p) {
    let cont = document.getElementById("editorProducto");
    if (cont) cont.remove();
    cont = document.createElement("div");
    cont.id = "editorProducto";
    cont.className = "editor-producto";
    cont.innerHTML = `
      <h3>Editar producto</h3>
      <label>Nombre <input type="text" id="editNombre" value="${escapar(p.nombre)}" /></label>
      <label>Categoría
        <input type="text" id="editCategoria" value="${escapar(p.categoria || "")}" list="listaCategorias" />
        <datalist id="listaCategorias">
          ${[...new Set(productos.map((x) => x.categoria).filter(Boolean))]
            .map((c) => `<option value="${escapar(c)}"></option>`).join("")}
        </datalist>
      </label>
      <label>Descripción <textarea id="editDescripcion" rows="2">${escapar(p.descripcion || "")}</textarea></label>
      <label>Precio <input type="text" id="editPrecio" inputmode="decimal" value="${Number.isFinite(p.precio) ? p.precio : ""}" /></label>
      <label>Foto (URL) <input type="text" id="editImagen" value="${escapar(p.imagen || "")}" /></label>
      <label>Segunda foto (URL) <input type="text" id="editImagen2" value="${escapar(p.imagen2 || "")}" /></label>
      <label>Stock <input type="text" id="editStock" value="${escapar(p.stock || "")}" placeholder="Sí / No / cantidad" /></label>
      <div class="editor-botones">
        <button type="button" class="btn-seleccionar" id="editGuardar">Guardar</button>
        <button type="button" class="btn-editar-admin" id="editEliminar">Eliminar producto</button>
        <button type="button" class="btn-editar-admin" id="editCancelar">Cerrar</button>
      </div>`;
    elementos.modalTitulo.closest(".modal-contenido").appendChild(cont);

    $("editGuardar").addEventListener("click", () => {
      guardarProductoEditado(p, {
        nombre: $("editNombre").value.trim() || p.nombre,
        categoria: $("editCategoria").value.trim() || "Sin categoría",
        descripcion: $("editDescripcion").value.trim(),
        precio: parsearPrecio($("editPrecio").value),
        imagen: $("editImagen").value.trim(),
        imagen2: $("editImagen2").value.trim(),
        stock: $("editStock").value.trim(),
      });
      cerrarModal();
      toast(`"${p.nombre}" actualizado.`);
    });
    $("editEliminar").addEventListener("click", () => eliminarProducto(p));
    $("editCancelar").addEventListener("click", () => cont.remove());
    cont.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------------- Drawer (menú hamburguesa) ---------------- */

  function abrirDrawer() {
    elementos.drawerBackdrop.hidden = false;
    elementos.drawer.classList.add("abierto");
    elementos.drawer.setAttribute("aria-hidden", "false");
    elementos.btnMenu.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => elementos.drawerBackdrop.classList.add("visible"));
    elementos.btnCerrarDrawer.focus();
  }

  function cerrarDrawer() {
    elementos.drawerBackdrop.classList.remove("visible");
    elementos.drawer.classList.remove("abierto");
    elementos.drawer.setAttribute("aria-hidden", "true");
    elementos.btnMenu.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    setTimeout(() => (elementos.drawerBackdrop.hidden = true), 340);
    elementos.btnMenu.focus();
  }

  const abierto = () => elementos.drawer.classList.contains("abierto");

  /* ---------------- Carrito de cotización ---------------- */

  function guardarCarrito() {
    try { localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito)); } catch { }
  }

  function cargarCarrito() {
    try {
      const crudo = localStorage.getItem(CLAVE_CARRITO);
      const datos = crudo ? JSON.parse(crudo) : [];
      if (Array.isArray(datos)) carrito = datos.filter((i) => i && i.codigo && i.cant > 0);
    } catch { carrito = []; }
  }

  const totalCarrito = () =>
    carrito.reduce((t, i) => t + (Number.isFinite(i.precio) ? i.precio * i.cant : 0), 0);

  const unidadesCarrito = () => carrito.reduce((t, i) => t + i.cant, 0);

  function agregarAlCarrito(p, cant = 1) {
    const item = carrito.find((i) => claveProducto(i) === claveProducto(p));
    if (item) item.cant += cant;
    else carrito.push({ codigo: p.codigo, nombre: p.nombre, precio: p.precio, cant });
    guardarCarrito();
    renderizarCarrito();
  }

  function cambiarCantidad(codigo, delta) {
    const item = carrito.find((i) => claveProducto(i) === codigo);
    if (!item) return;
    item.cant += delta;
    if (item.cant <= 0) carrito = carrito.filter((i) => claveProducto(i) !== codigo);
    guardarCarrito();
    renderizarCarrito();
    renderizarGrid();
  }

  function quitarDelCarrito(codigo) {
    carrito = carrito.filter((i) => claveProducto(i) !== codigo);
    guardarCarrito();
    renderizarCarrito();
  }

  function renderizarCarrito() {
    const n = unidadesCarrito();
    elementos.carritoBadge.textContent = n > 99 ? "99+" : String(n);
    elementos.carritoBadge.hidden = n === 0;
    elementos.flotanteBadge.textContent = n > 99 ? "99+" : String(n);

    const hay = carrito.length > 0;
    elementos.carritoVacio.hidden = hay;
    elementos.carritoPie.hidden = !hay;

    elementos.carritoLista.replaceChildren();
    for (const item of carrito) {
      const li = document.createElement("li");
      li.className = "carrito-item";
      li.innerHTML = `
        <span class="carrito-item-nombre">${escapar(item.nombre)}</span>
        <span class="carrito-item-precio">${Number.isFinite(item.precio) ? escapar(formatearPrecio(item.precio * item.cant)) : "—"}</span>
        ${item.codigo ? `<span class="carrito-item-codigo">${escapar(item.codigo)}</span>` : ""}
        <div class="carrito-controles">
          <button class="btn-cant" data-accion="menos" aria-label="Quitar uno">−</button>
          <span class="carrito-cant">${item.cant}</span>
          <button class="btn-cant" data-accion="mas" aria-label="Agregar uno">+</button>
          <button class="btn-quitar" data-accion="quitar">Quitar</button>
        </div>`;
      const clave = claveProducto(item);
      li.querySelector('[data-accion="menos"]').addEventListener("click", () => cambiarCantidad(clave, -1));
      li.querySelector('[data-accion="mas"]').addEventListener("click", () => cambiarCantidad(clave, 1));
      li.querySelector('[data-accion="quitar"]').addEventListener("click", () => {
        quitarDelCarrito(clave);
        renderizarGrid();
      });
      elementos.carritoLista.appendChild(li);
    }

    elementos.carritoTotal.textContent = formatearPrecio(totalCarrito()) || "A consultar";
    elementos.btnFlotanteCarrito.classList.toggle("visible", n > 0);
  }

  function abrirCarrito() {
    elementos.carritoBackdrop.hidden = false;
    elementos.carritoDrawer.classList.add("abierto");
    elementos.carritoDrawer.setAttribute("aria-hidden", "false");
    elementos.btnCarrito.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => elementos.carritoBackdrop.classList.add("visible"));
    elementos.btnCerrarCarrito.focus();
  }

  function cerrarCarrito() {
    elementos.carritoBackdrop.classList.remove("visible");
    elementos.carritoDrawer.classList.remove("abierto");
    elementos.carritoDrawer.setAttribute("aria-hidden", "true");
    elementos.btnCarrito.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    setTimeout(() => (elementos.carritoBackdrop.hidden = true), 340);
  }

  /* ---------------- Cotización → WhatsApp ---------------- */

  function textoCotizacion() {
    const fecha = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
    const lineas = carrito.map((i) => {
      const precio = Number.isFinite(i.precio)
        ? ` — ${prefs.moneda} ${new Intl.NumberFormat("es-CO").format(i.precio * i.cant)}`
        : "";
      return `• ${i.cant} × ${i.nombre}${i.codigo ? ` (${i.codigo})` : ""}${precio}`;
    });
    const total = totalCarrito();
    const lineaTotal = Number.isFinite(total) && total > 0
      ? `\n\n*Total: ${prefs.moneda} ${new Intl.NumberFormat("es-CO").format(total)}*`
      : "\n\n*(precios a confirmar)*";
    return `¡Hola Perfumare! Quiero cotizar estas fragancias (${fecha}):\n\n${lineas.join("\n")}${lineaTotal}\n\n¿Me confirmas disponibilidad y tiempo de entrega? ¡Gracias!`;
  }

  function enviarCotizacion() {
    if (!carrito.length) return toast("Tu selección está vacía.", true);
    const texto = textoCotizacion();
    const url = `https://wa.me/${destinoActivo().num}?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  }

  /* ---------------- Inicialización ---------------- */

  function conectarEventos() {
    // Menú
    elementos.btnMenu.addEventListener("click", () => (abierto() ? cerrarDrawer() : abrirDrawer()));
    elementos.btnCerrarDrawer.addEventListener("click", cerrarDrawer);
    elementos.drawerBackdrop.addEventListener("click", cerrarDrawer);

    // Búsqueda con debounce
    let debounce;
    elementos.inputBusqueda.addEventListener("input", () => {
      elementos.btnLimpiarBusqueda.hidden = !elementos.inputBusqueda.value;
      clearTimeout(debounce);
      debounce = setTimeout(renderizarGrid, 130);
    });
    elementos.btnLimpiarBusqueda.addEventListener("click", () => {
      elementos.inputBusqueda.value = "";
      elementos.btnLimpiarBusqueda.hidden = true;
      renderizarGrid();
      elementos.inputBusqueda.focus();
    });

    // Filtros
    elementos.selOrden.addEventListener("change", renderizarGrid);
    elementos.inputPrecioMax.addEventListener("input", () => {
      const conPrecio = productos.filter((p) => Number.isFinite(p.precio));
      const max = conPrecio.length ? Math.max(...conPrecio.map((p) => p.precio)) : 0;
      actualizarEtiquetaPrecio(max);
      renderizarGrid();
    });

    // Preferencias
    elementos.chkPrecios.addEventListener("change", () => {
      prefs.mostrarPrecios = elementos.chkPrecios.checked;
      guardarPrefs();
      renderizarTodo();
    });
    elementos.selMoneda.addEventListener("change", () => {
      prefs.moneda = elementos.selMoneda.value;
      guardarPrefs();
      renderizarGrid();
      renderizarCarrito();
    });

    // Modal
    elementos.btnCerrarModal.addEventListener("click", cerrarModal);
    elementos.modalBackdrop.addEventListener("click", (e) => {
      if (e.target === elementos.modalBackdrop) cerrarModal();
    });

    // Botón seleccionar del modal
    elementos.btnSeleccionarModal.addEventListener("click", () => {
      if (!productoModal) return;
      const dentro = estaEnCarrito(productoModal);
      // Busca la tarjeta correspondiente para animar
      const art = [...elementos.grid.children].find(
        (a) => a.getAttribute("aria-label") === productoModal.nombre
      );
      const check = art ? art.querySelector(".tarjeta-check") : null;
      if (dentro) {
        quitarDelCarrito(claveProducto(productoModal));
        if (art) art.classList.remove("seleccionada");
        if (check) {
          check.classList.remove("marcado");
          check.setAttribute("aria-checked", "false");
          animarSeleccion(art, check);
        }
      } else {
        agregarAlCarrito(productoModal);
        if (art) art.classList.add("seleccionada");
        if (check) {
          check.classList.add("marcado");
          check.setAttribute("aria-checked", "true");
          animarSeleccion(art, check);
          volarAlCarrito(check);
        } else {
          volarAlCarrito(elementos.btnSeleccionarModal);
        }
      }
      actualizarBotonModal(productoModal);
    });

    // Admin: importar / exportar / vaciar / login
    const dispararImport = () => {
      if (abierto()) cerrarDrawer();
      elementos.inputArchivo.click();
    };
    [elementos.btnImportarTop, elementos.btnImportarMenu].forEach((b) =>
      b.addEventListener("click", dispararImport)
    );
    elementos.inputArchivo.addEventListener("change", () => {
      const f = elementos.inputArchivo.files[0];
      if (f) importarArchivo(f);
    });

    // Drag & drop sobre toda la página (solo admin)
    ["dragover", "drop"].forEach((ev) =>
      document.addEventListener(ev, (e) => {
        if (rol !== "admin") return;
        e.preventDefault();
        if (ev === "drop" && e.dataTransfer.files[0]) importarArchivo(e.dataTransfer.files[0]);
      })
    );

    elementos.btnExportar.addEventListener("click", () => { cerrarDrawer(); exportarCSV(); });
    elementos.btnVaciar.addEventListener("click", () => {
      if (!productos.length) return toast("El catálogo ya está vacío.");
      if (confirm("¿Vaciar el catálogo completo? (solo afecta este navegador)")) {
        productos = [];
        guardarDatos();
        categoriaActiva = "todas";
        renderizarTodo();
        cerrarDrawer();
        toast("Catálogo vaciado (en este navegador).");
      }
    });
    elementos.btnSalirAdmin.addEventListener("click", salirAdmin);

    elementos.btnCerrarLogin.addEventListener("click", cerrarLogin);
    elementos.loginBackdrop.addEventListener("click", (e) => {
      if (e.target === elementos.loginBackdrop) cerrarLogin();
    });
    elementos.formLogin.addEventListener("submit", (e) => {
      e.preventDefault();
      intentarLogin(elementos.inputClave.value);
    });

    // Teclado global
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!elementos.loginBackdrop.hidden) cerrarLogin();
        else if (elementos.carritoDrawer.classList.contains("abierto")) cerrarCarrito();
        else if (!elementos.modalBackdrop.hidden) cerrarModal();
        else if (abierto()) cerrarDrawer();
      }
      if (e.key === "/" && document.activeElement !== elementos.inputBusqueda) {
        e.preventDefault();
        elementos.inputBusqueda.focus();
      }
    });

    // Carrito
    elementos.btnCarrito.addEventListener("click", abrirCarrito);
    elementos.btnFlotanteCarrito.addEventListener("click", abrirCarrito);
    elementos.btnCerrarCarrito.addEventListener("click", cerrarCarrito);
    elementos.carritoBackdrop.addEventListener("click", cerrarCarrito);
    elementos.btnEnviarCotizacion.addEventListener("click", enviarCotizacion);
  }

  function cargarInicial() {
    cargarPrefs();
    cargarDestino();
    cargarCarrito();

    // 1) Datos guardados en este navegador (importados por admin)
    try {
      const crudo = localStorage.getItem(CLAVE_DATOS);
      if (crudo) {
        const datos = JSON.parse(crudo);
        if (Array.isArray(datos) && datos.length) productos = datos;
      }
    } catch { /* ignorar */ }

    // 2) Si no hay nada local, cargar el CSV publicado en el repo
    if (!productos.length) {
      fetch(CSV_REPO, { headers: { Accept: "text/csv" } })
        .then((r) => (r.ok ? r.text() : Promise.reject()))
        .then((texto) => {
          const nuevos = csvABjetos(texto);
          if (nuevos.length) {
            productos = nuevos;
            renderizarTodo();
          }
        })
        .catch(() => {
          elementos.estadoVacio.hidden = false;
          toast("No se pudo cargar el catálogo.", true);
        });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    conectarEventos();
    try { rol = localStorage.getItem(CLAVE_ROL) === "admin" ? "admin" : "invitado"; } catch { }
    aplicarRol();
    cargarInicial();
    renderizarCarrito();
    renderizarTodo();
  });
})();

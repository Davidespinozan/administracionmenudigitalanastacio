# Admin Anastacio — notas de arquitectura

**Ámbito del sistema:** este admin mide SOLO el canal digital (pedidos del menú
online por WhatsApp y tarjeta). La sucursal vende también en sitio con su propio
punto de venta, que NO pasa por aquí — por eso la sección se llama "Corte online"
y no "Corte de caja". Nunca presentar estos números como la venta total del negocio.

Panel de administración estático: `index.html` (markup) + `admin.css` + `admin.js` + `sw.js` (PWA).
Sin build, sin frameworks. Backend: Supabase (auth, tablas `orders`, `leads`, `page_views`, `pixel_events`, realtime).
`adminmenu.html` es solo un redirect a `/` — **no** es una copia del admin.

## Antes de desplegar

1. `node scripts/check.mjs` — debe salir todo verde.
2. `npm run test:e2e` — smoke en navegador real (requiere `npm install` una vez). CI lo corre en cada push.
3. Subir la versión de `CACHE_NAME` en `sw.js` (v46 → v47 → …). Sin esto las PWAs instaladas tardan en ver el cambio.
4. Commit atómico por mejora; revertir = `git revert`.

## URLs de producción

- **Admin**: https://menuanastacioadmin.netlify.app (este repo, deploy automático al push a main).
  Ojo: `anastacioadmin.netlify.app` es un nombre viejo que ya no existe.
- **Menú público**: https://anastaciomarisqueria.com — la raíz sirve `landing.html`; el menú real
  (carrito/checkout) está en `/cln` → `index.html` (ver `_redirects` en `~/anastacio-1`).
  Repo: `~/anastacio-1` → github.com/Davidespinozan/anastacio, deploy automático al push a main.

## Integración con el resto del sistema

- `sql/` — scripts para correr en Supabase SQL Editor (RLS, columnas). Cada uno documenta el porqué y termina con verificación.
- `integracion-menu/README.md` — cambios pendientes de aplicar en el menú público (`~/anastacio-1`): guardar pedidos de WhatsApp y `payment_method`. **Respetar el orden de despliegue que indica.**
- El webhook de Stripe (`smart-function`) inserta los pedidos pagados con tarjeta server-side.

## NO hacer (cada punto es un bug que ya pasó)

1. **NO insertar datos externos con `innerHTML` sin `esc()`.** Nombres de clientes, direcciones, items,
   UTMs y eventos de pixel los escribe el público: sin escapar es XSS almacenado dentro del admin.
2. **NO usar `alert()`/`confirm()`.** Errores → `showNotification(msg,'error')`. Acciones destructivas →
   `confirmDialog(titulo, msg, onYes)`.
3. **NO duplicar `index.html` en `adminmenu.html`.** Vivimos meses editando dos copias de 81KB.
4. **NO recrear charts con `destroy()` + `new Chart()`.** Usar `upsertChart(id, cfg)` — actualiza datos
   sin animación y evita el parpadeo en cada refresh.
5. **NO agregar `setInterval` de datos sin condición de sesión y visibilidad.** El polling vive en un solo
   lugar (final de `admin.js`): 30s, solo logueado, solo pestaña visible, y se salta el tick si el
   realtime acaba de recargar.
6. **NO exportar CSV concatenando strings.** Usar `csvCell()` (escapa comillas y neutraliza fórmulas de Excel).
7. **NO mezclar color de marca con color de estado.** Dorado = marca/decoración. Verde/ámbar/rojo = estados
   (confirmado/pendiente/cancelado, deltas ▲▼) y son fijos.

## Convenciones

- El JS es ES5-style (`var` + `function`) a propósito: un solo estilo en todo el archivo.
- Lógica pura (rangos de fecha, formateo, agregaciones) separada del DOM cuando sea posible — es lo testeable.
- Comentar el *porqué* (qué bug evita), no el *qué*.
- Métricas nuevas en el dashboard solo si responden una pregunta accionable; sin dato previo se muestra
  vacío, nunca un "0%" engañoso.

## Deuda / pendientes conocidos

- Verificar en Supabase que `anon` NO pueda leer `orders`/`leads`/`page_views`/`pixel_events` (RLS).
- Smoke test real con Playwright (abrir página, consola limpia) — hoy `scripts/check.mjs` cubre lo estático.
- `filterByDate()` en realidad solo filtra por sucursal (la fecha se filtra en la query); renombrar cuando
  haya red de tests.

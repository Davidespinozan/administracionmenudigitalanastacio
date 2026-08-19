# Integración con el menú público (`~/anastacio-1`)

Objetivo: que **los pedidos por WhatsApp también se guarden en Supabase** (hoy solo
se guardan los pagados con Stripe, vía webhook) y que todo pedido traiga
`payment_method` ('whatsapp' | 'stripe').

## Orden de despliegue (importante)

1. Correr `sql/2026-08-19_payment_method_y_rls.sql` en Supabase → SQL Editor.
2. Aplicar el **cambio 1** al menú y desplegarlo.
3. Aplicar el **cambio 2** al webhook y redesplegarlo: `supabase functions deploy smart-function`.
4. Desplegar el admin (ya trae el soporte).

## Cambio 1 — `index.html` del menú, función `sendToWhatsApp()`

En `~/anastacio-1/index.html`, dentro de `sendToWhatsApp()`, **justo antes** de:

```js
  var msg = encodeURIComponent(lines.join("\n"));
  window.open("https://wa.me/" + WA_NUMBER + "?text=" + msg, "_blank");
```

pegar:

```js
  // Guardar el pedido en Supabase ANTES de abrir WhatsApp, para que el admin
  // tenga trazabilidad (antes solo se guardaban los pagados con Stripe).
  // Fire-and-forget: si el insert falla, el pedido por WhatsApp sigue igual.
  var _waKey = JSON.stringify([orderType, getTotal(), cart.length]);
  if (_waKey !== window._lastWaOrderKey || Date.now() - (window._lastWaOrderAt || 0) > 60000) {
    window._lastWaOrderKey = _waKey; window._lastWaOrderAt = Date.now();
    try {
      if (typeof sbClient !== 'undefined') {
        sbClient.from('orders').insert({
          order_type: orderType,
          customer_name: orderType === 'domicilio' ? (dName || null) : orderType === 'recoger' ? (pName || null) : ('Mesa ' + (mesaNum || '')),
          customer_phone: (orderType === 'domicilio' ? dPhone : orderType === 'recoger' ? pPhone : '') || null,
          delivery_address: (orderType === 'domicilio' ? dAddr : '') || null,
          table_number: (orderType === 'mesa' ? mesaNum : '') || null,
          pickup_time: (orderType === 'recoger' ? pTime : '') || null,
          items: cart.map(function(i) { return { name: i.name, qty: i.qty, price: i.price }; }),
          total: getTotal(),
          status: 'pending',
          sucursal: BRANCH.slug,
          payment_method: 'whatsapp'
        }).then(function(r) { if (r.error) console.error('order insert:', r.error.message); });
      }
    } catch (e) { console.error('order insert:', e); }
  }
```

Notas:
- `dName/dPhone/dAddr/pName/pPhone/pTime/mesaNum` ya existen en esa función
  (declaradas con `var` en las ramas de arriba, así que están en scope).
- La guardia de 60s evita duplicar el pedido si el cliente vuelve a picar el botón.
- Un pedido WhatsApp es una *intención*: si el cliente nunca manda el mensaje,
  el pedido queda `pending` — cancelarlo desde el admin para que no infle ventas.

## Cambio 2 — webhook de Stripe (`supabase/functions/smart-function/index.ts`)

En el `orderPayload` (≈línea 162), agregar una línea:

```ts
    status: "pending",
    sucursal: metadata.sucursal || null,
    payment_method: "stripe",          // ← NUEVA LÍNEA
    stripe_session_id: session.id, // para idempotency
```

y redesplegar: `supabase functions deploy smart-function` (desde `~/anastacio-1`).

## Qué hace el admin con esto (ya desplegado en este repo)

- Badge Tarjeta/WhatsApp en cada pedido (Pedidos y Caja).
- Corte de caja con desglose de venta por método de pago.
- Columna `Metodo` en los CSV de pedidos y del corte.
- Los pedidos viejos sin método muestran vacío (el SQL hace backfill de los
  de Stripe usando `stripe_session_id`).

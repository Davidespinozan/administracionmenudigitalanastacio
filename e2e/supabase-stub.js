// Stub de supabase-js para pruebas locales: reemplaza al SDK del CDN y sirve
// datos realistas generados en memoria (140 días de pedidos, leads, visitas y
// eventos de pixel). Determinista (LCG con semilla fija) para capturas estables.
(function () {
  var DAY = 864e5, now = Date.now();
  function rnd(seed) {
    var s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
  }
  var r = rnd(42);
  var NAMES = ['Juan Pérez', 'María García', 'Luis Beltrán', 'Ana Sánchez', 'Carlos López', 'Fernanda Ríos', 'Jorge Castro', 'Lucía Medina', 'Pedro Ibarra', 'Sofía Vega', 'Memo Zazueta', 'Paty Angulo'];
  var PHONES = []; for (var i = 0; i < 40; i++) PHONES.push('667' + String(1000000 + Math.floor(r() * 8999999)));
  var ITEMS = [['Aguachile negro', 185], ['Tostada de marlin', 45], ['Ceviche de camarón', 120], ['Callo de hacha', 210], ['Camarones zarandeados', 240], ['Taco gobernador', 55], ['Torre de mariscos', 260], ['Pescado zarandeado', 380], ['Agua de jamaica', 35], ['Cerveza Pacífico', 40]];
  var STATUSES = ['delivered', 'delivered', 'delivered', 'delivered', 'confirmed', 'preparing', 'ready', 'cancelled'];
  var TYPES = ['domicilio', 'recoger', 'mesa'];

  var orders = [], id = 1;
  for (var d = 140; d >= 0; d--) {
    var n = 3 + Math.floor(r() * 6);
    for (var k = 0; k < n; k++) {
      var t = new Date(now - d * DAY); t.setHours(12 + Math.floor(r() * 11), Math.floor(r() * 60), 0, 0);
      var items = [], total = 0, ni = 1 + Math.floor(r() * 3);
      for (var j = 0; j < ni; j++) { var it = ITEMS[Math.floor(r() * ITEMS.length)]; var q = 1 + Math.floor(r() * 2); items.push({ name: it[0], qty: q, price: it[1] }); total += q * it[1]; }
      var type = TYPES[Math.floor(r() * 3)];
      orders.push({
        id: 'ord-' + (id++), created_at: t.toISOString(),
        order_type: type, status: d === 0 && k < 2 ? 'pending' : STATUSES[Math.floor(r() * STATUSES.length)],
        customer_name: NAMES[Math.floor(r() * NAMES.length)],
        customer_phone: PHONES[Math.floor(r() * PHONES.length)],
        delivery_address: type === 'domicilio' ? 'Cdad. de Puebla 1318, Las Quintas' : null,
        table_number: type === 'mesa' ? String(1 + Math.floor(r() * 12)) : null,
        pickup_time: type === 'recoger' ? '8:30 PM' : null,
        items: items, total: total, sucursal: 'cln',
        payment_method: d > 3 ? (r() < 0.8 ? null : 'stripe') : (r() < 0.6 ? 'whatsapp' : 'stripe'),
        stripe_session_id: null
      });
    }
  }
  var leads = [];
  for (var d2 = 60; d2 >= 0; d2--) {
    if (r() < 0.6) {
      var t2 = new Date(now - d2 * DAY); t2.setHours(13 + Math.floor(r() * 8), Math.floor(r() * 60), 0, 0);
      leads.push({ id: 'lead-' + d2, created_at: t2.toISOString(), name: NAMES[Math.floor(r() * NAMES.length)], phone: PHONES[Math.floor(r() * PHONES.length)], email: r() < 0.5 ? 'cliente' + d2 + '@gmail.com' : null, source: r() < 0.5 ? 'bar' : 'modal', sucursal: 'cln' });
    }
  }
  var SRC = ['directo', 'directo', 'directo', 'instagram', 'facebook', 'google', 'tiktok'];
  var page_views = [], pixel_events = [], vid = 1;
  for (var d3 = 40; d3 >= 0; d3--) {
    var nv = 25 + Math.floor(r() * 45);
    for (var k3 = 0; k3 < nv; k3++) {
      var t3 = new Date(now - d3 * DAY); t3.setHours(10 + Math.floor(r() * 13), Math.floor(r() * 60), 0, 0);
      var v = 'v' + (1 + Math.floor(r() * 400));
      var src = SRC[Math.floor(r() * SRC.length)];
      page_views.push({ id: 'pv' + (vid++), created_at: t3.toISOString(), visitor_id: v, utm_source: src === 'directo' ? null : src, referrer_source: src, sucursal: 'cln' });
      if (r() < 0.3) pixel_events.push({ id: 'px' + (vid++), created_at: t3.toISOString(), visitor_id: v, event_name: 'AddToCart', event_data: { content_name: ITEMS[Math.floor(r() * ITEMS.length)][0] }, sucursal: 'cln' });
      if (r() < 0.15) pixel_events.push({ id: 'px' + (vid++), created_at: t3.toISOString(), visitor_id: v, event_name: 'InitiateCheckout', event_data: { method: r() < 0.7 ? 'whatsapp' : 'stripe' }, sucursal: 'cln' });
      if (r() < 0.08) pixel_events.push({ id: 'px' + (vid++), created_at: t3.toISOString(), visitor_id: v, event_name: 'Purchase', event_data: {}, sucursal: 'cln' });
      if (r() < 0.5) pixel_events.push({ id: 'px' + (vid++), created_at: t3.toISOString(), visitor_id: v, event_name: 'ScrollDepth', event_data: { percent: [25, 50, 75, 100][Math.floor(r() * 4)] }, sucursal: 'cln' });
    }
  }
  var TABLES = { orders: orders, leads: leads, page_views: page_views, pixel_events: pixel_events };

  function makeQuery(table) {
    var rows = TABLES[table] || [];
    var q = { _gte: null, _lt: null, _asc: false, _limit: null, _range: null, _update: null, _eq: null };
    var api = {
      select: function () { return api; },
      gte: function (c, v) { q._gte = v; return api; },
      lt: function (c, v) { q._lt = v; return api; },
      order: function (c, o) { q._asc = !!(o && o.ascending); return api; },
      limit: function (n) { q._limit = n; return api; },
      range: function (a, b) { q._range = [a, b]; return api; },
      eq: function (c, v) { q._eq = v; return api; },
      in: function (c, v) { q._in = v; return api; },
      update: function (p) { q._update = p; return api; },
      then: function (res, rej) {
        if (q._update) {
          rows.filter(function (x) { return q._in ? q._in.indexOf(x.id) > -1 : x.id === q._eq; })
            .forEach(function (o) { Object.assign(o, q._update); });
          return Promise.resolve({ data: null, error: null }).then(res, rej);
        }
        var out = rows.filter(function (x) { return (!q._gte || x.created_at >= q._gte) && (!q._lt || x.created_at < q._lt); });
        out = out.slice().sort(function (a, b) { return q._asc ? (a.created_at < b.created_at ? -1 : 1) : (a.created_at > b.created_at ? -1 : 1); });
        if (q._range) out = out.slice(q._range[0], q._range[1] + 1);
        else if (q._limit) out = out.slice(0, q._limit);
        return Promise.resolve({ data: out, error: null }).then(res, rej);
      }
    };
    return api;
  }
  var chan = { on: function () { return chan; }, subscribe: function () { return chan; } };
  window.supabase = {
    createClient: function () {
      return {
        from: makeQuery,
        auth: {
          getSession: function () { return Promise.resolve({ data: { session: window.__MOCK_NO_SESSION ? null : { user: { email: 'demo@anastacio.mx' } } } }); },
          onAuthStateChange: function () {},
          signInWithPassword: function () { return Promise.resolve({ data: {}, error: null }); },
          signOut: function () { return Promise.resolve({}); }
        },
        channel: function () { return chan; }
      };
    }
  };
})();

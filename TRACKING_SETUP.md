# Setup de Tracking de Visitantes

## 1. Crear la tabla en Supabase

Ve a tu dashboard de Supabase > SQL Editor y ejecuta:

```sql
CREATE TABLE page_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  visitor_id text,
  page text,
  referrer text,
  referrer_source text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  user_agent text,
  device_type text,
  screen_width int,
  ip text
);

-- Habilitar RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Permitir inserts desde el menu (anon)
CREATE POLICY "Allow anon insert" ON page_views
  FOR INSERT TO anon WITH CHECK (true);

-- Permitir lectura desde el admin (anon)
CREATE POLICY "Allow anon read" ON page_views
  FOR SELECT TO anon USING (true);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE page_views;

-- Index para queries rapidas por fecha
CREATE INDEX idx_page_views_created ON page_views(created_at DESC);
```

## 2. Agregar este snippet al HTML del MENU (pagina publica)

Pega esto ANTES del cierre `</body>` en tu menu:

```html
<script>
(function(){
  var SUPABASE_URL='https://hqrwjlrqzslkwhwqcmnh.supabase.co';
  var SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxcndqbHJxenNsa3dod3FjbW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMDYwMTcsImV4cCI6MjA4Nzg4MjAxN30.tNyO18E7lDNEYH28P_DGxSg9pf1yYysVpJuMwboJOoU';

  // Visitor ID persistente (cookie-less)
  var vid = localStorage.getItem('_av');
  if(!vid){ vid = 'v_' + Math.random().toString(36).substr(2,9) + Date.now().toString(36); localStorage.setItem('_av', vid); }

  // Extraer UTM params
  var params = new URLSearchParams(window.location.search);
  var utmSource = params.get('utm_source') || '';
  var utmMedium = params.get('utm_medium') || '';
  var utmCampaign = params.get('utm_campaign') || '';

  // Detectar fuente del referrer
  var ref = document.referrer || '';
  var refSource = 'directo';
  if(ref.indexOf('facebook.com')>-1 || ref.indexOf('fb.com')>-1) refSource = 'facebook';
  else if(ref.indexOf('instagram.com')>-1) refSource = 'instagram';
  else if(ref.indexOf('google.com')>-1) refSource = 'google';
  else if(ref.indexOf('tiktok.com')>-1) refSource = 'tiktok';
  else if(ref) refSource = new URL(ref).hostname;

  // Si viene de Meta ads, el utm_source prevalece
  if(utmSource) refSource = utmSource;

  // Detectar dispositivo
  var ua = navigator.userAgent;
  var deviceType = /Mobile|Android|iPhone|iPad/.test(ua) ? 'mobile' : 'desktop';

  // Enviar a Supabase via REST API (no necesita cargar el SDK)
  fetch(SUPABASE_URL + '/rest/v1/page_views', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      visitor_id: vid,
      page: window.location.pathname,
      referrer: ref,
      referrer_source: refSource,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
      user_agent: ua,
      device_type: deviceType,
      screen_width: window.screen.width
    })
  }).catch(function(){});
})();
</script>
```

## 3. UTM params para tus anuncios de Meta

Cuando crees anuncios en Meta, usa estos UTM params en la URL del menu:

```
https://tu-menu.com/?utm_source=facebook&utm_medium=paid&utm_campaign=nombre_campana
```

O para Instagram:
```
https://tu-menu.com/?utm_source=instagram&utm_medium=paid&utm_campaign=nombre_campana
```

Esto permite que el admin muestre exactamente cuantas visitas vienen de cada campana de Meta.

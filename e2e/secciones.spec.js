// Recorre las 9 secciones del admin con datos simulados (stub de Supabase) en
// móvil y desktop, exigiendo cero errores de JS y que el dashboard tenga datos.
// Con SHOTS=<dir> además guarda capturas de cada sección para revisión visual.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const STUB = fs.readFileSync(path.join(__dirname, 'supabase-stub.js'), 'utf8');
const TABS = ['dashboard', 'orders', 'caja', 'reports', 'clientes', 'leads', 'analytics', 'visitors', 'products'];
const SHOTS = process.env.SHOTS || '';

async function setup(page) {
  await page.route('**/@supabase/**', (r) => r.fulfill({ contentType: 'application/javascript', body: STUB }));
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text());
  });
  await page.goto('/');
  return errors;
}

for (const vp of [{ name: 'movil', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 900 }]) {
  test(`las 9 secciones renderizan con datos y sin errores (${vp.name})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    const errors = await setup(page);

    // La sesión simulada entra directo al panel
    await expect(page.locator('#admin-app')).toBeVisible();
    await page.waitForTimeout(1500);

    for (const tab of TABS) {
      await page.evaluate((t) => switchTab(t, document.querySelector('.side-item[data-tab="' + t + '"]')), tab);
      await page.waitForTimeout(800);
      await expect(page.locator('#panel-' + tab)).toBeVisible();
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/${vp.name}-${tab}.png`, fullPage: true });
    }

    if (vp.name === 'movil' && SHOTS) {
      await page.evaluate(() => toggleMore(true));
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS}/movil-mas.png` });
      await page.evaluate(() => toggleMore(false));
    }

    await page.evaluate(() => switchTab('dashboard', null));
    await page.waitForTimeout(400);
    expect(await page.locator('#s-orders').textContent()).not.toBe('—');
    expect(await page.locator('#r-total').textContent()).not.toBe('—');
    expect(errors).toEqual([]);
  });
}

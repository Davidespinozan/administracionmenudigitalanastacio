// Smoke: la página carga, el login renderiza y no hay errores de JS.
// Atrapa la mayoría de los crashes de un admin de archivos estáticos.
const { test, expect } = require('@playwright/test');

test('el admin carga y el login renderiza sin errores de JS', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    // Los fallos de recursos externos (CDN/imágenes) son ambientales, no bugs del código
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) {
      errors.push('console: ' + m.text());
    }
  });

  await page.goto('/');
  await expect(page).toHaveTitle(/Anastacio/);
  await expect(page.locator('.login-card')).toBeVisible();
  await expect(page.locator('#login-btn')).toHaveText('Entrar');
  await expect(page.locator('#login-email')).toBeVisible();

  // Dar tiempo a que corran los scripts (createClient, getSession, registro del SW)
  await page.waitForTimeout(1500);
  expect(errors).toEqual([]);
});

test('adminmenu.html redirige a /', async ({ page }) => {
  await page.goto('/adminmenu.html');
  await page.waitForURL('**/');
  await expect(page.locator('.login-card')).toBeVisible();
});

// Verificación pre-deploy del admin. Correr con: node scripts/check.mjs
// Sin dependencias. Falla (exit 1) si algo está roto.
import { readFileSync } from 'fs';
import { execFileSync } from 'child_process';

const errs = [];
const ok = (msg) => console.log('  OK — ' + msg);
const fail = (msg) => { errs.push(msg); console.error('  *** FALLA — ' + msg); };

const html = readFileSync('index.html', 'utf8');
const js = readFileSync('admin.js', 'utf8');
const sw = readFileSync('sw.js', 'utf8');
const adminmenu = readFileSync('adminmenu.html', 'utf8');

// 1. Sintaxis de admin.js y sw.js
for (const f of ['admin.js', 'sw.js']) {
  try { execFileSync('node', ['--check', f], { stdio: 'pipe' }); ok(`sintaxis válida: ${f}`); }
  catch (e) { fail(`sintaxis inválida en ${f}: ${e.stderr}`); }
}

// 2. Todo getElementById('x') literal del JS debe existir como id="x" en el HTML
const htmlIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
const jsIds = [...js.matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1]);
const missing = [...new Set(jsIds)].filter(id => !htmlIds.has(id));
if (missing.length) fail(`ids usados en admin.js que no existen en index.html: ${missing.join(', ')}`);
else ok(`los ${new Set(jsIds).size} ids referenciados en admin.js existen en index.html`);

// 3. Toda función usada en onclick/onchange del HTML debe estar definida en admin.js
const handlers = [...html.matchAll(/on(?:click|change|input)="(?:if\([^)]*\))?([a-zA-Z_$][\w$]*)\(/g)].map(m => m[1]);
const undef = [...new Set(handlers)].filter(fn => !new RegExp(`function ${fn}\\(`).test(js));
if (undef.length) fail(`handlers del HTML sin función en admin.js: ${undef.join(', ')}`);
else ok(`los ${new Set(handlers).size} handlers del HTML están definidos en admin.js`);

// 4. Anti-patrones vetados (ver NOTES.md)
if (/\balert\(/.test(js)) fail('alert() detectado — usar showNotification(msg, "error")');
else ok('sin alert()');
if (!/function esc\(/.test(js)) fail('falta el helper esc() — obligatorio para innerHTML con datos externos');
else ok('esc() presente');

// 5. index.html debe referenciar los archivos extraídos; adminmenu debe seguir siendo redirect
if (!html.includes('/admin.js') || !html.includes('/admin.css')) fail('index.html no referencia /admin.js o /admin.css');
else ok('index.html referencia admin.js y admin.css');
if (adminmenu.length > 1000 || !adminmenu.includes('location.replace')) fail('adminmenu.html dejó de ser un redirect — NO debe duplicar index.html');
else ok('adminmenu.html sigue siendo redirect');
if (!sw.includes('/admin.css') || !sw.includes('/admin.js')) fail('sw.js no precachea admin.css/admin.js');
else ok('sw.js precachea los assets');

console.log(errs.length ? `\n${errs.length} problema(s). NO desplegar.` : '\nTodo verde. Recuerda subir CACHE_NAME en sw.js antes de desplegar.');
process.exit(errs.length ? 1 : 0);

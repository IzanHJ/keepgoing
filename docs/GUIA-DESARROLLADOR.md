# Guía del desarrollador de KeepGoing

Documento interno del equipo (dueño y desarrolladores). No se enlaza desde la app ni se menciona a los usuarios.

Está pensada para que puedas leer el código, entender cómo encaja todo y hacer cambios tú mismo con seguridad.

---

## 1. De qué está hecha la app

KeepGoing es una **web instalable (PWA)**: HTML, CSS y JavaScript «a pelo», sin frameworks ni compilación. Lo que hay en el repositorio es exactamente lo que se publica.

| Pieza | Dónde | Para qué |
|---|---|---|
| Página | `index.html` | Carga los estilos y los scripts en orden. Tiene la política de seguridad (CSP). |
| Estilos | `css/app.css` | Todo el diseño. Los colores salen de variables (`--bg`, `--fg`, `--accent`…). |
| App | `js/app.js` | Interfaz y comportamiento: pinta las pantallas, responde a los toques, guarda y sincroniza. |
| Lógica pura | `js/*.js` sin `i18n` | Cálculos sin pantalla (Libreta, Calculadora, turnos, divisas, planes…). Se prueban con tests. |
| Textos | `js/i18n*.js` | Todos los textos en español e inglés. Cada versión añade su archivo. |
| Funcionamiento sin conexión | `sw.js` | «Service worker»: guarda una copia de la app para abrirla sin internet. |
| Servidor | `supabase/` | Base de datos (migraciones SQL) y funciones en la nube (Edge Functions). |
| Web y textos legales | `web/`, `legal/` | Tienda (pago con Paddle) y aviso legal, privacidad, términos y reembolsos. |
| Pruebas | `tests/` | Pruebas automáticas de la lógica (`*.test.js`) y del SQL (`tests/sql`). |

### Mapa de `js/app.js`

Es un archivo grande dividido en secciones con un comentario `/* ===== … ===== */`. Búscalas por su título:

| Sección | Qué hay |
|---|---|
| Arriba del todo | Utilidades de fechas (`todayKey`, `addDays`, `addMonths`), iconos (`ICONS` / `ico()`), estado por defecto (`defaultState`) y `normalize` (repara datos viejos). |
| Fusión | `mergeStates`: cómo se juntan los datos de dos dispositivos (gana lo cambiado más tarde). |
| CALENDARIO DE TURNOS | Pestaña Calendario (prefijo `tf…`). |
| RENDER | `render()` y las vistas de cada pestaña (`viewHabits`, `viewLedger`, `viewCal`, `viewChat`, `viewMastery`). |
| SINCRONIZACIÓN | Cuenta (`signIn`, `signUp`), `syncNow` y `sbFetch` (todas las llamadas a Supabase). |
| PLANES | Free / prueba / Usuario KeepGoing, avisos de pago, keys y panel del equipo (`openStaff`). |
| LIBRETA DE GASTOS | Libreta cifrada (prefijo `LV`), movimientos, categorías, presupuestos. |
| PATRIMONIO ACTUAL / CALCULADORA | Widgets de la Libreta. |
| FASE 2 | Testigo, mascota, perfil público, recordatorios, chat y grupos (`rpc(...)`). |
| EVENTOS | El gran `document.addEventListener('click', …)`: cada botón tiene `data-act="…"` y aquí se decide qué hace. |

### Cómo funciona un toque

1. Las pantallas se pintan como texto HTML con plantillas (`` `<button data-act="habit-new">…` ``).
2. Al tocar, el manejador de **EVENTOS** busca el `data-act` y llama a la función que toca (por ejemplo `openHabitEditor()`).
3. La función cambia `state`, llama a `save()` (guarda en el dispositivo y programa la sincronización) y a `render()` (vuelve a pintar).

Las ventanas se abren con `openModal({ title, body, foot, onClick })` y los mensajes cortos con `toast(texto)`.

## 2. Dónde viven los datos

- **En el dispositivo:** `localStorage` con la clave `keepgoing.v1` (todo el `state`), `keepgoing.auth` (sesión) y `keepgoing.plan` (lo último que dijo el servidor sobre tu plan).
- **En Supabase (si hay cuenta):** tabla `kg_state`, una fila por usuario con todo el `state` en JSON. La Libreta y la Calculadora van **cifradas** dentro (`ledgerVault`): el servidor no puede leerlas.
- **Lo social** (amigos, chats, grupos, retos) vive en tablas propias (`kg_groups`, `kg_messages`, `kg_friends`…) y se usa con funciones del servidor llamadas por `rpc('kg_…')`.

### Supabase en 1 minuto

- Proyecto `keepgoing` (región Frankfurt). Se gestiona en supabase.com.
- Todas las tablas tienen **RLS** (seguridad por fila). Las sensibles no tienen políticas: solo se tocan con funciones `SECURITY DEFINER` que comprueban quién eres con `auth.uid()`.
- Cada cambio de base de datos va en un archivo nuevo de `supabase/migrations/` con fecha. **Nunca** se editan las migraciones ya aplicadas: se añade otra.

## 3. Planes (v1.24)

| Plan | Cómo se consigue |
|---|---|
| Free | Por defecto. Sin cuenta, siempre Free. |
| Prueba (14 días) | Al crear cuenta (`kg_trial_start`, una vez por cuenta). El primer Contrato Personal dura 14 días. |
| Usuario KeepGoing | Pago en la app (Paddle → `kg-paddle` → `kg_plans`), key canjeada (`kg_redeem_key`), o dado desde el panel (especiales, sorteos). |

- **Quien decide es el servidor:** `kg_entitlement()` devuelve el plan, las fechas, tu rol (`owner`/`dev`) y las funciones activables. La app lo guarda en `keepgoing.plan` para funcionar sin conexión.
- **Límites Free:** en `js/plan.js` (`LIMITS` y `PAID`). En la app: `gate('calc')` para funciones y `gateAdd('habits', cuántos)` para cantidades. Los botones que abren funciones de pago están en `PLAN_GATES`.
- **Lo que pasa por el servidor** (crear grupos, compartir libretas, proyecciones y calendario) también se bloquea allí con triggers (`kg_plan_groups`, `kg_plan_full`).
- Con Free y más de 5 hábitos, la app pide elegir 5; los demás se archivan con `planArch` y vuelven solos al pagar.

### Añadir un nuevo límite de pago

1. Añade el nombre a `PAID` en `js/plan.js` (por ejemplo `'nuevaCosa'`).
2. Añade su texto `plf_nuevaCosa` en `js/i18n-plan.js` (ES y EN).
3. En `js/app.js`, al principio de la función que abre esa cosa: `if (!gate('nuevaCosa')) return;`. O, si es un botón, añade `['[data-act="nueva-cosa"]', 'nuevaCosa']` a `PLAN_GATES`.
4. Añade una prueba en `tests/plan.test.js`.

## 4. Panel del equipo y Modo desarrollador

Ajustes → Tu plan → **Panel del equipo**. Solo aparece si tu cuenta está en `kg_staff` (lo comprueba el servidor; no se puede activar tocando la app).

- **Ver la app como:** Free, prueba o Usuario KeepGoing, para probar lo que ve cada uno. Solo cambia tu dispositivo.
- **Dar Usuario KeepGoing** por @nametag (especial para siempre, o por días), quitarlo o dar una prueba nueva.
- **Keys:** generar (se ven una sola vez: cópialas), ver si se usaron y anularlas.
- **Funciones activables** (solo el dueño): `off` (escondida para todos), `staff` (solo el equipo: para probar algo nuevo antes de publicarlo) y `all` (publicada). En el código: `if (flag('calLayers')) { … }`. Los nombres y su valor por defecto están en `FLAGS` de `js/plan.js`.
- **Desarrolladores** (solo el dueño): dar o quitar el rol `dev` por @nametag. Es reversible.

Para nombrar al dueño la primera vez (una sola vez, en el editor SQL de Supabase):

```sql
insert into public.kg_staff (user_id, role)
select user_id, 'owner' from public.kg_users where nametag = 'TU_NAMETAG';
```

## 5. Probar en tu ordenador

1. Abre una terminal en la carpeta del proyecto.
2. Arranca un servidor: `python3 -m http.server 8765` (o `powershell -File servidor.ps1`).
3. Abre `http://localhost:8765/`.
4. Pruebas automáticas: `node --test tests/*.test.js` (necesitas Node 20 o más).
5. Pruebas del SQL (opcional, con Postgres instalado): ver `tests/sql/planes.test.sql`.

## 6. De un cambio a la app publicada

1. **Rama nueva** desde `main` (`git checkout -b mi-cambio`).
2. Cambia el código. Si cambias textos, en los dos idiomas. Si añades un archivo JS, añádelo a `index.html` **y** a la lista `SHELL` de `sw.js`, y sube el número de `CACHE` en `sw.js`.
3. Sube la versión en `VERSION` (arriba de `js/app.js`) y, si es una versión grande, sus Novedades (`WN` / `NEWS`).
4. **Pull request** a `main`. GitHub Actions ejecuta las pruebas (`.github/workflows/tests.yml`). Con Cloudflare Pages, cada PR tiene además una **dirección de pruebas** propia para abrirla en el móvil.
5. Si las pruebas pasan y la versión de pruebas funciona, **fusiona** el PR: eso publica la app.
6. Si el cambio toca la base de datos: aplica la migración en Supabase **antes** de fusionar.

Si algo sale mal tras publicar: en GitHub, «Revert» del PR fusionado y se vuelve a la versión anterior.

## 7. Pagos (Paddle)

- Paddle es el vendedor (Merchant of Record): cobra, factura y paga los impuestos de cada país. Tú recibes los pagos.
- Tienda: `web/index.html` + `web/config.js` (`env`, `token`, `priceId`). Con `token` o `priceId` vacíos enseña «Muy pronto».
- Precio por país: en el panel de Paddle, en el precio, «Localized prices» (los importes están en `PRICES` de `js/plan.js`).
- Avisos de Paddle → Edge Function `supabase/functions/kg-paddle` (secretos `PADDLE_WEBHOOK_SECRET` y `KG_KEY_SECRET`).
  - Compra desde la app: llega `custom_data.user_id` y esa cuenta pasa a Usuario KeepGoing.
  - Compra en la web: se crea una key y la tienda la enseña al terminar.
  - Reembolso: se quita el plan o se anula la key.
- Primero todo en **sandbox** (sin dinero real). Producción solo cuando el alta fiscal esté hecha.

## 8. Reglas de la casa

- Botones e iconos con los iconos de línea de `ico()`, nunca emoji.
- Interruptores con el color de acento, no casillas, en la Libreta.
- Todo texto nuevo en español e inglés.
- La lógica que se pueda separar de la pantalla va en su propio `js/*.js` con pruebas.
- Nada del panel del equipo ni de los roles aparece en Novedades, Ayuda ni textos para usuarios.

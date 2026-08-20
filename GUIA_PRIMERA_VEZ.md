# Cravings! — Guía de primera vez

Esta carpeta contiene el sitio completo del programa de lealtad y el archivo SQL que prepara Supabase. No necesitas saber programar para hacer la primera configuración.

## Qué hace cada servicio

- **GitHub Pages** publica las pantallas que ven clientes, empleados y administración.
- **Supabase** guarda cuentas, compras, sellos y recompensas.
- **El QR general** lleva al registro.
- **El QR personal** identifica a cada cliente, pero no contiene su número de compras. El progreso vive en Supabase.

## Paso 1 — Crear el proyecto gratuito de Supabase

1. Crea una cuenta en Supabase.
2. Crea un proyecto nuevo en el plan **Free**.
3. Guarda la contraseña de base de datos que te pida Supabase. No va dentro de GitHub.
4. Espera a que termine de crear el proyecto.

## Paso 2 — Crear las tablas y reglas

1. Dentro de tu proyecto abre **SQL Editor**.
2. Crea una consulta nueva.
3. Abre el archivo `supabase/setup.sql` de esta carpeta.
4. Copia TODO su contenido.
5. Pégalo en SQL Editor y presiona **Run**.
6. Si aparece un mensaje de éxito, la base de datos de Cravings! está preparada.

El archivo activa Row Level Security (RLS), de modo que los clientes sólo puedan consultar su propia tarjeta. Las compras y canjes sólo pueden hacerse mediante las funciones protegidas para empleados.

## Paso 3 — Copiar dos datos públicos de Supabase

En Supabase busca **Connect** o **Settings > API Keys** y copia:

- **Project URL**
- **Publishable key**

Abre `js/config.js` y reemplaza:

```js
SUPABASE_URL: "PEGA_AQUI_TU_PROJECT_URL",
SUPABASE_PUBLISHABLE_KEY: "PEGA_AQUI_TU_PUBLISHABLE_KEY"
```

### MUY IMPORTANTE

La **Publishable key** sí está diseñada para usarse en páginas web y puede estar en GitHub cuando RLS está bien configurado.

**NUNCA** pegues aquí una **Secret key** ni una clave **service_role**. Esas claves dan permisos elevados y no deben aparecer en un repositorio público ni en el navegador.

## Paso 4 — Configurar el registro por correo

Para el piloto recomiendo correo + contraseña porque no requiere pagar mensajes SMS.

En Supabase abre la configuración de **Authentication > Providers > Email** y verifica que Email esté habilitado.

Para hacer las primeras pruebas más sencillas puedes desactivar temporalmente la confirmación obligatoria del correo. Si la dejas activada, el cliente tendrá que abrir el correo de confirmación antes de entrar a su tarjeta.

## Paso 5 — Subir la carpeta a GitHub

1. Crea un repositorio nuevo, por ejemplo `cravings-lealtad`.
2. Para usar GitHub Pages con GitHub Free, deja el repositorio **público**.
3. Sube **el contenido de esta carpeta** a la raíz del repositorio. `index.html` debe quedar en el nivel principal.
4. En GitHub abre **Settings > Pages**.
5. En la fuente de publicación elige la rama `main` y la carpeta `/ (root)`.
6. Guarda y espera a que GitHub te muestre la dirección pública, por ejemplo:
   `https://TU-USUARIO.github.io/cravings-lealtad/`

## Paso 6 — Registrar tu primera cuenta y convertirla en administradora

1. Abre la URL de GitHub Pages.
2. Regístrate como si fueras un cliente usando TU correo y contraseña.
3. Regresa a Supabase > SQL Editor.
4. Ejecuta esta línea cambiando el correo:

```sql
update public.profiles
set role = 'admin'
where email = 'TU_CORREO@EJEMPLO.COM';
```

5. Cierra sesión en el sitio y vuelve a entrar.
6. Abre `admin.html` desde la misma URL, por ejemplo:
   `https://TU-USUARIO.github.io/cravings-lealtad/admin.html`

Ahora ya eres administradora.

## Paso 7 — Crear empleados

1. Cada empleado crea una cuenta normal desde la página principal.
2. Entra al panel `admin.html` con tu cuenta administradora.
3. En “Dar acceso a un empleado”, escribe su correo y elige **Empleado**.
4. El empleado entra en `empleado.html` y ya puede usar la cámara para escanear tarjetas.

## Paso 8 — Obtener el QR general para clientes

En `admin.html` aparece automáticamente un **QR general de registro** con la URL real de tu GitHub Pages. Ese es el QR que puedes poner en mostrador, mesas o carteles.

## Flujo de una compra

1. Cliente abre su Tarjeta Cravings! y muestra su QR.
2. Empleado abre `empleado.html` e inicia sesión.
3. Presiona **Abrir cámara** y escanea el QR.
4. Escribe el importe.
5. Si es de $50 MXN o más, presiona **Registrar compra**.
6. Supabase guarda la compra, suma el sello y la tarjeta del cliente se actualiza.
7. Al completar 7 compras, se crea una recompensa.
8. Cuando se entregue la bebida, el empleado presiona **Canjear bebida gratis**.

## Nota sobre el ciclo de 7 compras

Internamente, al llegar a la séptima compra el sistema crea una recompensa y comienza a contar el siguiente ciclo desde cero. Mientras haya una bebida pendiente, la tarjeta muestra visualmente los 7 espacios llenos y el aviso de premio disponible. Esto permite seguir acumulando compras incluso si el cliente aún no ha canjeado su bebida.

## Archivos principales

- `index.html`: registro, inicio de sesión y tarjeta del cliente.
- `empleado.html`: lector QR y registro/canje en caja.
- `admin.html`: métricas, QR general y gestión de roles.
- `js/config.js`: URL y Publishable key de Supabase.
- `supabase/setup.sql`: tablas, seguridad, funciones y Realtime.
- `assets/logo-cravings.jpeg`: nuevo logo proporcionado.

## Antes de usarlo con clientes reales

Haz una prueba completa con 2 cuentas: una administradora y una de cliente. Registra 7 compras, comprueba que aparece la bebida gratis y prueba el canje. Después crea una cuenta de empleado y repite el flujo desde un segundo celular.

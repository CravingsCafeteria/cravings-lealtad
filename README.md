# Cravings! — Tarjeta de lealtad digital

MVP estático para GitHub Pages + Supabase.

## Regla del programa

- Compra mínima: **$50 MXN**.
- Cada compra elegible suma **1 sello**.
- Cada **7 compras** se genera **1 bebida gratis**.
- Sólo cuentas `employee` o `admin` pueden registrar compras o canjes.

## Puesta en marcha

Empieza por **`GUIA_PRIMERA_VEZ.md`**.

## Seguridad

El frontend utiliza únicamente `Project URL` + `Publishable key`. Las tablas tienen RLS activado y las operaciones sensibles se realizan mediante funciones SQL que validan el rol del usuario autenticado.

Nunca incluyas Secret keys o `service_role` en este repositorio.

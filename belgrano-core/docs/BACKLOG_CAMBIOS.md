# Backlog de cambios chicos — para aplicar en lote

> Método: se van anotando acá los cambios chicos que pide Brian. No se aplican
> uno por uno; se juntan y se hacen todos juntos cuando diga "unificá y aplicá".
> Cada ítem: estado ⬜ pendiente · ✅ hecho.

## Por aplicar (lote actual)

### Tabla de Boletas (Ventas → Resumen)

**Estados y filtros**
- ⬜ 1. Agregar estados faltantes a los filtros: **Reclamo**, **Preproducción**
  (ubicar *Preproducción* ANTES de "En fabricación") y **Archivadas**.
- ⬜ 2. Nuevo filtro **"Activas"** = a confirmar + preproducción + en fabricación +
  listas + en logística + reclamos (con las que se trabaja habitualmente).
- ⬜ 3. Que el filtro venga **por default en "Activas"** (no en "Todas").

**Reclamo como estado que convive**
- ⬜ 4. Una boleta puede tener 2 estados a la vez: (Listo + Reclamo) o
  (Entregado + Reclamo). "Reclamo" es una marca que convive con el estado del
  ciclo → toca modelo de datos (estado del ciclo + flag/estado de reclamo).
- ⬜ 5. Acceso rápido / módulo para entrar directo a las **boletas con reclamo**.

**Columnas = también filtros/orden**
- ⬜ 6. Que **cada columna sea filtrable y ordenable** (Nº de venta, cliente,
  estado, etc.) — así tengo los chips de arriba Y el filtro/orden por columna.
- ⬜ 7. (default en "Activas" — mismo que ítem 3).

**Orden y comportamiento de columnas**
- ⬜ 8. **Vendedor** sale de columna fija y pasa adentro de los **⋮ (3 puntitos)**.
- ⬜ 9. Columnas fijas, en este orden:
  Nº de orden · Cliente · Método de pago · Total · Seña · Saldo ·
  **Muebles (desplegable inline** → abre los muebles comprados dentro de la
  misma pantalla, sin salir**)** · Estado · Fecha de entrega ·
  **🔔 recordatorios** (campanita nueva) · **💬 comentarios** · ⋮ (con vendedor).

> Notas para cuando apliquemos:
> - "Preproducción" hay que definirlo como estado del ciclo (entre confirmada y
>   fabricación).
> - 🔔 recordatorios es un concepto nuevo (recordatorio por boleta) — definir
>   qué guarda (fecha + texto) al aplicarlo.
> - El reclamo-que-convive conviene resolverlo junto con el módulo Reclamos.

## Aplicados

_(nada todavía)_

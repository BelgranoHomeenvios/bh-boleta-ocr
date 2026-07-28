# Belgrano Soft · Decisiones pendientes y valores provisorios

> Se va acumulando mientras construimos. Nada de esto frena el desarrollo:
> se dejan **valores provisorios marcados en pantalla** y se ajustan todos
> juntos más adelante. Última actualización: durante el flujo cotización → venta.

---

## 1 · Precio por término de pago  (bloquea números finos, no el diseño)

| # | Pregunta | Valor provisorio en código |
|---|----------|----------------------------|
| a | **Transferencia**: cuando se paga **todo** por transferencia, ¿qué descuento lleva? | Sin descuento (= precio de lista). `DESC_TRANSFER = 0` en `presupuesto.js` |
| b | **Efectivo −35%**: ¿es igual para **todos** los productos o cambia por categoría/producto? | Universal 35%. `DESC_EFECTIVO = 0.35` |
| c | **Cuotas 3/6/12**: ¿las tres = precio de lista, o 12 tiene recargo sobre 3? | Todas = precio de lista (sin recargo por cuota) |
| d | **Seña 30% mínimo**: ¿30% del precio de **efectivo** o del de **lista**? | A definir; hoy se calcula sobre el total de la orden |

**Modelo confirmado:** todo nace del precio de lista → efectivo −35% · tarjeta/lista = lista · mixto = editable por línea.

## 2 · IVA
- Precios **sin IVA** por defecto (así trabajan). Si piden factura, se agrega automático sobre el mismo precio.
- **Falta:** poder **discriminar/desvincular** el IVA del total para contabilizarlo. *(no implementado aún)*

## 3 · Cliente / CRM
- Identidad = **teléfono / Instagram / mail** (al menos uno). ✔ implementado (con pop-up).
- **Cómo llegó** (virtual/presencial/mixta): debe salir **automático** del registro del vendedor. *(hoy no se deriva)*
- **Fusionar** y **archivar** clientes; **varios teléfonos** por cliente. *(botón presente, sin lógica)*
- **Venta compartida**: reparto por **% (default 50/50)** o por montos; la venta y el cliente se anotan **para los dos**; cada uno comisiona sobre su parte. *(no implementado)*
- **Atención (CRM)**: base la del CRM actual, con vuelta de tuerca para **imprimir** y registrar datos internos y externos. *(a rever)*

## 4 · Cotización → Orden
- Estados cotización: borrador → aceptada → (orden) · rechazada · vencida. Vencida casi no se usa (el plazo va a la **consulta**, no al presupuesto).
- **Levantar consulta** rechazada cuando el cliente vuelve a escribir. *(no implementado)*
- **Atajo**: ir directo a orden sin presupuesto (cliente en el local). *(no implementado)*
- Ítems **estándar** (precio bloqueado) / **a medida** (manual). ✔
- Ruteo a **verificación de Administración** si es a medida o tiene observaciones. ✔ (marca; falta el módulo de verificación)

## 5 · Ciclo de la orden
- Confirmar → (seña ≥30%) → Producción *(a fabricar)* o Logística *(entrega inmediata)* → Entregado → Archivado.
- Anular → Anulado → Reclamos. Reclamo **levanta** la orden y **vuelve** a su estado.
- Editar en Producción **requiere autorización**. Factura → módulo Facturas.
- **Estado actual:** la orden se crea en **Confirmar**. El resto del ciclo se construye a continuación.

## 6 · Numeración
- Cotización y orden con **formato y serie únicos + ID de local**. Provisorio: `OV-<local>-<serie>`.
- Ventas de **Tienda Nube** (etapa 2): **doble numeración** — externa de TN + interna nuestra.

## 7 · Precios / catálogo
- Estándar → **sincroniza con Tienda Nube** (precio de venta). *(hoy demo)*
- Costos y márgenes con **Belgrano Cost** (posible módulo dentro de Belgrano Soft).
- **SKU**: para más adelante, cuando trabajemos mejor el catálogo.

## 8 · Facturación
- Belgrano Soft **no factura**: marca "facturado". Factura en **Nacional Soft**; después incorporar esas facturas.

## 9 · Roles y permisos
- 6 roles definidos. **Permisos finos por módulo**: se afinan a medida que avanzamos.
- **Alcance de datos por vendedor** (mis cotizaciones/ventas/clientes vs. todas): se implementa con el login real.

## 10 · Plataforma
- Hoy **modo demo** (datos en memoria). **Persistencia** en Supabase `core` → después de cerrar la arquitectura.
- **Login real** (Supabase Auth por vendedor + pantalla de inicio) → reemplaza el selector "Ver como".
- `dev_acceso_core` (política permisiva temporal) → **RLS por rol** al activar el login. `finanzas` y `audit` quedan cerrados.
- **Condiciones comerciales** (flete, instalación/armado, embalaje %, plazo de entrega): definir cuáles suman al total y cómo. *(no implementado)*

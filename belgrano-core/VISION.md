# Belgrano Soft · Visión y arquitectura

> El norte del proyecto. No son decisiones de código, son la filosofía del sistema.

## Qué es
No es una app con muchas pantallas. Es una **plataforma ERP** compuesta por
**módulos independientes** que comparten un mismo **Core**. Cada módulo se siente
como una **aplicación especializada**, con su propia navegación, dashboard,
filtros, tablas, configuración y lógica de negocio. Todos trabajan sobre los
**mismos objetos** del sistema: nunca se duplica información.

## Navegación de dos niveles
- **Nivel 1 (macro):** elige el módulo — Dashboard · CRM · Ventas · Catálogo ·
  Producción · Compras · Inventario · Logística · Tesorería · Reclamos · Configuración.
- **Nivel 2:** al entrar a un módulo, **toda la sub-navegación cambia** a la de ese
  módulo. Cuando estoy en Producción solo veo herramientas de Producción; al pasar
  a Compras desaparecen y aparecen las de Compras. **Navegación contextual.**

## El Core (común a todos)
Autenticación · permisos · usuarios · empresas · sucursales · configuración ·
notificaciones · buscador global · auditoría · objetos del sistema · motor de
automatizaciones · IA · reportes.
**El Core nunca contiene lógica específica de un módulo.**

## Dashboards
**Todos los módulos arrancan en un Dashboard/Resumen**, nunca directo en una tabla.
Primero: indicadores, alertas, pendientes, actividad reciente, accesos rápidos,
gráficos. Después el usuario entra a trabajar.

## Objetos compartidos (nunca duplicados)
```
Cliente → Consulta → Presupuesto → Orden de Venta → Producción →
Inventario → Entrega → Factura → Cobranza → Reclamo
```
El mismo objeto vive una sola vez y los módulos lo comparten.

## Reglas
- Cada módulo **evoluciona sin romper los demás**. Agregar algo en Producción no
  obliga a tocar Logística.
- **Escalabilidad:** agregar RRHH, Marketing, BI, Importaciones, Posventa, Calidad,
  etc. en el futuro es sumar un módulo nuevo con su arquitectura interna, sin
  rediseñar el ERP.

## Filosofía de UX
**"Las pantallas muestran información. Los módulos resuelven un trabajo."**
- Ventas no es "la pantalla de órdenes": es donde un vendedor convierte consultas en ventas.
- Producción no es "la lista de órdenes": es donde se planifica, ejecuta y controla la fabricación.
- Logística no es "la agenda": es donde se organiza todo para entregar bien.
- Catálogo no es "el listado de productos": es donde se administra el conocimiento de los productos.

Cada responsable tiene una herramienta pensada para su trabajo, no una interfaz
enorme que intenta servir a todos.

# Belgrano Soft · Visión y arquitectura

> ## "Belgrano Soft no es un software para registrar el negocio. Es un software para dirigir el negocio."
>
> ### Lema: **"Cada clic debe generar valor."**
> Si un clic solo carga información que nadie usa, sobra. Si automatiza un proceso,
> evita un error, genera un indicador o facilita una decisión, vale la pena.
>
> El norte del proyecto. No son decisiones de código, son la filosofía del sistema.

## Los 5 principios fundamentales
1. **Un solo dato, una sola vez.**
2. **Módulos independientes, información compartida.**
3. **Cada módulo resuelve un trabajo completo, no una pantalla.**
4. **Todo gira alrededor de procesos de negocio, no de tablas.**
5. **Cada acción genera automáticamente todas sus consecuencias en el resto del ERP.**

## Flujo único de información
Módulos independientes, pero la **información es única y fluye** entre todos. Cada
módulo tiene su interfaz, su navegación y su lógica — pero ninguno trabaja aislado.
Una acción en un módulo se refleja **automáticamente** en todos los demás donde sea
relevante.

**Ejemplo — un vendedor confirma una venta y, sin hacer nada más:**
```
Venta confirmada
  → Producción recibe una nueva orden
  → Inventario reserva el stock
  → Compras detecta faltantes
  → Logística programa la entrega
  → Tesorería registra el saldo pendiente
  → Comisiones calcula la venta del vendedor
  → Dashboard actualiza todos los indicadores
```
La información se cargó **una sola vez**; el resto reaccionó solo.

**Regla de oro:** nunca pedirle a un usuario que cargue dos veces el mismo dato. Si
ya existe en el ERP, otro módulo lo reutiliza — nunca lo reescribe.

**Independencia ≠ aislamiento:** independencia visual ✅ · independencia funcional ✅
· datos compartidos ✅ · procesos conectados ✅. No son apps independientes: es un
**ecosistema**.

**No es un módulo llamando a otro — todos leen del mismo Core:**
```
                    BELGRANO SOFT · CORE
        Clientes · Productos · Órdenes · Stock ·
        Compras · Producción · Pagos · Usuarios
                          │
     ┌──────────┬─────────┼─────────┬──────────┐
    CRM      Ventas   Catálogo  Producción  Inventario
                          │
              Logística · Tesorería · Reclamos
```
Ventas no "envía" un pedido a Producción: cambia el estado de una **Orden de Venta**,
y Producción ve **esa misma Orden** porque ambos leen del mismo Core.

## Motor de transiciones (patrón del Core, no de un módulo)
Toda transición importante del ERP pasa por el **mismo motor declarativo**: las reglas
no viven escondidas en botones ni en el código de cada módulo, sino como **condiciones
visibles, auditables y con responsable**. El sistema puede **explicar por qué** tomó
cada decisión.

```
Objeto → condiciones requeridas → checks visibles → responsables →
         bloqueos (con alcance) → excepciones autorizadas → evento de transición
```
El mismo patrón habilita: **confirmar una venta**, confirmar una compra, recibir
mercadería, cerrar una producción, habilitar una entrega, cerrar un reclamo, aprobar
una devolución. Cada evaluación guarda **evidencia** (condición, resultado, valor, regla,
fecha, quién/qué la ejecutó, motivo de excepción). Las excepciones se autorizan de forma
explícita y **nunca modifican silenciosamente la regla general**.

## Un sistema para decidir, no para registrar
No quiero un lugar donde los empleados cargan información. Quiero un sistema que
le diga a cada persona **qué tiene que hacer**.

- **Cada pantalla responde una pregunta.** Ventas: ¿qué clientes necesitan
  seguimiento hoy? Producción: ¿qué fabrico primero? Compras: ¿qué compro hoy?
  Inventario: ¿qué me falta y qué tengo inmovilizado? Tesorería: ¿qué cobro y qué
  pago esta semana? Logística: ¿qué entregas corren riesgo?
- **Orientado a excepciones.** El sistema resalta solo lo que necesita atención
  (pedidos demorados, producción frenada, pagos vencidos, clientes sin seguimiento,
  sin stock, reclamos abiertos, órdenes bloqueadas). *Los problemas encuentran al
  usuario, no al revés.*
- **El sistema "piensa".** Cada módulo responde siempre: ¿qué merece atención ahora?
- **Cada dato existe por una razón:** decidir, automatizar, generar indicadores,
  evitar errores o facilitar búsquedas. Si un campo no sirve para nada de eso, no va.
- **Automatizar lo repetitivo.** Si alguien hace la misma tarea dos veces, la hace
  el sistema: cambiar estados, crear tareas, avisar vencimientos, asignar
  responsables, sugerir compras, reservar stock, calcular comisiones.
- **Trazabilidad total.** Quién, cuándo, desde dónde, por qué, y cuál era el valor
  anterior. Nunca se pierde información.
- **Ayuda a dirigir.** Qué familia deja más rentabilidad, qué vendedor convierte
  mejor, qué proveedor genera más problemas, dónde se producen las demoras, qué
  conviene dejar de vender, qué decisiones tomar esta semana.
- **La IA no es un módulo, es transversal.** Sugiere próximas acciones en el CRM,
  detecta márgenes anómalos, recomienda compras, identifica cuellos de botella,
  explica caídas de rentabilidad, resume reclamos, redacta respuestas, encuentra
  inconsistencias. Un asistente del usuario, no una pantalla aparte.

## Principios de diseño
1. **Evoluciona.** No es un sistema terminado; es una plataforma que crece 10 años.
   Cada módulo nuevo entra sin reescribir lo anterior. Un organismo vivo.
2. **Única fuente de verdad.** Cada dato (cliente, producto, costo, stock, proveedor,
   precio) existe **una sola vez**; todos los módulos leen lo mismo. Nunca se duplica.
3. **Velocidad antes que complejidad.** Mejor un proceso simple que todos usan que
   uno perfecto que nadie completa. Cada acción importante, en pocos clics.
4. **Diseñar para personas, no para sistemas.** Cada pantalla responde: ¿qué está
   intentando hacer esta persona ahora? (vendedor, operario, administrativo, director) —
   no se diseña pensando en tablas.
5. **Todo es medible.** Si una decisión importa, deja un indicador (tiempo de
   fabricación, de respuesta, de confirmación, días en producción/logística). Lo que
   no se mide, no mejora.
6. **Explica el porqué.** No "Margen: 18%" sino "cayó 6% porque subió el MDF y bajó
   el precio promedio". El sistema ayuda a interpretar.
7. **Sugiere acciones.** Dashboards activos: "conviene subir este producto 4%",
   "este proveedor acumula 8 demoras", "hace 15 días nadie contacta a este cliente".
8. **Todo se filtra.** Cualquier listado importante se filtra por cualquier dato
   relevante. Nunca recorrer cientos de registros a mano.
9. **Consistencia.** Las mismas acciones se ven igual en todo el ERP (Crear · Editar ·
   Duplicar · Archivar · Eliminar · Historial). Curva de aprendizaje casi nula.
10. **Tolera errores humanos.** Previene antes de que ocurran: avisa cliente/teléfono
    repetido, costo raro, medida imposible, datos obligatorios, stock.
11. **Cero islas de información.** Una venta no termina en Ventas: impacta Producción,
    Compras, Inventario, Logística, Tesorería, Comisiones e Indicadores, sin recargar datos.
12. **Mobile-first, aunque se use en PC.** Muchos encargados trabajan caminando por
    depósito/fábrica. Si funciona cómodo en el celular, en PC también.
13. **El sistema enseña.** Ayuda contextual por campo, ejemplos, próximo paso, buenas
    prácticas. Cuanto menos dependa una persona de preguntarle a otra, mejor.
14. **Pensar en procesos, no en módulos.** El usuario siente que recorre un único
    proceso: *captar → vender → fabricar → comprar → controlar → entregar → cobrar → fidelizar.*
15. **Obsesión por el tiempo.** Medir cuánto tarda todo (responder, presupuestar,
    confirmar, fabricar, comprar, entregar, resolver). Saber no solo cuánto ganás, sino
    dónde perdés tiempo.

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

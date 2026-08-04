# Seguridad · decisión tomada

> **Esto no es una propuesta. Es una condición de la que no se sale.**
>
> Brian, 4/8/2026:
> *"Antes de comenzar a migrar datos y comenzar a usarlo voy a querer
> analizar muy detenidamente toda la seguridad de la app, y que el login sea
> con un control y una seguridad de la mejor calidad posible. Incluso si en
> vez de armar una sola HTML necesitás otra cosa, o lo que sea, quiero que lo
> trabajemos para que esta app sea lo más segura posible."*

---

## La regla

**No entra un solo dato real —ni un cliente, ni un teléfono, ni un precio de
proveedor, ni un peso— hasta que la capa de seguridad esté hecha y revisada.**

Mientras tanto se sigue construyendo funcionalidad con datos inventados. Eso
es deliberado: las políticas de acceso no se pueden escribir antes de saber
qué ve cada rol, y eso es justamente lo que se está definiendo módulo por
módulo.

La arquitectura de hoy —un solo HTML, datos en `localStorage`, rol elegido
con un selector— es **andamio**. Sirve para acordar cómo funciona el negocio.
No sirve para operar. Si para que sea seguro hay que cambiar la forma del
proyecto —varios archivos, un servidor propio, otra cosa— se cambia.

---

## Estado real al 4/8/2026

Verificado contra el código, no contra la impresión.

### Lo que está bien

| | |
|---|---|
| `service_role` en el navegador | **No aparece nunca.** Es la clave que saltea todas las políticas. |
| `eval()` / `new Function()` | **No hay ninguno.** |
| Esquemas `finanzas` y `audit` | **No están expuestos a la API.** La plata está cerrada. |
| RLS | **Encendido en todas las tablas de `core`.** |
| Auditoría | El esquema `audit` existe con `valor_anterior`, `valor_nuevo`, `agente_id` y `motivo`. Ya lo usan las funciones de cobranza. |
| Escape de HTML | Existe `UI.esc()` y se usa en la enorme mayoría de los textos. |
| Datos del demo | Todos inventados. No hay un dato real de un cliente. |

### Lo que falta y es bloqueante

**1 · No hay login.** El rol sale del selector "Ver como" y se guarda en
`localStorage.bh_rol`. Cualquiera lo cambia desde la consola del navegador y
pasa a ser Dirección.

**2 · Los permisos son de interfaz.** `PERMISOS` esconde botones. Esconder
algo en HTML no es protegerlo: la función se puede llamar igual desde la
consola.

**3 · La política RLS es permisiva a propósito.** `dev_acceso_core.sql` crea
`create policy dev_todo ... using (true)` en cada tabla. El propio archivo
avisa que es temporal. La estructura está lista; las reglas no están escritas.

**4 · Los datos operativos viven en `localStorage`.** Veinte claves: precios
de proveedores, cuentas corrientes, gastos, agenda, devoluciones, series.
Tres problemas, y el tercero es el peor:
- Cualquiera con acceso a esa máquina los lee y los cambia.
- No hay una sola verdad: cada computadora termina con datos distintos.
- **Es deuda que dejó cada módulo nuevo.** Hay que pagarla.

**5 · Superficie de XSS.** 139 `innerHTML` y 29 `insertAdjacentHTML`. No es
una vulnerabilidad demostrada, pero alcanza con que uno solo inserte un
comentario o un nombre sin escapar. Hay que auditarlos uno por uno.

**6 · Un solo archivo de 1 MB.** Dificulta auditarlo y hace imposible una
Content-Security-Policy estricta, porque casi todo el JavaScript va inline.

**7 · La trazabilidad es de mentira en el front.** Los `quien: 'Jony'` son
texto que pone el navegador. El autor de una acción no lo puede elegir quien
la hace: tiene que salir del usuario autenticado, del lado del servidor.

---

## Un riesgo que es de hoy, no de después

**El archivo `belgrano-soft.html` se viene mandando por chat.** Hoy no
importa: son datos inventados y no tiene ninguna clave adentro.

El día que ese archivo lleve la conexión a la base real, **ese archivo es la
llave del negocio**, y va a estar en varios chats y varios teléfonos.

La solución no es dejar de compartirlo: es que la clave **nunca** esté
adentro del archivo, sino que la ponga el servidor donde se sirve la app.

---

## El requisito propio de Belgrano Home

Aparte de todo lo estándar, hay uno que pidió Brian y que es **más fuerte**
que un RLS normal:

> *"Me gustaría que puedan llegar a desaparecer de alguna manera del sistema
> interno que estamos armando. Yo no quiero que nadie, si me llega a hackear,
> tenga toda esta información. Quiero que pienses con un doble chequeo el tema
> de para ver la plata que tiene Belgrano Home en este momento. El flujo no
> tengo problema, pero una vez que se cierra el flujo —una vez que se cobró esa
> plata— me gustaría que pensemos bien cómo se puede llegar a hacer para que
> nadie pueda entrar y ver esta información."*

Traducido: **el movimiento operativo puede vivir en el sistema, pero el saldo
consolidado no.** Eso cambia decisiones de arquitectura y hay que resolverlo
*antes* de escribir las políticas, no después.

Queda pendiente una propuesta específica para esto.

---

## El orden de trabajo

### Antes de que entre un dato real — bloqueante

1. **Propuesta de cómo se protegen los saldos.** Va primero porque cambia el
   diseño.
2. **Supabase Auth de verdad.** Usuario y contraseña por persona, sesión con
   vencimiento, segundo factor donde tenga sentido.
3. **Políticas RLS por rol**, reemplazando `dev_todo`. Un vendedor no lee un
   costo aunque llame a la tabla directo.
4. **El rol sale del usuario autenticado**, no de un selector. El selector
   "Ver como" queda sólo para Dirección, o desaparece.
5. **Sacar los datos operativos de `localStorage`.** Sólo quedan preferencias
   inocuas: tema, última solapa, orden de columnas, filtros.
6. **Partir el archivo** en módulos servidos por separado.
7. **La clave nunca en el archivo.** Va en el despliegue.

### Inmediatamente después

8. Auditar los 139 `innerHTML` y validar los esquemas de las URLs
   (`https:`, `blob:`, `data:image/` y nada más).
9. Content-Security-Policy, HTTPS y cabeceras.
10. Enganchar `audit` al front: quién, cuándo, qué cambió, valor anterior y
    nuevo, desde el servidor.
11. Entorno de prueba separado del real.
12. Backups y prueba de recuperación —no alcanza con que el backup exista.

---

## Cómo tiene que quedar

```
Usuario
   ↓  usuario y contraseña propios
Supabase Auth
   ↓  JWT con identidad real
Belgrano Soft
   ↓  la consulta lleva la identidad
Supabase con RLS por rol
   ↓
Base de datos / Storage
```

La barrera que importa es la de abajo. Un vendedor que edite el HTML y pida
`select * from costos` tiene que recibir `permission denied`. Que el botón
esté escondido es comodidad, no seguridad.

---

## Cómo se registra un usuario — diseño, pedido el 4/8

Brian pidió pensarlo antes de construirlo. Esta es la propuesta.

**No hay registro abierto. Hay invitación.** Nadie se crea una cuenta en
Belgrano Soft: Dirección invita. La lista de usuarios es la lista de la
empresa —Brian, Jony, Claudia, Daniel, Iara, Cintia, Adrián, Nati, Ale,
Sergio, Cristian, los choferes— y no crece sola.

```
Dirección carga: nombre, mail o teléfono, ROL
   ↓
Supabase manda la invitación (link de un solo uso, vence a las 48 h)
   ↓
la persona pone SU contraseña (nunca la elige otro, nunca viaja por chat)
   ↓
queda en la tabla usuarios: id de Auth + rol + activo
   ↓
el rol NO lo puede cambiar el propio usuario — sólo Dirección
```

Reglas que van con esto:

- **Un usuario, una persona.** Nada de "la cuenta del local". Si Nati y Ale
  comparten computadora, cada una entra con lo suyo: la trazabilidad —quién
  confirmó una plata, quién destrabó una entrega— depende de esto.
- **Contraseña fuerte + segundo factor** para los roles que tocan plata
  (Dirección, Tesorería). Para el chofer, acceso por link mágico al teléfono
  puede alcanzar: su pantalla no muestra nada sensible.
- **Dar de baja es desactivar, no borrar.** El que se va deja de entrar hoy
  mismo, pero su historia queda: las rendiciones que firmó no se vuelven
  anónimas.
- **La sesión vence.** Corta en los roles sensibles, más larga en el chofer.
  Cerrar sesión remoto desde Dirección (un vendedor pierde el teléfono → se
  lo saca de todos lados).
- **El selector "Ver como" desaparece** para todos menos Dirección, y aun
  para Dirección: ver como vendedor no otorga los permisos de escritura del
  vendedor, sólo la vista.

## Cómo se guarda la información — diseño

Regla general: **cada dato vive donde se lo puede proteger.**

| Dato | Dónde | Por qué |
|---|---|---|
| Clientes, consultas, órdenes, unidades | Postgres (Supabase, esquema `core`) con RLS por rol | Es el negocio. Una sola verdad, permisos por fila. |
| Precios de proveedor, cuentas corrientes | `core`, sólo roles Compras/Dirección | El vendedor no los lee ni pidiéndolos por API. |
| Cobros, rendiciones, gastos | esquema `finanzas`, **sin API directa**: sólo funciones (RPC) que validan y auditan | La plata no se toca con un `update`: se pasa por una función que deja rastro. |
| Saldos consolidados (lo que pidió Brian) | **No se guardan.** Se calculan al momento en una función que sólo Dirección puede llamar, con segundo factor fresco | Lo que no está almacenado no se puede robar almacenado. El flujo queda; la foto de "cuánta plata hay" no existe como dato. |
| Auditoría (quién, cuándo, antes/después) | esquema `audit`, **sólo escritura** desde funciones; ni Dirección lo edita | Un registro que se puede editar no es un registro. |
| Fotos y planos | Storage de Supabase con URL firmada que vence | Hoy van adentro del HTML; eso muere con el archivo único. |
| Preferencias (tema, filtros, última solapa) | `localStorage` | Lo único que puede quedar en el navegador: perderlo no duele. |

Tres consecuencias prácticas:

1. **El HTML deja de ser la app y pasa a ser el frente.** Se sirve desde un
   dominio con HTTPS; la clave de conexión la inyecta el servidor. El archivo
   que se manda por chat deja de existir como forma de distribución.
2. **Lo que el navegador guarda hoy (las ~20 claves de `localStorage`) migra
   a Postgres** el día uno de la capa de seguridad. Es la deuda más grande.
3. **El "quien" de cada registro sale del JWT**, nunca de un campo que llena
   el front. `confirmadoPor: 'Iara'` escrito por el navegador vale cero; el
   servidor sabe quién es porque la sesión lo dice.

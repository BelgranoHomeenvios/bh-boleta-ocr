# Dudas y riesgos

Lo que quedó abierto o decidido a mi criterio mientras se armaba CRM,
Logística y el resto de Ventas. Cada punto espera tu palabra; mientras tanto
el sistema hace lo que dice acá.

---

## Decisiones que tomé yo y tenés que revisar

**1 · El mueble que no está en el catálogo baja igual, marcado.** "Biblioteca
Borges", "Ropero Escandinavo", "Banqueta Nórdica" no existen como categoría.
Decidí que bajen a fábrica marcados *sin catálogo* en vez de trabar la boleta
o resolverse a cualquier cosa. La alternativa es que la boleta no baje hasta
que alguien la complete. **¿Cuál querés?**

**2 · Los 10 días avisan pero no dan de baja solos.** La pantalla de cobros
avisa a los 7 y marca "dar de baja" a los 10, pero la baja la aprieta una
persona. Automática me pareció peligrosa: un cliente que tarda en transferir
no es lo mismo que uno que se arrepintió. **¿La hago automática?**

**3 · El retiro por el local genera entrega igual.** Sin chofer ni flete, pero
con saldo a cobrar y alguien que entrega. Va por el mismo circuito con la
marca "retira". La rendición es la misma.

**4 · La entrega parcial no está.** Hoy la boleta baja entera y se entrega
entera. "3 de 5 muebles listos, el cliente pide lo que hay" no se puede hacer
todavía. ¿El saldo de una parcial se cobra proporcional o entero?

**5 · El efectivo rendido cuenta al toque.** Cuando el chofer rinde y un socio
recibe el efectivo, ese cobro entra confirmado (lo contó alguien nuestro). La
transferencia que trae anotada espera a Iara como cualquier otra. Me parece
correcto pero es plata: revisalo.

**6 · El destrabe lo hace Dirección solo.** Una entrega trabada por plata sin
confirmar la puede destrabar únicamente el rol Dirección, con motivo, y queda
registrado. ¿Jony también? ¿Tus viejos?

**7 · La autorización del tope (>$550.000 de saldo) la firma "Brian o Jony".**
Hoy cualquiera con rol Dirección aprieta ese botón. Con el login real se va a
saber quién fue de verdad.

**8 · "No son el mismo" en Fusionar no se acuerda.** Si decís que dos clientes
parecidos no son la misma persona, hoy te lo vuelve a preguntar la próxima
vez. Falta guardar esa marca.

---

## Preguntas sueltas

**9 · ¿Qué hace Sebastián?** Lo nombraste con los choferes pero no me dijiste
su rol. ¿Es chofer, depósito, otra cosa? No lo cargué en ningún lado para no
inventar.

**10 · ¿Los choferes de verdad?** Puse dos de ejemplo (uno propio, un flete
tercero que cobra por viaje). Necesito los reales: nombre, teléfono, propio o
flete, cuánto cobra el flete, cuántos muebles le entran por día.

**11 · ¿Las zonas de entrega?** Usé CABA / GBA Norte / GBA Sur. ¿Cómo las
dividís vos de verdad? ¿Hay días por zona (los martes al sur)?

**12 · ¿Quién es "el encargado de logística"?** El rol existe y tiene sus
pantallas, pero no sé quién lo va a usar.

**13 · El mueble que sale sin cobrar, ¿existe?** Cliente de confianza, entrega
urgente. Hoy el sistema no lo deja salvo destrabe de Dirección. Si es un caso
real que pasa seguido, merece su propio circuito con autorización.

**14 · El movimiento interno** (mueble de un local a otro) no está. ¿Sale de
Inventario o se carga en Logística?

**15 · La consulta de estado** ("¿cuándo llega mi mueble?") hoy aparece en la
cola de Cintia con el link a la orden. ¿Alcanza, o querés que muestre el
estado directo sin abrir la orden?

---

## Riesgos que anoto para que no se pierdan

**16 · Todo vive en el navegador.** Nada de lo que pruebes sobrevive a borrar
el historial, y dos personas no ven lo mismo. Es el riesgo número uno y es
conocido: está en `SEGURIDAD.md` y es bloqueante antes de operar.

**17 · El "quién" es un rol, no una persona.** Hasta que no haya login,
"Brian", "Iara" o "Cintia" en los registros son suposiciones que salen del
selector "Ver como". Toda la trazabilidad de destrabes, autorizaciones y
rendiciones vale poco hasta que el que firma sea un usuario real.

**18 · El chofer con el teléfono en la calle.** Su pantalla ya está acotada
(sólo su ruta), pero mientras el rol salga de un selector, cualquiera que
abra el archivo puede elegir "Dirección" y ver todo. El rol Chofer de verdad
sólo tiene sentido con login.

**19 · Los números del CRM arrancan flacos.** Conversión por canal y por
vendedor se calculan sobre las consultas cargadas. Los primeros meses van a
decir cosas raras (canales con 2 consultas, 50% de conversión). No tomar
decisiones de publicidad con menos de un par de meses de datos.

**20 · La fusión de clientes no tiene deshacer.** Fusionar dos que no eran el
mismo es exactamente el error que la pantalla trata de evitar preguntando,
pero si pasa, hoy no hay vuelta atrás. Con Supabase va a haber historial.

**21 · `consultaDeCotizacion` engancha por teléfono/IG/mail.** Si el vendedor
carga mal el teléfono, se crea un cliente duplicado. Está Fusionar para
arreglarlo, pero el dato de entrada sigue siendo el punto débil.

**22 · El cupo del chofer cuenta muebles, no volumen.** Ocho mesas de luz no
son ocho placards. Si el cupo real depende del tamaño, hay que sumarle una
medida al mueble.

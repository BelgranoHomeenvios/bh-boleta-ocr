-- =====================================================================
-- BELGRANO CORE · MODELO DE DATOS
-- Bloque 4 de 5 — LOGÍSTICA · ENTREGAS · RECLAMOS
-- Postgres / Supabase · Julio 2026
--
-- Correr DESPUÉS de los bloques 1, 2 y 3.
--
-- ORIGEN DE ESTE BLOQUE
--   El documento de la Sección 8 no existe. Los estados, los tipos de flete,
--   los horarios, los peajes y los motivos salen del CÓDIGO DE LA APP DE
--   LOGÍSTICA que ya está en producción — no están inventados.
--   Principio 24: antes de diseñar algo, verificar si ya está resuelto.
--
--   De la app:  ESTADOS = Por completar · Coordinada · En viaje · Entregada ·
--                         Por rendir · Cerrado · En reclamo · Cancelado
--               HORARIO_DEF por tipo de flete
--               PEAJE por localidad
--               MOTIVOS_CANCEL · MOTIVOS_PROBLEMA · MOTIVOS_REPROG
--               habilitada=false → "Condicionada a pago" (el candado)
-- =====================================================================

set search_path = core, public;


-- =====================================================================
-- 0 · MOTIVO  (faltaba en el bloque 1 — se crea acá)
--
-- Principio 13: todo movimiento tiene responsable, y toda decisión tiene
-- motivo. Patrón del CRM: lista cerrada + "otros" con texto libre.
-- "Depende del caso" es sano solo si cada caso queda escrito.
-- =====================================================================

create table if not exists motivo (
  id                  bigint generated always as identity primary key,
  ambito              text not null,
  codigo              text not null,
  etiqueta            text not null,
  permite_texto_libre boolean not null default false,
  activo              boolean not null default true,
  unique (ambito, codigo)
);

insert into motivo (ambito, codigo, etiqueta, permite_texto_libre) values
  -- §Línea que se cae. La línea no se cae por decisión del cliente: se cae
  -- por decisión nuestra. Motivo obligatorio, sí o sí.
  ('linea_caida', 'proveedor_no_lo_tiene',   'El proveedor no lo tiene',           false),
  ('linea_caida', 'discontinuado',           'Discontinuado',                      false),
  ('linea_caida', 'no_llega_a_tiempo',       'No llega a tiempo',                  false),
  ('linea_caida', 'no_se_puede_fabricar',    'No se puede fabricar (medida)',      false),
  ('linea_caida', 'error_fabricacion',       'Error de fabricación',               false),
  ('linea_caida', 'error_cotizacion',        'Error de cotización',                false),
  ('linea_caida', 'error_medicion',          'Error de medición',                  false),
  ('linea_caida', 'otros',                   'Otros',                              true),
  -- §Inventario — diferencias de conteo
  ('diferencia_conteo', 'aparecida',         'Aparecida',                          false),
  ('diferencia_conteo', 'faltante',          'Faltante',                           false),
  ('diferencia_conteo', 'mal_ubicada',       'Mal ubicada',                        false),
  ('diferencia_conteo', 'error_carga',       'Error de carga',                     false),
  ('diferencia_conteo', 'rotura_no_registrada', 'Rotura no registrada',            false),
  ('diferencia_conteo', 'otros',             'Otros',                              true),
  -- §Producción — atrasos. "Falta material" registrable desde el día 1, para
  -- que cuando toque decidir si controlar insumos, exista el dato del costo.
  ('atraso', 'falta_material',               'Falta material',                     false),
  ('atraso', 'proveedor_demorado',           'Proveedor demorado',                 false),
  ('atraso', 'error_fabricacion',            'Error de fabricación',               false),
  ('atraso', 'falta_hierro',                 'Falta hierro o herrajes',            false),
  ('atraso', 'otros',                        'Otros',                              true),
  -- CRM — rechazo de consulta. Los tres primeros son "evitables" y disparan
  -- la oportunidad perdida.
  ('rechazo_consulta', 'dejo_de_responder',  'Dejó de responder',                  false),
  ('rechazo_consulta', 'compro_otro_lado',   'Lo compró en otro lado',             false),
  ('rechazo_consulta', 'se_fue_de_precio',   'Se le fue de precio',                false),
  ('rechazo_consulta', 'no_le_gusto',        'No le gustó',                        false),
  ('rechazo_consulta', 'otros',              'Otros',                              true)
on conflict (ambito, codigo) do nothing;


-- =====================================================================
-- 1 · TIPOS
-- =====================================================================

-- Los cuatro de la app. "Movimiento interno" es un tipo de viaje, no una
-- entrega a cliente: mueve unidades entre ubicaciones.
create type tipo_flete as enum ('envio','expreso','retiro','movimiento_interno');

-- Máquina de estados del envío, tal cual la app.
create type estado_envio as enum (
  'por_completar',   -- falta un dato para poder coordinar
  'coordinada',      -- día y ventana acordados con el cliente
  'en_viaje',        -- salió el camión
  'entregada',       -- llegó al cliente
  'por_rendir',      -- entregada, esperando la rendición de Lucas
  'cerrado',         -- Jony validó: se cobró, se rindió, salió el mueble
  'en_reclamo',
  'cancelado'
);

-- El costo del flete y el de instalación se cobran o ya están pagos.
create type estado_cobro_flete as enum ('cobrar','pagado','sincosto');

-- Sección 10: los cuatro estados de la app de reclamos.
create type estado_reclamo as enum ('abierto','en_espera','en_produccion','cerrado');

-- Causas. "No tiene solución" NO está acá a propósito: es un RESULTADO, no
-- una causa. Mezclarlo ensucia la medición — un reclamo sin solución igual
-- tuvo una causa, y esa es la que hay que registrar.
create type causa_reclamo as enum ('flete','proveedor','fabrica','carpintero','asesoria');

create type canal_reclamo as enum ('domicilio','whatsapp','instagram','local','vendedor','telefono');

-- Quién absorbe. Son cuatro, no dos: la Guía de Reclamos suma chofer y
-- proveedor a los que ya estaban.
create type absorbe_costo as enum ('empresa','cliente','chofer','proveedor');


-- =====================================================================
-- 2 · ZONA Y PEAJE
-- Los montos salen de la constante PEAJE de la app. Son parámetros de
-- negocio: van a tabla, no al código.
-- =====================================================================

create table zona (
  id         bigint generated always as identity primary key,
  nombre     text unique not null,
  provincia  text,
  peaje      numeric(14,2) not null default 0,
  costo_base numeric(14,2),
  activa     boolean not null default true
);

insert into zona (nombre, provincia, peaje) values
  ('CABA',          'CABA',            0),
  ('LA PLATA',      'Buenos Aires', 4000),
  ('EZEIZA',        'Buenos Aires', 3500),
  ('PILAR',         'Buenos Aires', 5000),
  ('CANNING',       'Buenos Aires', 3000),
  ('BERAZATEGUI',   'Buenos Aires', 2500),
  ('SAN VICENTE',   'Buenos Aires', 3000),
  ('ESCOBAR',       'Buenos Aires', 4000),
  ('LUJAN',         'Buenos Aires', 6000)
on conflict do nothing;

-- Ventana horaria por defecto según el tipo de flete (HORARIO_DEF de la app).
create table horario_default (
  tipo       tipo_flete primary key,
  desde_hora smallint not null,
  hasta_hora smallint not null
);

insert into horario_default (tipo, desde_hora, hasta_hora) values
  ('envio',              12, 19),
  ('expreso',             9, 16),
  ('retiro',             11, 17),
  ('movimiento_interno', 11, 18)
on conflict do nothing;


-- =====================================================================
-- 3 · VIAJE (hoja de ruta)
-- Principio 23: el sistema NO arma el día. Le da a Lucas mejores datos para
-- armarlo. El automático propone; la persona que conoce el terreno manda.
-- =====================================================================

create table viaje (
  id          bigint generated always as identity primary key,
  fecha       date not null,
  chofer_id   bigint not null references agente(id),
  zona_id     bigint references zona(id),
  -- El camión ES una ubicación del inventario (§Entregas): una unidad puede
  -- estar en tránsito sin haber vuelto al depósito.
  ubicacion_id bigint references ubicacion(id),
  cerrado     boolean not null default false,
  observacion text,
  created_at  timestamptz not null default now(),
  created_by  bigint references agente(id)
);

create index on viaje (fecha, chofer_id);
create index on viaje (cerrado) where not cerrado;


-- =====================================================================
-- 4 · ENVÍO
-- La coordinación de una entrega. Agrupa líneas — que pueden venir de
-- ÓRDENES DISTINTAS si están unificadas por cliente + dirección.
-- =====================================================================

create table envio (
  id             bigint generated always as identity primary key,
  numero         text unique not null default core.siguiente_numero('envio'),
  cliente_id     bigint not null references cliente(id),
  direccion_id   bigint references cliente_direccion(id),
  -- Nullable: un movimiento interno no tiene cliente detrás.
  grupo_orden_id bigint references grupo_orden(id),

  tipo           tipo_flete not null default 'envio',
  estado         estado_envio not null default 'por_completar',

  viaje_id       bigint references viaje(id),
  chofer_id      bigint references agente(id),
  zona_id        bigint references zona(id),

  fecha          date,
  ventana_desde  smallint,
  ventana_hasta  smallint,

  -- Movimiento interno: de dónde sale y a dónde va.
  origen_id      bigint references ubicacion(id),
  destino_id     bigint references ubicacion(id),

  -- EL CANDADO. En la app es `habilitada=false` → "Condicionada a pago".
  -- Se reserva el día pero no se puede despachar hasta confirmarlo.
  habilitada     boolean not null default true,
  motivo_traba   text,
  destrabada_por bigint references agente(id),
  destrabada_en  timestamptz,

  -- Costo del flete y de la instalación, cada uno con su estado de cobro.
  costo_flete        numeric(14,2) not null default 0,
  costo_flete_estado estado_cobro_flete not null default 'sincosto',
  instalacion        numeric(14,2) not null default 0,
  instalacion_estado estado_cobro_flete not null default 'sincosto',
  -- §Entregas: si el mueble no entra por el ascensor, la escalera es un
  -- servicio con costo extra. Se cotiza al vender, no en la puerta.
  costo_escalera     numeric(14,2) not null default 0,
  peaje              numeric(14,2) not null default 0,

  -- Se llama al cliente 30-60 min antes. Es un PASO DEL PROCESO y se
  -- registra: si una entrega falló y no hubo llamado previo, eso es un dato.
  llamado_previo     boolean not null default false,
  llamado_previo_en  timestamptz,

  comentario_cliente text,       -- sale impreso en el remito
  nota_interna       text,
  created_at         timestamptz not null default now(),
  created_by         bigint references agente(id),

  check (ventana_hasta is null or ventana_desde is null or ventana_hasta > ventana_desde),
  -- Un movimiento interno va de una ubicación a otra, no a un cliente.
  check (tipo <> 'movimiento_interno' or (origen_id is not null and destino_id is not null))
);

create index on envio (cliente_id);
create index on envio (viaje_id) where viaje_id is not null;
create index on envio (fecha, estado);
create index on envio (estado) where estado not in ('cerrado','cancelado');
create index on envio (habilitada) where not habilitada;

comment on column envio.habilitada is
  'FALSE = "Condicionada a pago". Se reserva el día pero no se despacha hasta confirmar el cobro. Destraban Jony o Brian, o se destraba solo si el cobro se recupera.';

-- Qué líneas van en cada envío. Una línea = una unidad física, así que la
-- entrega parcial es simplemente que no todas las líneas del grupo entren en
-- el mismo envío.
create table envio_linea (
  envio_id  bigint not null references envio(id) on delete cascade,
  linea_id  bigint not null references linea(id),
  embalado  boolean not null default false,
  primary key (envio_id, linea_id)
);

-- Una línea viva no puede estar en dos envíos a la vez.
create unique index on envio_linea (linea_id);


-- =====================================================================
-- 5 · LAS DOS CONDICIONES — no se entrega sin cobrar
--
-- Despacho (sale el camión): saldo = 0 O saldo ≤ límite de cobro en domicilio
-- Entrega  (se baja el mueble): saldo = 0. El chofer cobra la diferencia.
--
-- Son dos condiciones distintas, no una. El saldo se cierra en la puerta.
-- =====================================================================

-- Candado de completitud (§Línea que se cae): no se entrega el 95%.
-- Si una línea del grupo atado falta, frena la coordinación e indica cuál.
create or replace function core.envio_puede_despachar(p_envio bigint)
returns table (puede boolean, motivo text)
language plpgsql stable as $$
declare
  v_hab   boolean;
  v_falta text;
  v_saldo numeric;
  v_lim   numeric := core.param_num('logistica.limite_cobro_domicilio');
begin
  select habilitada into v_hab from core.envio where id = p_envio;
  if not v_hab then
    return query select false, 'Condicionada a pago'::text; return;
  end if;

  -- Candado de completitud: alguna línea del envío pertenece a un grupo
  -- atado que todavía no está completo.
  select string_agg(distinct g.grupo_id::text, ', ') into v_falta
    from core.envio_linea el
    join core.linea l on l.id = el.linea_id
    join core.grupo_completitud g on g.grupo_id = l.grupo_atado_id
   where el.envio_id = p_envio and not g.puede_despachar;

  if v_falta is not null then
    return query select false,
      ('Grupo incompleto: faltan líneas del grupo '||v_falta)::text; return;
  end if;

  -- Saldo: puede salir con saldo hasta el límite de cobro en domicilio.
  select coalesce(sum(s.saldo),0) into v_saldo
    from (select distinct l.orden_id from core.envio_linea el
            join core.linea l on l.id = el.linea_id
           where el.envio_id = p_envio) o
    join core.orden_saldo s on s.orden_id = o.orden_id;

  if v_saldo > v_lim then
    return query select false,
      ('Saldo $'||v_saldo||' supera el límite de cobro en domicilio')::text; return;
  end if;

  return query select true, 'OK'::text;
end;
$$;


-- =====================================================================
-- 6 · ENTREGA
-- La evidencia con la que se discute cualquier reclamo posterior.
-- Sin remito firmado y foto, todo reclamo se resuelve contra la palabra
-- del chofer.
-- =====================================================================

create table entrega (
  id            bigint generated always as identity primary key,
  envio_id      bigint not null references envio(id),
  fecha         timestamptz not null default now(),
  chofer_id     bigint references agente(id),

  -- Las dos cosas, siempre.
  remito_url    text,
  foto_url      text,
  remito_firmado boolean not null default false,

  -- El chofer cobra la diferencia en la puerta.
  cobro_id      bigint references cobro(id),
  -- Excepción a "no se entrega sin cobrar": solo Jony o Brian.
  autorizacion_id bigint references autorizacion(id),

  -- Cierre: lo hace Jony contra la rendición de Lucas. Valida tres cosas —
  -- que se cobró, que se rindió, y que salió el mueble.
  cerrada_por   bigint references agente(id),
  cerrada_en    timestamptz,

  observacion   text
);

create index on entrega (envio_id);
create index on entrega (fecha desc);
create index on entrega (cerrada_en) where cerrada_en is null;

-- Motivos de fallida, tipificados. Salen de la app: MOTIVOS_PROBLEMA,
-- MOTIVOS_REPROG y MOTIVOS_CANCEL.
create table entrega_fallida (
  id             bigint generated always as identity primary key,
  envio_id       bigint not null references envio(id),
  fecha          timestamptz not null default now(),
  motivo_id      bigint references motivo(id),
  motivo_texto   text,
  -- El responsable determina quién absorbe el segundo viaje.
  responsable    absorbe_costo not null,
  responsable_id bigint references agente(id),
  -- "El chofer responsable no cobra el segundo viaje." Es una consecuencia
  -- económica directa, y es lo que hace que la causa no sea decorativa.
  segundo_viaje_se_paga boolean not null default true,
  costo_segundo_viaje   numeric(14,2),
  registrada_por bigint references agente(id),
  detalle        text
);

create index on entrega_fallida (envio_id);
create index on entrega_fallida (responsable, fecha);

insert into motivo (ambito, codigo, etiqueta, permite_texto_libre) values
  -- MOTIVOS_PROBLEMA de la app
  ('entrega_problema', 'no_esta_en_deposito',  'El mueble no está en depósito', false),
  ('entrega_problema', 'llego_con_daño',       'Llegó con daño o falla',        false),
  ('entrega_problema', 'falta_accesorio',      'Falta un accesorio o pieza',    false),
  ('entrega_problema', 'no_entra_escalera',    'No entra / hay escalera',       false),
  ('entrega_problema', 'cliente_ausente',      'El cliente no estaba',          false),
  ('entrega_problema', 'sin_plata',            'No tenía la plata',             false),
  ('entrega_problema', 'otros',                'Otros',                         true),
  -- MOTIVOS_REPROG
  ('reprogramacion',   'cliente_no_podia',     'El cliente no podía recibirlo', false),
  ('reprogramacion',   'flete_no_llega',       'El flete no llega ese día',     false),
  ('reprogramacion',   'mueble_no_en_cond',    'El mueble no estaba en condiciones', false),
  ('reprogramacion',   'otros',                'Otros',                         true),
  -- MOTIVOS_CANCEL
  ('cancelacion_envio','error_tipeo',          'Error de tipeo',                false),
  ('cancelacion_envio','cliente_no_puede',     'El cliente no puede recibirlo', false),
  ('cancelacion_envio','chofer_no_llego',      'El chofer no llegó en horario', false),
  ('cancelacion_envio','otros',                'Otros',                         true)
on conflict do nothing;


-- =====================================================================
-- 7 · RECLAMO
-- "Reclamos es el módulo que le pone precio a los errores de todos los
--  demás." No mide el problema: mide la gestión.
-- =====================================================================

create table reclamo (
  id            bigint generated always as identity primary key,
  numero        text unique not null default core.siguiente_numero('reclamo'),
  cliente_id    bigint not null references cliente(id),
  orden_id      bigint references orden(id),
  linea_id      bigint references linea(id),
  entrega_id    bigint references entrega(id),

  -- El canal es un DATO del reclamo, no un circuito distinto: todos
  -- desembocan en el mismo objeto.
  canal         canal_reclamo not null,
  estado        estado_reclamo not null default 'abierto',

  -- La causa siempre se registra, incluso si el reclamo no tuvo solución.
  causa         causa_reclamo,
  responsable_id bigint references agente(id),   -- qué carpintero, qué chofer

  descripcion   text not null,

  -- La escalera unificada: tipos de solución y peldaños son lo mismo con dos
  -- nombres. Ordenados por costo creciente (§10).
  --   1 recomendaciones de uso · 2 reintegro parcial · 3 carpintero a
  --   domicilio · 4 trae a fábrica o cambio en domicilio · 5 cambio en
  --   fábrica · 6 devolución total
  peldano       smallint check (peldano between 1 and 6),
  resultado     text check (resultado in ('resuelto','sin_solucion','rechazado_por_cliente')),

  -- Los tres handoffs explícitos. Cada uno tiene que saber cuándo le toca
  -- sin que nadie lo persiga por WhatsApp.
  responsable_reclamo_id bigint references agente(id),  -- Cintia: cara al cliente
  gestion_fabrica_id     bigint references agente(id),  -- Iara: repara adentro
  coordina_envio_id      bigint references agente(id),  -- Lucas: el viaje

  abierto_en    timestamptz not null default now(),
  abierto_por   bigint references agente(id),
  cerrado_en    timestamptz,
  cerrado_por   bigint references agente(id),

  check (estado <> 'cerrado' or cerrado_en is not null)
);

create index on reclamo (cliente_id);
create index on reclamo (estado) where estado <> 'cerrado';
create index on reclamo (causa, abierto_en);
create index on reclamo (orden_id) where orden_id is not null;
create index on reclamo (responsable_id) where responsable_id is not null;

comment on column reclamo.resultado is
  '"Sin solución" es un RESULTADO, no un responsable. Un reclamo sin solución igual tuvo una causa, y esa es la que se mide.';

-- LA MÉTRICA QUE FALTABA: quién absorbe el costo.
-- La app registra el costo pero no quién lo paga. Y no puede ser una columna:
-- hay cuatro absorbedores posibles y el costo se reparte entre ellos.
-- Es N filas, no un enum.
create table reclamo_costo (
  id          bigint generated always as identity primary key,
  reclamo_id  bigint not null references reclamo(id) on delete cascade,
  concepto    text not null check (concepto in ('reparacion','flete','bonificacion','devolucion','material','otro')),
  monto       numeric(14,2) not null check (monto >= 0),
  absorbe     absorbe_costo not null,
  detalle     text,
  registrado_por bigint references agente(id),
  ts          timestamptz not null default now()
);

create index on reclamo_costo (reclamo_id);
create index on reclamo_costo (absorbe);


-- =====================================================================
-- 8 · VISTAS
-- Principio 26: el tablero no se diseña, se deriva.
-- =====================================================================

-- El día de Lucas. El sistema no lo arma: le da mejores datos para armarlo.
create view logistica_del_dia as
select
  e.id            as envio_id,
  e.numero,
  e.fecha,
  e.tipo,
  e.estado,
  c.nombre        as cliente,
  d.direccion,
  z.nombre        as zona,
  z.peaje,
  e.ventana_desde, e.ventana_hasta,
  ag.nombre       as chofer,
  count(el.linea_id)                                   as bultos,
  e.habilitada,
  (select motivo from core.envio_puede_despachar(e.id)) as traba,
  e.costo_flete, e.costo_flete_estado,
  e.instalacion,  e.instalacion_estado,
  e.llamado_previo
from envio e
join cliente c on c.id = e.cliente_id
left join cliente_direccion d on d.id = e.direccion_id
left join zona z on z.id = e.zona_id
left join agente ag on ag.id = e.chofer_id
left join envio_linea el on el.envio_id = e.id
where e.estado not in ('cerrado','cancelado')
group by e.id, c.nombre, d.direccion, z.nombre, z.peaje, ag.nombre;

-- Fallidas por causa y por responsable. La métrica que hace que la causa no
-- sea un dato decorativo.
create view entregas_fallidas_resumen as
select
  date_trunc('month', ef.fecha)  as mes,
  ef.responsable,
  m.etiqueta                     as motivo,
  ag.nombre                      as responsable_nombre,
  count(*)                       as fallidas,
  count(*) filter (where not ef.segundo_viaje_se_paga) as segundos_viajes_no_pagos,
  sum(ef.costo_segundo_viaje)    as costo_total
from entrega_fallida ef
left join motivo m  on m.id  = ef.motivo_id
left join agente ag on ag.id = ef.responsable_id
group by 1,2,3,4;

-- El tablero de reclamos. "% que absorbe el cliente" mide la efectividad de
-- Cintia: si el cliente se hace cargo de tres donde antes pagaba uno, no es
-- que los reclamos cambiaron — es que está negociando mejor.
create view reclamos_tablero as
select
  r.id, r.numero, r.canal, r.estado, r.causa, r.peldano, r.resultado,
  c.nombre                                              as cliente,
  ag.nombre                                             as responsable,
  r.abierto_en,
  r.cerrado_en,
  (r.cerrado_en::date - r.abierto_en::date)             as dias_resolucion,
  coalesce(sum(rc.monto), 0)                            as costo_total,
  coalesce(sum(rc.monto) filter (where rc.absorbe = 'empresa'),   0) as absorbe_bh,
  coalesce(sum(rc.monto) filter (where rc.absorbe = 'cliente'),   0) as paga_cliente,
  coalesce(sum(rc.monto) filter (where rc.absorbe = 'chofer'),    0) as absorbe_chofer,
  coalesce(sum(rc.monto) filter (where rc.absorbe = 'proveedor'), 0) as absorbe_proveedor,
  round(100.0 * coalesce(sum(rc.monto) filter (where rc.absorbe = 'cliente'),0)
        / nullif(sum(rc.monto),0), 1)                   as pct_cliente
from reclamo r
join cliente c on c.id = r.cliente_id
left join agente ag on ag.id = r.responsable_id
left join reclamo_costo rc on rc.reclamo_id = r.id
group by r.id, c.nombre, ag.nombre;

-- Tasa de reclamos sobre entregas: cuántas de cada 100 terminan en reclamo.
create view tasa_reclamos as
select
  date_trunc('month', e.fecha)                       as mes,
  count(distinct e.id)                               as entregas,
  count(distinct r.id)                               as reclamos,
  round(100.0 * count(distinct r.id)
        / nullif(count(distinct e.id),0), 2)         as tasa_pct
from entrega e
left join reclamo r on r.entrega_id = e.id
group by 1;


-- =====================================================================
-- 9 · SERIE
-- =====================================================================
insert into serie (codigo, descripcion, prefijo) values
  ('envio',   'Envíos',   'EN'),
  ('reclamo', 'Reclamos', 'RM')
on conflict (codigo) do nothing;


-- =====================================================================
-- PENDIENTE
--   · Lista de precios de instalación        → decisión conjunta
--   · Segunda visita: agenda y prioridad     → logística
--   · Capacidad del viaje (bultos / m³ / kg) → no está definida en ningún lado
-- =====================================================================

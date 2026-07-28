-- =====================================================================
-- BELGRANO CORE · MODELO DE DATOS
-- Bloque 2 de 4 — LA PLATA
-- Postgres / Supabase · Julio 2026
--
-- Cubre: numeración · cobro · imputación · caja · rendición ·
--        diferencia de caja · devolución · cesión de saldo · bloqueo financiero
--
-- Correr DESPUÉS del bloque 1, entero, de una vez.
--
-- La decisión que sostiene todo el bloque:
--   EL COBRO PERTENECE AL CLIENTE, NO A LA ORDEN.
--   Cobro e imputación son dos objetos, relación N a N. De ahí salen el saldo
--   a favor, el pago doble, el sobrepago y el pagador tercero SIN mecánicas
--   nuevas. La orden no "tiene" plata: consume plata de la cuenta del cliente.
-- =====================================================================

set search_path = core, public;


-- =====================================================================
-- 0 · NUMERACIÓN
-- §Tesorería: "una sola serie global, correlativa, generada por el sistema,
-- imborrable". La serie por local era una muleta del papel: con talonarios la
-- única forma de saber que no faltaba ninguno era que los números fueran
-- seguidos. En el sistema los cobros no se pueden borrar, y el control por
-- local se resuelve FILTRANDO, no numerando.
-- =====================================================================

create table serie (
  codigo      text primary key,
  descripcion text not null,
  prefijo     text,
  ultimo      bigint not null default 0
);

insert into serie (codigo, descripcion, prefijo) values
  ('presupuesto','Presupuestos',                                          'PR'),
  ('orden',      'Órdenes de venta',                                      'OV'),
  ('cobro',      'Cobros — serie única global, correlativa e imborrable', 'CO'),
  ('rendicion',  'Rendiciones',                                           'RE'),
  ('devolucion', 'Solicitudes de devolución',                             'DV');

create or replace function core.siguiente_numero(p_serie text)
returns text language plpgsql as $$
declare v_n bigint; v_p text;
begin
  update core.serie set ultimo = ultimo + 1
   where codigo = p_serie
  returning ultimo, prefijo into v_n, v_p;
  if v_n is null then
    raise exception 'Serie inexistente: %', p_serie;
  end if;
  return coalesce(v_p||'-','') || lpad(v_n::text, 6, '0');
end;
$$;

-- El bloque 1 dejaba numero sin default: lo generaba la app. Mejor en la base,
-- así dos vendedores cargando a la vez no pueden repetir número.
alter table presupuesto alter column numero set default core.siguiente_numero('presupuesto');
alter table orden       alter column numero set default core.siguiente_numero('orden');

-- Durante la transición, mientras convivan papel y sistema, se guarda el
-- número de talonario para conciliar. Se abandona cuando el papel sale.
alter table orden add column nro_talonario text;


-- =====================================================================
-- 1 · TIPOS
-- =====================================================================

create type moneda        as enum ('ARS','USD');
create type tipo_cobro    as enum ('sena','refuerzo','saldo');
create type medio_cobro   as enum ('efectivo','transferencia','debito','tarjeta_credito',
                                   'mercado_pago','cheque','dolares');
create type tipo_caja     as enum ('personal','local','bancaria','billetera','dolares');

-- Dos dimensiones INDEPENDIENTES. Un cobro activo puede estar pendiente,
-- verificado o rendido; uno rechazado también tuvo su control.
-- Meterlas en un solo enum multiplica los estados y ninguno significa nada.
create type vida_cobro    as enum ('activo','rechazado','devuelto_parcial','devuelto_total','anulado');
create type control_cobro as enum ('pendiente','verificado','rendido','observado','no_aplica');

create type estado_devolucion as enum ('solicitada','autorizada','rechazada','asignada',
                                       'ejecutada','conciliada','cancelada');
create type medio_devolucion  as enum ('transferencia','efectivo_chofer','reembolso_mp','efectivo_sucursal');

create type resolucion_diferencia as enum ('se_busca','error_de_cobro','a_cargo_del_vendedor','se_deja_pasar');


-- =====================================================================
-- 2 · CAJA
-- Dos niveles: caja personal por agente + caja del local.
-- "Caja del local = suma de las cajas personales de los agentes que están
--  ahí ese día." La caja personal es ITINERANTE: Ale los sábados atiende en
--  2299, donde también cobra Cristian.
-- =====================================================================

create table caja (
  id           bigint generated always as identity primary key,
  nombre       text not null,
  tipo         tipo_caja not null,
  -- Personal → tiene agente. De local → tiene ubicación. Nunca las dos.
  agente_id    bigint references agente(id),
  ubicacion_id bigint references ubicacion(id),
  activa       boolean not null default true,
  created_at   timestamptz not null default now(),

  check ((tipo = 'personal' and agente_id is not null and ubicacion_id is null)
      or (tipo = 'local'    and ubicacion_id is not null and agente_id is null)
      or (tipo in ('bancaria','billetera','dolares')))
);
create unique index on caja (agente_id) where tipo = 'personal';
create index on caja (tipo) where activa;

comment on table caja is
  'Toda caja tiene un saldo POR MONEDA, no un saldo. Cada caja física muestra X pesos y X dólares, porque en esa moneda le rinden.';


-- =====================================================================
-- 3 · COBRO
-- "Entró plata. Existe por sí solo, aunque no haya orden."
-- =====================================================================

create table cobro (
  id             bigint generated always as identity primary key,
  numero         text unique not null default core.siguiente_numero('cobro'),

  -- Nullable: la plata sin dueño identificado va a una bandeja de conciliación
  -- de administración hasta que alguien la adopte.
  cliente_id     bigint references cliente(id),
  tipo           tipo_cobro not null,
  medio          medio_cobro not null,

  monto          numeric(14,2) not null check (monto > 0),
  moneda         moneda not null default 'ARS',

  -- Los dólares se guardan EN DÓLARES. No se convierten. La cotización la fija
  -- el vendedor al cobrar (Banco Nación, dólar compra), el sistema la trae
  -- automáticamente pero es editable a mano por si el sitio no responde.
  cotizacion     numeric(14,4),
  -- REGLA CRÍTICA: el equivalente en pesos se CONGELA en el momento del cobro
  -- y no se recalcula NUNCA. Si se recalculara, la deuda del cliente cambiaría
  -- sola con el dólar.
  equivalente_ars numeric(14,2) not null,

  caja_id        bigint not null references caja(id),
  -- Cada cobro se atribuye a un agente Y a un local. Con eso se responden las
  -- dos preguntas: cuánto tiene el local para rendir, y cuánto me tiene que
  -- dar cada uno.
  recibido_por   bigint not null references agente(id),
  local_id       bigint references ubicacion(id),
  -- El pagador tercero es un dato del cobro, no un cliente nuevo.
  pagado_por     text,

  vida           vida_cobro    not null default 'activo',
  control        control_cobro not null default 'pendiente',
  verificado_por bigint references agente(id),
  verificado_en  timestamptz,

  -- Nunca se edita ni se borra: se anula con motivo y se crea otro.
  anulado_motivo text,
  anulado_por    bigint references agente(id),
  anulado_en     timestamptz,
  reemplaza_a    bigint references cobro(id),

  comprobante_url text,
  observacion     text,
  fecha           timestamptz not null default now(),
  created_by      bigint references agente(id),

  -- Si es USD hace falta cotización, y el equivalente tiene que cerrar.
  check (moneda <> 'USD' or cotizacion is not null),
  check (moneda <> 'ARS' or equivalente_ars = monto),
  check (moneda <> 'USD' or abs(equivalente_ars - monto * cotizacion) < 1)
);

create index on cobro (cliente_id, fecha desc);
create index on cobro (caja_id, control);
create index on cobro (recibido_por, control) where control = 'pendiente';
create index on cobro (local_id, fecha);
create index on cobro (vida) where vida <> 'activo';
create index on cobro (cliente_id) where cliente_id is null;

comment on column cobro.equivalente_ars is
  'Congelado al momento del cobro. Los dólares viven como dólares en la caja; la orden queda saldada en pesos. La diferencia de cambio va a contabilidad y NO entra en ninguna métrica de negocio.';

-- Principio 7: lo que salió al mundo no se edita, se compensa.
-- Solo asientos, nunca correcciones silenciosas.
create or replace function core.cobro_inmutable()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Un cobro no se borra: se anula con motivo y se crea otro';
  end if;
  -- Se permite mover el control (verificar, rendir), la vida (anular, rechazar)
  -- y adoptar un cobro huérfano. Los importes, nunca.
  if new.monto           is distinct from old.monto
  or new.moneda          is distinct from old.moneda
  or new.cotizacion      is distinct from old.cotizacion
  or new.equivalente_ars is distinct from old.equivalente_ars
  or new.medio           is distinct from old.medio
  or new.caja_id         is distinct from old.caja_id
  or new.recibido_por    is distinct from old.recibido_por then
    raise exception 'Un cobro no se edita. Anulalo con motivo y creá otro (%).', old.numero;
  end if;
  if old.cliente_id is not null and new.cliente_id is distinct from old.cliente_id then
    raise exception 'El cliente de un cobro no se cambia: anular y recrear';
  end if;
  return new;
end;
$$;

create trigger cobro_no_edita before update or delete on cobro
  for each row execute function core.cobro_inmutable();

-- Un canal no cobra: Tienda Nube no puede tener efectivo en el bolsillo.
-- Sin esto, "efectivo en poder de Tienda Nube" aparece en la vista de
-- rendiciones pendientes y nadie lo puede rendir nunca.
create or replace function core.cobro_receptor_valido()
returns trigger language plpgsql as $$
declare v_tipo text;
begin
  select tipo into v_tipo from core.agente where id = new.recibido_por;
  if v_tipo = 'canal' then
    raise exception 'Un agente de tipo canal no puede recibir un cobro (%)',
      (select nombre from core.agente where id = new.recibido_por);
  end if;
  return new;
end;
$$;

create trigger cobro_receptor before insert on cobro
  for each row execute function core.cobro_receptor_valido();

-- Detección de duplicado (entrada). Avisa, NO bloquea: quien carga marca
-- "es duplicado" o "es otro pago", y esa respuesta queda escrita.
create or replace function core.cobros_similares(
  p_cliente bigint, p_monto numeric, p_medio medio_cobro, p_horas int default null
) returns table (cobro_id bigint, numero text, monto numeric, fecha timestamptz, hace interval)
language sql stable as $$
  select c.id, c.numero, c.monto, c.fecha, now() - c.fecha
    from core.cobro c
   where c.cliente_id = p_cliente
     and c.monto = p_monto
     and c.medio = p_medio
     and c.vida = 'activo'
     and c.fecha > now() - (coalesce(p_horas, core.param_num('cobro.ventana_duplicado_horas'))||' hours')::interval;
$$;


-- =====================================================================
-- 4 · IMPUTACIÓN
-- La aplicación de un cobro a una orden. Relación N a N.
-- "Por defecto a la orden, no a la línea."
-- No se edita: se revierte con contra-imputación.
-- =====================================================================

create table imputacion (
  id          bigint generated always as identity primary key,
  cobro_id    bigint not null references cobro(id),
  orden_id    bigint not null references orden(id),
  -- Negativo = contra-imputación (reversa). Nunca se edita ni se borra.
  monto       numeric(14,2) not null check (monto <> 0),
  revierte_a  bigint references imputacion(id),
  motivo      text,
  actor_id    bigint references agente(id),
  ts          timestamptz not null default now()
);

create index on imputacion (cobro_id);
create index on imputacion (orden_id);
create index on imputacion (revierte_a) where revierte_a is not null;

create or replace function core.imputacion_inmutable()
returns trigger language plpgsql as $$
begin
  raise exception 'Una imputación no se edita ni se borra: se revierte con una contra-imputación';
end;
$$;

create trigger imputacion_no_edita before update or delete on imputacion
  for each row execute function core.imputacion_inmutable();

-- Lo imputado de un cobro no puede superar lo que entró.
-- El sobrepago se resuelve del lado de la ORDEN (queda saldo a favor), no
-- inventando plata que no existe.
create or replace function core.imputacion_no_excede_cobro()
returns trigger language plpgsql as $$
declare v_cobro numeric; v_imputado numeric;
begin
  select equivalente_ars into v_cobro from core.cobro where id = new.cobro_id;
  select coalesce(sum(monto),0) into v_imputado
    from core.imputacion where cobro_id = new.cobro_id;
  if v_imputado + new.monto > v_cobro + 0.01 then
    raise exception
      'La imputación excede el cobro: entraron %, ya hay % imputados, se intenta imputar % más',
      v_cobro, v_imputado, new.monto;
  end if;
  return new;
end;
$$;

create trigger imputacion_tope before insert on imputacion
  for each row execute function core.imputacion_no_excede_cobro();


-- =====================================================================
-- 5 · RENDICIÓN
-- "La rendición ES el arqueo": la caja personal tiene que dar 0.
-- Es un DOCUMENTO, no un estado.
-- =====================================================================

create table rendicion (
  id             bigint generated always as identity primary key,
  numero         text unique not null default core.siguiente_numero('rendicion'),
  emisor_id      bigint not null references agente(id),
  receptor_id    bigint not null references agente(id),
  ubicacion_id   bigint references ubicacion(id),
  fecha          timestamptz not null default now(),

  total_esperado numeric(14,2) not null default 0,
  total_recibido numeric(14,2) not null default 0,
  -- Generada: no puede desincronizarse de los totales.
  diferencia     numeric(14,2) generated always as (total_recibido - total_esperado) stored,

  evidencia_url  text,
  cerrada        boolean not null default false,
  observacion    text,

  check (emisor_id <> receptor_id)
);

create index on rendicion (emisor_id, fecha desc);
create index on rendicion (receptor_id, fecha desc);
create index on rendicion (cerrada) where not cerrada;

-- Qué cobros entran en cada rendición. El sistema la arma con todos los cobros
-- pendientes de ese local y ese agente: cuántos son, cuánto suman, en qué
-- moneda y quién los cobró. Eso es lo que se firma.
create table rendicion_cobro (
  rendicion_id bigint not null references rendicion(id) on delete cascade,
  cobro_id     bigint not null references cobro(id),
  primary key (rendicion_id, cobro_id)
);
-- Un cobro se rinde UNA sola vez.
create unique index on rendicion_cobro (cobro_id);

-- Toda diferencia se registra. Siempre queda la marca: es el control más
-- fuerte que hay hoy. Cada resolución guarda quién la decidió y cuándo.
create table diferencia_caja (
  id            bigint generated always as identity primary key,
  rendicion_id  bigint not null references rendicion(id),
  monto         numeric(14,2) not null,
  resolucion    resolucion_diferencia not null default 'se_busca',
  detalle       text,
  resuelta_por  bigint references agente(id),
  resuelta_en   timestamptz,
  created_at    timestamptz not null default now()
);
create index on diferencia_caja (rendicion_id);

-- Al cerrar la rendición: los cobros pasan a rendido y, si hay diferencia,
-- queda registrada sola. No depende de que alguien se acuerde.
create or replace function core.cerrar_rendicion(p_rendicion bigint, p_recibido numeric)
returns numeric language plpgsql as $$
declare v_esperado numeric; v_dif numeric;
begin
  select coalesce(sum(c.equivalente_ars),0) into v_esperado
    from core.rendicion_cobro rc
    join core.cobro c on c.id = rc.cobro_id
   where rc.rendicion_id = p_rendicion;

  update core.rendicion
     set total_esperado = v_esperado,
         total_recibido = p_recibido,
         cerrada = true
   where id = p_rendicion;

  update core.cobro c
     set control = 'rendido'
    from core.rendicion_cobro rc
   where rc.rendicion_id = p_rendicion
     and c.id = rc.cobro_id
     and c.control <> 'rendido';

  v_dif := p_recibido - v_esperado;
  if abs(v_dif) > 0.01 then
    insert into core.diferencia_caja (rendicion_id, monto) values (p_rendicion, v_dif);
  end if;

  perform audit.registrar('cobranza_rendida','rendicion',p_rendicion, null, null,
    jsonb_build_object('esperado',v_esperado,'recibido',p_recibido,'diferencia',v_dif));

  return v_dif;
end;
$$;


-- =====================================================================
-- 6 · MOVIMIENTO ENTRE CAJAS
-- Sergio le rinde a Claudia, Claudia le lleva a Daniel, Daniel deposita:
-- esa plata se movió tres veces sin que entrara ni saliera nada del negocio.
-- NO toca ninguna métrica. Sin esto, las cajas nunca cierran.
-- =====================================================================

create table movimiento_caja (
  id          bigint generated always as identity primary key,
  origen_id   bigint not null references caja(id),
  destino_id  bigint not null references caja(id),
  monto       numeric(14,2) not null check (monto > 0),
  moneda      moneda not null default 'ARS',
  motivo      text,
  actor_id    bigint references agente(id),
  ts          timestamptz not null default now(),
  check (origen_id <> destino_id)
);
create index on movimiento_caja (origen_id, ts desc);
create index on movimiento_caja (destino_id, ts desc);


-- =====================================================================
-- 7 · DEVOLUCIÓN
-- Un solo objeto, cuatro medios de ejecución.
-- Solicitud (cualquiera) → Autorización (Jony o Brian, SIEMPRE) →
-- Asignación de medio y ejecutor → Ejecución → Evidencia de cierre
-- =====================================================================

create table devolucion (
  id              bigint generated always as identity primary key,
  numero          text unique not null default core.siguiente_numero('devolucion'),
  cliente_id      bigint not null references cliente(id),
  orden_id        bigint references orden(id),
  monto           numeric(14,2) not null check (monto > 0),
  moneda          moneda not null default 'ARS',

  estado          estado_devolucion not null default 'solicitada',

  solicitada_por  bigint not null references agente(id),
  solicitada_en   timestamptz not null default now(),
  motivo          text not null,

  -- SIEMPRE Jony o Brian.
  autorizada_por  bigint references agente(id),
  autorizada_en   timestamptz,

  -- Simetría del medio: vuelve por donde entró, salvo autorización.
  medio           medio_devolucion,
  ejecutor_id     bigint references agente(id),
  caja_id         bigint references caja(id),
  ejecutada_en    timestamptz,
  evidencia_url   text,

  -- Medio 4: efectivo comprometido en sucursal. Es plata autorizada esperando
  -- a un cliente que puede no venir. Vencido el plazo vuelve a la caja y el
  -- saldo se restituye. Sin esto, es plata perdida en un cajón.
  vence_el        date,
  restituida_en   timestamptz,

  conciliada_en   timestamptz,
  observacion     text,

  check (estado <> 'autorizada' or autorizada_por is not null),
  check (estado not in ('ejecutada','conciliada') or (medio is not null and ejecutada_en is not null))
);

create index on devolucion (cliente_id);
create index on devolucion (estado) where estado not in ('conciliada','cancelada','rechazada');
create index on devolucion (vence_el) where estado = 'ejecutada' and medio = 'efectivo_sucursal';


-- =====================================================================
-- 8 · CESIÓN DE SALDO
-- Un cliente le cede su saldo a otro (no puede concretar y compra un familiar).
-- Lo autoriza administración.
-- =====================================================================

create table cesion_saldo (
  id             bigint generated always as identity primary key,
  cliente_origen bigint not null references cliente(id),
  cliente_destino bigint not null references cliente(id),
  monto          numeric(14,2) not null check (monto > 0),
  -- EL SALDO VIAJA CON SU FECHA DE ORIGEN, no con la de la cesión.
  -- Si no, ceder el saldo se vuelve el truco para resetear el reloj de vigencia.
  fecha_origen   timestamptz not null,
  autorizada_por bigint not null references agente(id),
  -- Si ya se emitió factura al cliente original, queda marcada para revisión.
  requiere_revision_fiscal boolean not null default false,
  motivo         text,
  ts             timestamptz not null default now(),
  check (cliente_origen <> cliente_destino)
);
create index on cesion_saldo (cliente_origen);
create index on cesion_saldo (cliente_destino);


-- =====================================================================
-- 9 · CONDICIÓN COMERCIAL
-- El acuerdo de sostener un precio o un descuento.
-- Es INDEPENDIENTE del saldo monetario: el saldo es siempre nominal.
-- Lo que caduca es la condición, no la plata.
-- =====================================================================

create table condicion_comercial (
  id             bigint generated always as identity primary key,
  cliente_id     bigint not null references cliente(id),
  orden_id       bigint references orden(id),
  descripcion    text not null,
  vigente_hasta  date,
  autorizada_por bigint not null references agente(id),
  ts             timestamptz not null default now()
);
create index on condicion_comercial (cliente_id);


-- =====================================================================
-- 10 · VISTAS — los saldos se DERIVAN, no se guardan
-- =====================================================================

-- Cuánto se imputó a cada orden y cuánto falta.
create view orden_saldo as
select
  o.id                                     as orden_id,
  o.numero,
  o.cliente_id,
  coalesce(oe.total, 0)                    as total,
  coalesce(sum(i.monto), 0)                as imputado,
  coalesce(oe.total,0) - coalesce(sum(i.monto),0) as saldo,
  -- Lo RENDIDO es lo que habilita el despacho, no lo cobrado.
  coalesce(sum(i.monto) filter (where c.control = 'rendido'), 0) as rendido,
  o.bloqueo_financiero
from orden o
left join orden_estado oe on oe.id = o.id
left join imputacion i on i.orden_id = o.id
left join cobro c on c.id = i.cobro_id and c.vida = 'activo'
group by o.id, o.numero, o.cliente_id, oe.total, o.bloqueo_financiero;

-- SALDO A FAVOR = cobro verificado o rendido, no imputado.
-- No necesita mecánica nueva: ya la tiene.
-- El saldo es NOMINAL, con fecha de origen y antigüedad siempre visible:
-- "$300.000 puestos el 12/3 — hace 137 días".
create view cliente_saldo_a_favor as
select
  c.cliente_id,
  c.id                                as cobro_id,
  c.numero,
  c.equivalente_ars                   as entro,
  coalesce(sum(i.monto), 0)           as imputado,
  c.equivalente_ars - coalesce(sum(i.monto),0) as a_favor,
  c.fecha                             as fecha_origen,
  (current_date - c.fecha::date)      as dias,
  -- El sistema NUNCA licúa ni caduca un saldo solo: informa, y la persona que
  -- atiende decide cuánto reconoce, con autorización de un encargado.
  (current_date - c.fecha::date) > core.param_num('saldo.vigencia_precio_congelado_dias')
                                      as fuera_de_vigencia
from cobro c
left join imputacion i on i.cobro_id = c.id
where c.vida = 'activo'
  and c.control in ('verificado','rendido')
  and c.cliente_id is not null
group by c.id, c.cliente_id, c.numero, c.equivalente_ars, c.fecha
having c.equivalente_ars - coalesce(sum(i.monto),0) > 0.01;

-- Efectivo en poder de cada agente, con antigüedad.
-- Entre cobrar y rendir, la plata está en el bolsillo de una persona.
-- "Efectivo en poder de [agente]: $X, hace N días."
-- La antigüedad escala la alerta: lo de hace 3 días no es lo de anoche.
create view efectivo_en_poder_de as
select
  c.recibido_por                              as agente_id,
  a.nombre                                    as agente,
  c.moneda,
  sum(c.monto)                                as monto,
  count(*)                                    as cobros,
  min(c.fecha)                                as mas_viejo,
  (current_date - min(c.fecha)::date)         as dias,
  case
    when (current_date - min(c.fecha)::date) >= core.param_num('cobro.dias_sin_rendir_bloquea') then 'bloquea'
    when (current_date - min(c.fecha)::date) >= 2 then 'escala'
    when (current_date - min(c.fecha)::date) >= 1 then 'avisa'
    else 'ok'
  end                                         as alerta
from cobro c
join agente a on a.id = c.recibido_por
where c.vida = 'activo'
  and c.control = 'pendiente'
  and c.medio in ('efectivo','dolares')
group by c.recibido_por, a.nombre, c.moneda;

-- Saldo por caja Y POR MONEDA. No un saldo: uno por moneda.
create view caja_saldo as
with entradas as (
  select caja_id, moneda, sum(monto) m from cobro
   where vida = 'activo' group by 1,2
), mov_in as (
  select destino_id caja_id, moneda, sum(monto) m from movimiento_caja group by 1,2
), mov_out as (
  select origen_id caja_id, moneda, sum(monto) m from movimiento_caja group by 1,2
), salidas as (
  select caja_id, moneda, sum(monto) m from devolucion
   where estado in ('ejecutada','conciliada') and caja_id is not null group by 1,2
)
select
  k.id      as caja_id,
  k.nombre,
  k.tipo,
  mo.moneda,
  coalesce(e.m,0) + coalesce(mi.m,0) - coalesce(mo2.m,0) - coalesce(s.m,0) as saldo
from caja k
cross join (select unnest(enum_range(null::moneda)) as moneda) mo
left join entradas e   on e.caja_id  = k.id and e.moneda  = mo.moneda
left join mov_in   mi  on mi.caja_id = k.id and mi.moneda = mo.moneda
left join mov_out  mo2 on mo2.caja_id= k.id and mo2.moneda= mo.moneda
left join salidas  s   on s.caja_id  = k.id and s.moneda  = mo.moneda
where k.activa;

-- Bandeja de conciliación: plata sin dueño.
create view cobros_sin_cliente as
select id, numero, monto, moneda, medio, fecha, recibido_por,
       (current_date - fecha::date) as dias
  from cobro
 where cliente_id is null and vida = 'activo';


-- =====================================================================
-- 11 · COBRO CAÍDO Y BLOQUEO FINANCIERO
-- Única excepción a "avisa, no bloquea".
--
-- "El principio protege la venta hacia adelante. Un cobro caído significa que
--  la venta dejó de ser real. No hay nada que proteger."
--
-- El freno actúa sobre lo que todavía NO se gastó y NO salió:
--   depósito / despacho / entrega → freno duro
--   facturación                   → freno
--   compra a proveedor            → freno si la OC no salió; si salió, alerta
--   producción no iniciada        → freno
--   producción YA iniciada        → NO frena, avisa: parar un mueble con la
--                                   madera cortada cuesta más que terminarlo
-- =====================================================================

create or replace function core.rechazar_cobro(
  p_cobro bigint, p_motivo text, p_agente bigint default null
) returns void language plpgsql as $$
declare r record;
begin
  update core.cobro
     set vida = 'rechazado', observacion = coalesce(observacion||' | ','')||p_motivo
   where id = p_cobro;

  -- Se revierten sus imputaciones con contra-imputación (no se borran).
  for r in select orden_id, sum(monto) m from core.imputacion
            where cobro_id = p_cobro group by orden_id having sum(monto) <> 0 loop
    insert into core.imputacion (cobro_id, orden_id, monto, motivo, actor_id)
    values (p_cobro, r.orden_id, -r.m, 'Reversa por cobro caído: '||p_motivo, p_agente);

    -- Y la orden queda en bloqueo financiero, con alerta roja visible.
    update core.orden
       set bloqueo_financiero = true,
           bloqueo_motivo = 'Cobro caído '||(select numero from core.cobro where id = p_cobro)
     where id = r.orden_id;

    -- El freno no alcanza a lo que ya se gastó: producción iniciada avisa.
    update core.linea
       set bloqueada_financ = true
     where orden_id = r.orden_id
       and estado not in ('en_produccion','lista','despachada','entregada','por_rendir','cerrada','anulada');

    perform audit.registrar('bloqueo_financiero','orden',r.orden_id,p_agente,
              null, jsonb_build_object('cobro_id',p_cobro,'motivo',p_motivo),
              p_orden_id => r.orden_id);
  end loop;

  perform audit.registrar('cobro_rechazado','cobro',p_cobro,p_agente,
            jsonb_build_object('vida','activo'), jsonb_build_object('vida','rechazado'),
            p_motivo => p_motivo);
end;
$$;

-- Destraban Jony o Brian, o se destraba solo si el cobro se recupera.
create or replace function core.destrabar_bloqueo(
  p_orden bigint, p_agente bigint, p_motivo text
) returns void language plpgsql as $$
begin
  update core.orden set bloqueo_financiero = false, bloqueo_motivo = null where id = p_orden;
  update core.linea  set bloqueada_financ  = false where orden_id = p_orden;
  perform audit.registrar('bloqueo_destrabado','orden',p_orden,p_agente,
            null, null, p_orden_id => p_orden, p_motivo => p_motivo);
end;
$$;

-- Condición de DESPACHO: saldo 0 o saldo ≤ límite de cobro en domicilio.
-- Condición de ENTREGA: saldo 0. El chofer cobra la diferencia en la puerta.
-- Son dos condiciones distintas, no una.
create or replace function core.puede_despachar(p_orden bigint)
returns table (puede boolean, motivo text)
language sql stable as $$
  select
    case
      when o.bloqueo_financiero then false
      when s.saldo > core.param_num('logistica.limite_cobro_domicilio') then false
      else true
    end,
    case
      when o.bloqueo_financiero then 'Bloqueo financiero: '||coalesce(o.bloqueo_motivo,'')
      when s.saldo > core.param_num('logistica.limite_cobro_domicilio')
        then 'Saldo $'||s.saldo||' supera el límite de cobro en domicilio'
      else 'OK'
    end
  from core.orden o
  join core.orden_saldo s on s.orden_id = o.id
  where o.id = p_orden;
$$;

create or replace function core.puede_entregar(p_orden bigint)
returns table (puede boolean, motivo text)
language sql stable as $$
  select
    case when o.bloqueo_financiero then false
         when s.saldo > 0.01 then false
         else true end,
    case when o.bloqueo_financiero then 'Bloqueo financiero'
         when s.saldo > 0.01 then 'No se entrega sin cobrar. Saldo pendiente: $'||s.saldo
         else 'OK' end
  from core.orden o
  join core.orden_saldo s on s.orden_id = o.id
  where o.id = p_orden;
$$;


-- =====================================================================
-- 12 · SEMILLA
-- =====================================================================

insert into caja (nombre, tipo, ubicacion_id)
select 'Caja '||nombre, 'local', id from ubicacion where codigo in ('B5-699','B1-2020','B3-2299');

insert into caja (nombre, tipo) values
  ('Cuenta bancaria',  'bancaria'),
  ('Billetera virtual','billetera'),
  ('Caja en dólares',  'dolares');


-- =====================================================================
-- PENDIENTE — decisiones que este bloque deja abiertas
--   · Comisión de Mercado Pago en reembolsos: ¿bruto o neto?   → devolucion
--   · Plazo del efectivo comprometido en sucursal              → parametro
--   · Cesión de saldo con factura ya emitida                   → requiere_revision_fiscal
-- =====================================================================

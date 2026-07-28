-- =====================================================================
-- BELGRANO CORE · MODELO DE DATOS
-- Bloque 3 de 4 — ABASTECIMIENTO
-- Postgres / Supabase · Julio 2026
--
-- Cubre: proveedor · pedido · tanda · recepción · fabricación interna ·
--        cuenta corriente · compras y gastos · venta de materiales
--
-- Correr DESPUÉS de los bloques 1 y 2, entero, de una vez.
--
-- ⚠ PRODUCCIÓN INVIERTE EL EJE DEL SISTEMA
--   Todo lo diseñado hasta acá corre de la orden hacia abajo. Acá no:
--   EL PEDIDO A PROVEEDOR AGRUPA LÍNEAS DE MUCHAS ÓRDENES DISTINTAS.
--   Los 15 dibujos que se lleva un carpintero salen de doce ventas.
--   Es el primer objeto del sistema que NO cuelga de una orden. Una línea
--   pertenece a una orden Y a un pedido, y cada uno la mira desde un lado:
--   la orden quiere saber cuándo llega; el pedido, cuánto hay en el taller.
-- =====================================================================

set search_path = core, public;


-- =====================================================================
-- 1 · TIPOS
-- =====================================================================

create type forma_fabricacion as enum ('fabrica_propia','por_tabla','por_dibujo');
create type estado_pedido     as enum ('abierto','cerrado');
create type estado_tanda      as enum ('armando','emitida','en_taller','recibida_parcial','recibida','cancelada');

-- §Producción: la recepción se verifica MUEBLE POR MUEBLE.
create type resultado_recepcion as enum (
  'perfecto',        -- sigue a logística
  'a_reparacion',    -- se arregla
  'reparado',
  'devuelto',        -- vuelve al pedido y se arrastra a la próxima entrega
  'falta_hierro'     -- queda pendiente de completar
);

create type tipo_mov_proveedor as enum (
  'compra_mueble',   -- le compramos
  'venta_material',  -- le vendemos: segunda unidad de negocio
  'pago',
  'ajuste'
);

-- §Compras: momento y medio son atributos del proveedor, con excepción
-- registrable. No hay una regla única.
create type momento_pago as enum ('contra_entrega','a_x_dias','adelantado','adelanto_parcial');
create type medio_pago_prov as enum ('efectivo','transferencia','cheque','tarjeta_credito');

-- La imputación NO es atributo del proveedor: es del MOVIMIENTO. La misma
-- tarjeta paga cosas de la empresa y personales.
create type imputacion_gasto as enum ('DC','Personal');


-- =====================================================================
-- 2 · PROVEEDOR
-- "Al carpintero tercerizado se lo trata como si fuese interno: no puede
--  quedarse sin trabajo." Eso no es una regla de compras, es de CAPACIDAD.
-- Extiende agente (tipo='proveedor'): un proveedor también cobra y tiene
-- cuenta, igual que cualquier otro sujeto.
-- =====================================================================

create table proveedor (
  agente_id            bigint primary key references agente(id),
  forma                forma_fabricacion,
  -- Alerta cuando la carga baja del mínimo: hoy ~15 muebles.
  capacidad_tanda      integer default 40,
  carga_minima_alerta  integer default 15,
  -- No pueden venir cualquier día.
  dia_entrega          smallint check (dia_entrega between 0 and 6),
  -- Defaults de pago y clasificación. Cada compra los hereda, editable.
  momento_pago         momento_pago default 'contra_entrega',
  dias_pago            integer,
  medio_pago           medio_pago_prov default 'transferencia',
  mundo_default        text default 'informal' check (mundo_default in ('formal','informal')),
  categoria_gasto_default text,
  imputacion_default   imputacion_gasto default 'DC',
  -- Configurable por proveedor: cómo sale impreso el pedido.
  imprime_nombre       text not null default 'ambos'
                         check (imprime_nombre in ('nuestro','proveedor','ambos')),
  -- §Inventario: no todos entregan. Cuando hay que ir a buscar, ese flete se
  -- paga y hay que imputarlo — permite medir cuánto cuesta trabajar con cada
  -- proveedor de verdad, no solo el precio del mueble.
  entrega_en_deposito  boolean not null default true,
  notas                text
);

comment on table proveedor is
  'Se gestiona como recurso interno, no como compra. El dato que importa no es el precio: es la carga del taller.';

-- Qué productos puede hacer cada uno. Un placard no va a un carpintero de
-- mesas de luz. Con default para la asignación automática.
create table proveedor_producto (
  proveedor_id bigint not null references proveedor(agente_id) on delete cascade,
  producto_id  bigint not null references producto(id),
  es_default   boolean not null default false,
  primary key (proveedor_id, producto_id)
);
-- Un solo proveedor por default para cada producto: respaldo Dumbo → Zvicente.
create unique index on proveedor_producto (producto_id) where es_default;


-- =====================================================================
-- 3 · PEDIDO A PROVEEDOR
-- "No hay pedidos múltiples: hay UN PEDIDO ÚNICO POR PROVEEDOR que acumula
--  tandas fechadas adentro."
-- Mismo patrón que ya se usó tres veces: el cobro pertenece al cliente, la
-- caja al agente, el pedido al proveedor. Un contenedor por sujeto, con
-- movimientos fechados adentro.
-- =====================================================================

create table pedido_proveedor (
  id           bigint generated always as identity primary key,
  proveedor_id bigint not null references proveedor(agente_id),
  estado       estado_pedido not null default 'abierto',
  abierto_en   timestamptz not null default now(),
  cerrado_en   timestamptz,
  created_by   bigint references agente(id)
);

-- LA regla del objeto: uno solo abierto por proveedor.
create unique index un_pedido_abierto_por_proveedor
  on pedido_proveedor (proveedor_id) where estado = 'abierto';

-- Las tandas fechadas adentro. "A lo sumo se ven dos fechas: estos muebles se
-- pidieron tal día, estos otros tal otro. Pero es una sola cosa abierta."
create table tanda (
  id            bigint generated always as identity primary key,
  pedido_id     bigint not null references pedido_proveedor(id),
  numero        integer not null,
  estado        estado_tanda not null default 'armando',
  fecha_pedido  date,
  fecha_estimada date,
  emitida_en    timestamptz,
  emitida_por   bigint references agente(id),
  observacion   text,
  created_at    timestamptz not null default now(),
  unique (pedido_id, numero)
);
create index on tanda (estado) where estado not in ('recibida','cancelada');
create index on tanda (fecha_estimada) where estado in ('emitida','en_taller');


-- =====================================================================
-- 4 · ORDEN DE FABRICACIÓN INTERNA
-- Producción para stock, SIN orden de venta detrás (mandar a hacer 10 mesas
-- de luz). El circuito asumía que toda producción nace de una venta.
--
-- Clave: sus unidades son RESERVABLES ANTES DE EXISTIR — y la línea que las
-- reserva hereda la fecha de ingreso de la tanda, no el plazo estándar.
-- Es lo que permite vender lo que se está fabricando y adelantar entregas.
-- =====================================================================

create table orden_fabricacion (
  id              bigint generated always as identity primary key,
  variante_id     bigint not null references variante(id),
  cantidad        integer not null check (cantidad > 0),
  fecha_estimada  date,
  motivo          text check (motivo in ('reposicion','decision_produccion')),
  creada_por      bigint references agente(id),
  created_at      timestamptz not null default now()
);
create index on orden_fabricacion (variante_id);


-- =====================================================================
-- 5 · RENGLÓN DEL PEDIDO
-- Acá se cruzan los dos ejes del sistema.
-- linea_id NULLABLE: el renglón puede venir de una venta O de fabricación
-- interna. Es lo que hace que el pedido no cuelgue de la orden.
-- =====================================================================

create table pedido_linea (
  id             bigint generated always as identity primary key,
  tanda_id       bigint not null references tanda(id) on delete cascade,
  -- De una venta...
  linea_id       bigint references linea(id),
  -- ...o de fabricación para stock.
  fabricacion_id bigint references orden_fabricacion(id),
  variante_id    bigint references variante(id),
  producto_efimero_id bigint references producto_efimero(id),

  -- Precio de LISTA: es una referencia. El costo real se confirma al recibir.
  precio_referencia numeric(14,2),

  -- Lo devuelto genera una obligación pendiente que se arrastra sola a la
  -- próxima entrega de ese proveedor. El pedido NO se cierra por lo devuelto.
  arrastrado_de  bigint references pedido_linea(id),

  created_at     timestamptz not null default now(),

  -- Viene de una venta o de fabricación interna, nunca de las dos ni de ninguna.
  check ((linea_id is not null)::int + (fabricacion_id is not null)::int = 1),
  check (variante_id is not null or producto_efimero_id is not null)
);

create index on pedido_linea (tanda_id);
create index on pedido_linea (linea_id) where linea_id is not null;
create index on pedido_linea (fabricacion_id) where fabricacion_id is not null;

-- Una línea de venta se pide UNA sola vez (salvo arrastre por devolución).
create unique index on pedido_linea (linea_id)
  where linea_id is not null and arrastrado_de is null;


-- =====================================================================
-- 6 · LAS TRES GUARDAS ANTES DE EMITIR UN PEDIDO
-- =====================================================================

-- GUARDA 1 · "Sin seña se compromete, no se gasta."
-- No se fabrica ni se emite OC sin seña RENDIDA. Reservar stock que ya existe
-- compromete; fabricar o emitir una OC GASTA.
-- La pregunta ante cualquier acción nueva: ¿esto gasta plata de la empresa o
-- solo la compromete?
create or replace function core.sena_rendida(p_orden bigint)
returns boolean language sql stable as $$
  select coalesce(s.rendido, 0) >=
         coalesce(s.total, 0) * core.param_num('venta.sena_porcentaje') / 100.0
    from core.orden_saldo s where s.orden_id = p_orden;
$$;

-- GUARDA 2 · Precedencia. "El sistema impide pedir B hasta que A esté
-- recibido y medido." En bibliotecas primero viene el hierro y recién después
-- se piden los estantes, porque llevan una medida específica.
create or replace function core.precedencia_cumplida(p_linea bigint)
returns boolean language sql stable as $$
  select not exists (
    select 1
      from core.linea_precedencia p
      join core.linea a on a.id = p.antecesora_id
     where p.sucesora_id = p_linea
       and a.estado not in ('lista','en_logistica','despachada','entregada','por_rendir','cerrada')
  );
$$;

-- GUARDA 3 · Coherencia de proveedor.
--   Líneas atadas          → mismo proveedor OBLIGATORIO (candado)
--   Misma venta / muebles  → mismo proveedor RECOMENDADO (sugerencia fuerte)
create or replace function core.pedido_linea_guardas()
returns trigger language plpgsql as $$
declare
  v_orden      bigint;
  v_grupo      bigint;
  v_proveedor  bigint;
  v_otro       bigint;
  v_estado     estado_tanda;
begin
  -- Las guardas corren al EMITIR, no al armar: mientras la tanda se arma,
  -- Iara puede juntar líneas libremente.
  select estado into v_estado from core.tanda where id = new.tanda_id;
  if v_estado = 'armando' then
    return new;
  end if;

  if new.linea_id is null then
    return new;   -- fabricación interna: no hay venta ni seña detrás
  end if;

  select orden_id, grupo_atado_id into v_orden, v_grupo
    from core.linea where id = new.linea_id;

  if not core.sena_rendida(v_orden) then
    raise exception
      'Sin seña rendida no se emite el pedido (orden %). Sin seña se compromete, no se gasta.',
      (select numero from core.orden where id = v_orden);
  end if;

  if not core.precedencia_cumplida(new.linea_id) then
    raise exception
      'La línea % depende de otra que todavía no se recibió (precedencia)', new.linea_id;
  end if;

  -- Líneas atadas: mismo proveedor y misma tanda, obligatorio.
  if v_grupo is not null then
    select p.proveedor_id into v_proveedor
      from core.tanda t join core.pedido_proveedor p on p.id = t.pedido_id
     where t.id = new.tanda_id;

    select distinct p2.proveedor_id into v_otro
      from core.pedido_linea pl
      join core.linea l         on l.id = pl.linea_id
      join core.tanda t2        on t2.id = pl.tanda_id
      join core.pedido_proveedor p2 on p2.id = t2.pedido_id
     where l.grupo_atado_id = v_grupo
       and pl.id <> coalesce(new.id, -1)
       and p2.proveedor_id <> v_proveedor
     limit 1;

    if v_otro is not null then
      raise exception
        'Líneas atadas tienen que ir al mismo proveedor: el grupo % ya está pedido al proveedor %',
        v_grupo, v_otro;
    end if;
  end if;

  return new;
end;
$$;

create trigger pedido_linea_guard before insert or update on pedido_linea
  for each row execute function core.pedido_linea_guardas();

-- Al emitir la tanda se validan todos sus renglones de una.
create or replace function core.emitir_tanda(p_tanda bigint, p_agente bigint)
returns void language plpgsql as $$
declare r record;
begin
  update core.tanda set estado = 'emitida', emitida_en = now(),
         emitida_por = p_agente, fecha_pedido = current_date
   where id = p_tanda and estado = 'armando';

  -- Dispara las guardas sobre cada renglón ya cargado.
  for r in select id from core.pedido_linea where tanda_id = p_tanda loop
    update core.pedido_linea set tanda_id = tanda_id where id = r.id;
  end loop;

  update core.linea l
     set estado = 'a_producir'
    from core.pedido_linea pl
   where pl.tanda_id = p_tanda and pl.linea_id = l.id
     and l.estado in ('en_orden_a_confirmar','reservada');

  perform audit.registrar('pedido_proveedor_emitido','tanda',p_tanda,p_agente);
end;
$$;


-- =====================================================================
-- 7 · RECEPCIÓN
-- Verificada MUEBLE POR MUEBLE.
-- "Los muebles que vinieron bien siguen su camino sin ningún cambio. Si trae
--  40 y 3 vienen mal, los otros 37 avanzan normalmente."
-- =====================================================================

create table recepcion (
  id           bigint generated always as identity primary key,
  tanda_id     bigint not null references tanda(id),
  fecha        date not null default current_date,
  recibida_por bigint references agente(id),
  observacion  text,
  created_at   timestamptz not null default now()
);
create index on recepcion (tanda_id);

create table recepcion_item (
  id               bigint generated always as identity primary key,
  recepcion_id     bigint not null references recepcion(id) on delete cascade,
  pedido_linea_id  bigint not null references pedido_linea(id),
  resultado        resultado_recepcion not null,
  -- EL COSTO NACE ACÁ, no en el pedido.
  -- "El precio de lista es una referencia. El costo real se confirma cuando el
  --  proveedor entrega y marca el precio." Muchos proveedores no tienen lista.
  -- Si el mueble salió más caro (más profundidad = más placa), el precio se
  -- modifica al recibir. Así el costo queda atado a la UNIDAD FÍSICA y el
  -- margen de esa venta es real.
  costo_confirmado numeric(14,2),
  -- La unidad física que nace de esta recepción.
  unidad_id        bigint references unidad(id),
  detalle          text,
  created_at       timestamptz not null default now()
);
create index on recepcion_item (recepcion_id);
create index on recepcion_item (pedido_linea_id);

-- Al recibir: nace la unidad con su costo real, avanza la línea, y lo devuelto
-- se arrastra solo a la próxima tanda del mismo proveedor.
create or replace function core.procesar_recepcion_item(
  p_item bigint, p_agente bigint default null
) returns bigint language plpgsql as $$
declare
  it        record;
  v_ubic    bigint;
  v_unidad  bigint;
  v_tanda   bigint;
  v_pedido  bigint;
  v_nueva   bigint;
begin
  select ri.*, pl.linea_id, pl.variante_id, pl.tanda_id as t
    into it
    from core.recepcion_item ri
    join core.pedido_linea pl on pl.id = ri.pedido_linea_id
   where ri.id = p_item;

  select id into v_ubic from core.ubicacion where codigo = 'B5-699';

  if it.resultado in ('perfecto','reparado') then
    insert into core.unidad (variante_id, ubicacion_id, origen, condicion)
    values (it.variante_id, v_ubic, 'produccion', 'primera')
    returning id into v_unidad;

    -- El costo queda atado a la unidad física, en finanzas.
    if it.costo_confirmado is not null then
      insert into finanzas.unidad_costo (unidad_id, costo_real, fecha)
      values (v_unidad, it.costo_confirmado, current_date);
    end if;

    update core.recepcion_item set unidad_id = v_unidad where id = p_item;

    -- La línea avanza: lista → abre logística sola.
    if it.linea_id is not null then
      update core.linea set estado = 'lista', unidad_id = v_unidad
       where id = it.linea_id;
      perform audit.registrar('recepcion','linea',it.linea_id,p_agente,
                null, jsonb_build_object('unidad_id',v_unidad,'costo',it.costo_confirmado),
                p_linea_id => it.linea_id);
    end if;

  elsif it.resultado = 'a_reparacion' then
    if it.linea_id is not null then
      update core.linea set en_reparacion = true where id = it.linea_id;
    end if;

  elsif it.resultado = 'devuelto' then
    -- Vuelve al pedido del proveedor y se arrastra a la próxima entrega.
    -- El pedido NO se cierra por lo devuelto.
    select t.pedido_id into v_pedido from core.tanda t where t.id = it.t;

    select id into v_tanda from core.tanda
     where pedido_id = v_pedido and estado = 'armando' limit 1;

    if v_tanda is null then
      insert into core.tanda (pedido_id, numero, estado)
      select v_pedido, coalesce(max(numero),0)+1, 'armando'
        from core.tanda where pedido_id = v_pedido
      returning id into v_tanda;
    end if;

    insert into core.pedido_linea
      (tanda_id, linea_id, fabricacion_id, variante_id, producto_efimero_id,
       precio_referencia, arrastrado_de)
    select v_tanda, pl.linea_id, pl.fabricacion_id, pl.variante_id,
           pl.producto_efimero_id, pl.precio_referencia, pl.id
      from core.pedido_linea pl where pl.id = it.pedido_linea_id
    returning id into v_nueva;
  end if;

  return v_unidad;
end;
$$;

-- Cómo vino esa tanda. Alimenta el orden de trabajo de la semana siguiente.
create table evaluacion_entrega (
  id           bigint generated always as identity primary key,
  tanda_id     bigint not null references tanda(id),
  puntaje      smallint check (puntaje between 1 and 5),
  puntualidad  smallint check (puntualidad between 1 and 5),
  calidad      smallint check (calidad between 1 and 5),
  comentario   text,
  evaluada_por bigint references agente(id),
  created_at   timestamptz not null default now()
);
create index on evaluacion_entrega (tanda_id);


-- =====================================================================
-- 8 · CUENTA CORRIENTE DEL PROVEEDOR — BIDIRECCIONAL
-- "Le compramos muebles y le vendemos materiales. El saldo puede ir para
--  cualquier lado." Boleta de 40 muebles por 6 millones → se le pagan 4 y se
--  descuentan 2 de la deuda pendiente. Eso solo funciona con una cuenta.
--
-- Es la quinta vez que aparece el mismo patrón: un contenedor único por
-- sujeto, con movimientos adentro.
-- =====================================================================

create table cuenta_proveedor (
  id           bigint generated always as identity primary key,
  proveedor_id bigint not null references proveedor(agente_id),
  tipo         tipo_mov_proveedor not null,
  -- Positivo = le debemos. Negativo = nos debe.
  monto        numeric(14,2) not null check (monto <> 0),
  moneda       moneda not null default 'ARS',
  recepcion_id bigint references recepcion(id),
  compra_id    bigint,                    -- FK más abajo
  detalle      text,
  -- "A veces se absorbe el costo del material para negociar el precio del
  --  mueble. Ahí la venta de materiales pierde margen y el mueble aparece más
  --  barato de lo que sale. Esa concesión tiene que quedar registrada como
  --  tal, o la separación es nominal y las dos mediciones quedan mal."
  es_concesion boolean not null default false,
  actor_id     bigint references agente(id),
  ts           timestamptz not null default now()
);
create index on cuenta_proveedor (proveedor_id, ts desc);
create index on cuenta_proveedor (tipo);

-- Las dos lecturas que pide §Compras: cada unidad de negocio por separado,
-- y el neto por proveedor.
create view proveedor_saldo as
select
  p.agente_id                                                          as proveedor_id,
  a.nombre,
  cc.moneda,
  sum(cc.monto) filter (where cc.tipo = 'compra_mueble')               as compras,
  sum(cc.monto) filter (where cc.tipo = 'venta_material')              as materiales,
  sum(cc.monto) filter (where cc.tipo = 'pago')                        as pagos,
  sum(cc.monto) filter (where cc.es_concesion)                         as concesiones,
  sum(cc.monto)                                                        as saldo
from proveedor p
join agente a on a.id = p.agente_id
left join cuenta_proveedor cc on cc.proveedor_id = p.agente_id
group by p.agente_id, a.nombre, cc.moneda;


-- =====================================================================
-- 9 · COMPRAS Y GASTOS
-- "Alcance total, profundidad variable." Entra TODA compra y TODO gasto —
-- herrajes, telas, embalaje, insumos de local, servicios, marketing,
-- logística—; lo que impide que explote es registrar cada cosa al nivel que
-- importa: con detalle o solo el monto.
-- =====================================================================

create table categoria_gasto (
  codigo text primary key,
  nombre text not null,
  tipo   text not null check (tipo in ('gasto','personal','costo'))
);

insert into categoria_gasto (codigo, nombre, tipo) values
  ('generales',        'Gastos generales',    'gasto'),
  ('servicios',        'Servicios',           'gasto'),
  ('herramientas',     'Herramientas',        'costo'),
  ('producto_terminado','Producto terminado', 'costo'),
  ('marketing',        'Marketing',           'gasto'),
  ('logistica',        'Logística',           'costo'),
  ('seguridad',        'Seguridad',           'gasto'),
  ('operarios',        'Operarios',           'personal'),
  ('inversiones',      'Inversiones',         'costo'),
  ('otros',            'Otros',               'gasto');

create table compra (
  id            bigint generated always as identity primary key,
  proveedor_id  bigint references agente(id),
  fecha         date not null default current_date,
  -- Con detalle (unidades, producto, precio unitario) o simple (solo monto).
  con_detalle   boolean not null default false,
  monto         numeric(14,2) not null check (monto > 0),
  moneda        moneda not null default 'ARS',

  -- Cada proveedor lleva su clasificación por defecto y cada compra la hereda,
  -- editable. Se clasifica una vez, no factura por factura.
  categoria     text not null references categoria_gasto(codigo),
  mundo         text not null check (mundo in ('formal','informal')),

  -- Mundo formal
  nro_comprobante text,
  iva_alicuota    numeric(5,2),
  iva_monto       numeric(14,2),
  percepciones    numeric(14,2),
  retenciones     numeric(14,2),
  conciliada_arca boolean not null default false,

  recepcion_id  bigint references recepcion(id),
  detalle       text,
  created_by    bigint references agente(id),
  created_at    timestamptz not null default now(),

  check (mundo <> 'informal' or nro_comprobante is null)
);
create index on compra (proveedor_id, fecha desc);
create index on compra (categoria, fecha);
create index on compra (mundo, fecha);

alter table cuenta_proveedor
  add constraint fk_cc_compra foreign key (compra_id) references compra(id);

-- IMPUTACIÓN DC / PERSONAL — se separa desde el día uno.
-- Clave de diseño: la imputación NO es atributo del proveedor, es del
-- MOVIMIENTO. La misma tarjeta de crédito o el mismo seguro pagan cosas de la
-- empresa y personales.
--
-- Y de ahí sale el requisito: un pago único que cubre varios gastos de
-- distinta imputación TIENE QUE PODER DESGLOSARSE. Es exactamente la misma
-- mecánica de imputación que ya existe del lado del cliente.
create table compra_imputacion (
  id         bigint generated always as identity primary key,
  compra_id  bigint not null references compra(id) on delete cascade,
  imputacion imputacion_gasto not null,
  monto      numeric(14,2) not null check (monto > 0),
  detalle    text
);
create index on compra_imputacion (compra_id);

-- Lo desglosado no puede superar la compra.
create or replace function core.imputacion_gasto_tope()
returns trigger language plpgsql as $$
declare v_compra numeric; v_imp numeric;
begin
  select monto into v_compra from core.compra where id = new.compra_id;
  select coalesce(sum(monto),0) into v_imp
    from core.compra_imputacion where compra_id = new.compra_id and id <> coalesce(new.id,-1);
  if v_imp + new.monto > v_compra + 0.01 then
    raise exception 'El desglose (%) supera el monto de la compra (%)', v_imp + new.monto, v_compra;
  end if;
  return new;
end;
$$;

create trigger compra_imputacion_tope before insert or update on compra_imputacion
  for each row execute function core.imputacion_gasto_tope();

-- Renglones cuando la compra lleva detalle.
create table compra_item (
  id          bigint generated always as identity primary key,
  compra_id   bigint not null references compra(id) on delete cascade,
  descripcion text not null,
  variante_id bigint references variante(id),
  cantidad    numeric(14,3) not null default 1,
  precio_unit numeric(14,2),
  total       numeric(14,2)
);
create index on compra_item (compra_id);

-- VENTA DE MATERIALES — segunda unidad de negocio, con lista y rentabilidad
-- propias. "Al venderle el material en vez de entregárselo, el desperdicio
-- deja de ser nuestro problema": transfiere el riesgo de merma a quien lo
-- controla. Se mide APARTE de la compra de muebles; se cruzan únicamente en
-- la cuenta corriente.
create table venta_material (
  id           bigint generated always as identity primary key,
  proveedor_id bigint not null references proveedor(agente_id),
  fecha        date not null default current_date,
  descripcion  text not null,
  cantidad     numeric(14,3) not null default 1,
  precio_unit  numeric(14,2),
  total        numeric(14,2) not null,
  costo        numeric(14,2),
  -- Cuando se absorbe el material para negociar el mueble.
  es_concesion boolean not null default false,
  entregado_por bigint references agente(id),
  created_at   timestamptz not null default now()
);
create index on venta_material (proveedor_id, fecha desc);


-- =====================================================================
-- 10 · VISTAS OPERATIVAS
-- =====================================================================

-- El dato que sostiene el principio 22: al tercerizado no se lo deja sin
-- trabajo. Alerta cuando la carga del taller baja del mínimo.
create view proveedor_carga as
select
  p.agente_id                       as proveedor_id,
  a.nombre,
  p.capacidad_tanda,
  p.carga_minima_alerta,
  p.dia_entrega,
  count(pl.id) filter (where t.estado in ('emitida','en_taller')) as en_taller,
  count(pl.id) filter (where t.estado = 'armando')                as armando,
  case
    when count(pl.id) filter (where t.estado in ('emitida','en_taller'))
         < p.carga_minima_alerta then 'sin_trabajo'
    when count(pl.id) filter (where t.estado in ('emitida','en_taller'))
         > p.capacidad_tanda then 'sobrecargado'
    else 'ok'
  end                               as alerta
from proveedor p
join agente a on a.id = p.agente_id
left join pedido_proveedor pp on pp.proveedor_id = p.agente_id
left join tanda t   on t.pedido_id = pp.id
left join pedido_linea pl on pl.tanda_id = t.id
where a.activo
group by p.agente_id, a.nombre, p.capacidad_tanda, p.carga_minima_alerta, p.dia_entrega;

-- Revisión semanal: conteo de días contra la fecha prometida.
-- El objetivo es detectar el atraso ANTES de que sea tarde, no descubrirlo
-- cuando el cliente llama.
create view produccion_revision as
select
  l.id                              as linea_id,
  o.numero                          as orden,
  c.nombre                          as cliente,
  coalesce(pr.nombre, pe.descripcion) as producto,
  l.estado,
  l.fecha_prometida,
  (l.fecha_prometida - current_date) as dias_para_prometida,
  ag.nombre                         as proveedor,
  t.fecha_estimada,
  case
    when l.fecha_prometida < current_date                    then 'atrasada'
    when l.fecha_prometida - current_date <= 7               then 'urgente'
    else 'ok'
  end                               as prioridad
from linea l
join orden o    on o.id = l.orden_id
join cliente c  on c.id = o.cliente_id
left join variante v  on v.id = l.variante_id
left join producto pr on pr.id = v.producto_id
left join producto_efimero pe on pe.id = l.producto_efimero_id
left join pedido_linea pl on pl.linea_id = l.id
left join tanda t on t.id = pl.tanda_id
left join pedido_proveedor pp on pp.id = t.pedido_id
left join agente ag on ag.id = pp.proveedor_id
where l.estado in ('a_producir','en_produccion','reservada','en_orden_a_confirmar')
  and not o.anulada;

-- Reposición: cuando se vende una unidad y el stock queda bajo el mínimo, el
-- sistema avisa. Hoy eso se calcula de memoria al hacer los pedidos.
-- Solo aplica a las variantes con mínimo definido: arrancar por las de alta
-- rotación y dejar el resto sin mínimo. El objetivo es avisar de lo que
-- importa, no cubrir las 5.527.
create view reposicion_pendiente as
select
  v.id                              as variante_id,
  p.categoria,
  p.nombre                          as producto,
  v.medida, v.estructura, v.frente,
  v.stock_minimo,
  count(u.id) filter (where u.activa and u.condicion in ('primera','a_reparar')) as disponibles,
  v.stock_minimo
    - count(u.id) filter (where u.activa and u.condicion in ('primera','a_reparar')) as faltan
from variante v
join producto p on p.id = v.producto_id
left join unidad u on u.variante_id = v.id
where v.activo and v.stock_minimo is not null
group by v.id, p.categoria, p.nombre, v.medida, v.estructura, v.frente, v.stock_minimo
having count(u.id) filter (where u.activa and u.condicion in ('primera','a_reparar')) < v.stock_minimo;

-- Vigilancia de precios de costo: en Argentina el enemigo no es el precio, es
-- el precio viejo. Un costo sin actualizar hace seis meses no muestra un
-- margen: muestra uno que no existe.
create view finanzas.costos_vencidos as
select
  v.id as variante_id, p.categoria, p.nombre as producto,
  v.medida, v.estructura, v.frente,
  c.costo, c.costo_ts,
  extract(month from age(now(), c.costo_ts))::int as meses_sin_actualizar
from core.variante v
join core.producto p on p.id = v.producto_id
join finanzas.variante_costo c on c.variante_id = v.id
where v.activo
  and (c.costo_ts is null
       or c.costo_ts < now() - (core.param_num('costo.alerta_antiguedad_meses')||' months')::interval);

-- Gasto por categoría, POR PRIMERA VEZ sumando los dos mundos.
-- Hoy solo los gastos formales están clasificados; los informales viven en
-- recibos sueltos y se suman a mano.
create view finanzas.gasto_por_categoria as
select
  date_trunc('month', c.fecha)                       as mes,
  c.categoria,
  cg.nombre                                          as categoria_nombre,
  cg.tipo,
  ci.imputacion,
  sum(coalesce(ci.monto, c.monto))                   as total,
  sum(coalesce(ci.monto, c.monto)) filter (where c.mundo = 'formal')   as formal,
  sum(coalesce(ci.monto, c.monto)) filter (where c.mundo = 'informal') as informal
from core.compra c
join core.categoria_gasto cg on cg.codigo = c.categoria
left join core.compra_imputacion ci on ci.compra_id = c.id
group by 1,2,3,4,5;


-- =====================================================================
-- PENDIENTE — lo que este bloque deja abierto
--   · Composición del producto (qué insumos lleva cada mueble) → fase 2
--   · Cálculo automático de accesorios al armar el pedido      → fase 2
--   · Propuesta automática de proveedor según carga            → fase 2
--   · Mínimos automáticos con estacionalidad                   → fase 2
--   · Sub-estados por área (corte · laqueado · armado)         → fase 3
--   · Categorías completas de gasto INFORMAL                   → decisión Brian
-- =====================================================================

-- =====================================================================
-- BELGRANO CORE · MODELO DE DATOS
-- Bloque 1 de 4 — NÚCLEO COMERCIAL  ·  v3
-- Postgres / Supabase · Julio 2026
--
-- Correr ENTERO, de una vez, en el SQL Editor de Supabase.
-- Probado contra PostgreSQL 16.13: corre limpio y pasa 12 pruebas de negocio.
--
-- CAMBIOS SOBRE v2 — seis bugs encontrados corriendo el v2 contra Postgres:
--   1. cliente_telefono UNIQUE bloqueaba al marido que compra por su cuenta
--   2. producto UNIQUE(nombre) bloqueaba una cómoda y una mesa del mismo nombre
--   3. orden_estado devolvía 'parcial' para órdenes anuladas y para órdenes vacías
--   4. orden_estado ignoraba orden.anulada
--   5. una misma unidad física podía quedar reservada por dos líneas a la vez
--   6. modalidad='entrega' admitía dirección nula
--   + linea.comisiona: el flete entraba en la base de comisión
--   + audit.evento y core.autorizacion (00_ARRANQUE §5: van con el bloque 1)
--   + core.parametro: los números de negocio dejan de estar en el código
--   + precedencia como grafo, con guarda anti-ciclo
-- =====================================================================

create schema if not exists core;
create schema if not exists finanzas;
create schema if not exists audit;

set search_path = core, public;


-- =====================================================================
-- 0 · TIPOS
-- =====================================================================

create type tipo_linea        as enum ('mueble','servicio','accesorio');
create type origen_linea      as enum ('stock','produccion_entrante','a_fabricar','entrega_inmediata');
create type tipo_producto     as enum ('estandar','a_medida');
create type modalidad_entrega as enum ('retira','entrega');
create type tipo_reserva      as enum ('preferente','firme');

create type estado_linea as enum (
  'en_presupuesto','en_orden_a_confirmar','reservada','a_producir',
  'en_produccion','lista','en_logistica','despachada','entregada',
  'por_rendir','cerrada','anulada'
);

create type condicion_unidad as enum (
  'primera','a_reparar','en_reparacion','saldo_outlet','destruido'
);


-- =====================================================================
-- 1 · AGENTE
-- Tabla propia, NO auth.users. Hay agentes que cobran y no loguean
-- (choferes tercerizados, carpinteros) y agentes que no son personas
-- (Tienda Nube absorbe las ventas sin vendedor).
-- =====================================================================

create table agente (
  id          bigint generated always as identity primary key,
  nombre      text not null,
  user_id     uuid unique,              -- vínculo opcional con auth.users
  tipo        text not null check (tipo in
                ('vendedor','administrativo','produccion','logistica',
                 'chofer','proveedor','canal','direccion')),
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index on agente (lower(nombre));

-- Roles: un agente puede tener varios (Iara es operaciones Y administrativo).
-- 'hasta' con fecha = permiso temporal, se apaga solo y queda auditado.
create table agente_rol (
  agente_id    bigint not null references agente(id),
  rol          text not null,
  desde        date not null default current_date,
  hasta        date,
  otorgado_por bigint references agente(id),
  primary key (agente_id, rol, desde)
);

create or replace function core.tiene_rol(p_agente bigint, p_rol text)
returns boolean language sql stable as $$
  select exists (
    select 1 from core.agente_rol
    where agente_id = p_agente and rol = p_rol
      and desde <= current_date
      and (hasta is null or hasta >= current_date)
  );
$$;

-- Resuelve el agente del usuario logueado. La usan las RLS del bloque 4.
create or replace function core.agente_actual()
returns bigint language sql stable as $$
  select id from core.agente where user_id = auth.uid();
$$;


-- =====================================================================
-- 2 · CLIENTE
-- La plata pertenece al cliente. Es el paraguas de todo.
-- =====================================================================

create table cliente (
  id               bigint generated always as identity primary key,
  nombre           text not null,
  cuit_dni         text,                -- se pide recién al facturar
  razon_social     text,
  condicion_iva    text,
  domicilio_fiscal text,
  como_conocio     text,
  -- Fusión de duplicados: el absorbido no se borra, apunta al sobreviviente.
  fusionado_en_id  bigint references cliente(id),
  created_by       bigint references agente(id),
  created_at       timestamptz not null default now(),
  check (fusionado_en_id is null or fusionado_en_id <> id)
);
create index on cliente (lower(nombre));

-- FIX 1 · El unique global bloqueaba tres casos reales:
--   a) el marido que escribe y después compra por su cuenta — que es
--      justamente el caso que originó "un cliente, varios teléfonos"
--   b) dos duplicados coexistiendo el rato necesario para fusionarlos
--   c) teléfono de empresa o de portería
-- Y contradecía el principio 1: avisa, no bloquea. Un teléfono repetido es
-- señal de duplicado, no un error: se avisa y la persona decide.
create table cliente_telefono (
  id         bigint generated always as identity primary key,
  cliente_id bigint not null references cliente(id) on delete cascade,
  telefono   text not null,
  nota       text,                      -- "es el marido", "trabajo"
  principal  boolean not null default false,
  unique (cliente_id, telefono)         -- sí: repetido en el MISMO cliente
);
create index on cliente_telefono (telefono);
create unique index on cliente_telefono (cliente_id) where principal;

-- El CRM identifica por teléfono O por usuario de Instagram.
create table cliente_instagram (
  id         bigint generated always as identity primary key,
  cliente_id bigint not null references cliente(id) on delete cascade,
  usuario    text not null,
  principal  boolean not null default false,
  unique (cliente_id, usuario)
);
create index on cliente_instagram (usuario);

-- Detección de duplicado: mismo patrón que la ventana de pago duplicado.
create or replace function core.posibles_duplicados(p_valor text, p_excluir bigint default null)
returns table (cliente_id bigint, nombre text, contacto text, desde timestamptz)
language sql stable as $$
  select c.id, c.nombre, t.telefono, c.created_at
    from core.cliente_telefono t
    join core.cliente c on c.id = t.cliente_id
   where t.telefono = p_valor and c.fusionado_en_id is null
     and (p_excluir is null or c.id <> p_excluir)
  union all
  select c.id, c.nombre, i.usuario, c.created_at
    from core.cliente_instagram i
    join core.cliente c on c.id = i.cliente_id
   where i.usuario = p_valor and c.fusionado_en_id is null
     and (p_excluir is null or c.id <> p_excluir);
$$;

create table cliente_direccion (
  id           bigint generated always as identity primary key,
  cliente_id   bigint not null references cliente(id) on delete cascade,
  direccion    text not null,
  localidad    text,
  provincia    text,
  piso_depto   text,
  -- Se preguntan AL VENDER, no en la puerta del edificio. Capturadas a tiempo,
  -- el costo de escalera se cotiza y se cobra; descubiertas en la puerta, son
  -- flete perdido o un costo que absorbe la empresa.
  hay_ascensor boolean,
  entra        boolean,
  nota_acceso  text,
  principal    boolean not null default false
);
create index on cliente_direccion (cliente_id);


-- =====================================================================
-- 3 · CATÁLOGO
-- Producto = modelo. Variante = combinación concreta.
-- El criterio de identidad: ¿hay que dibujar?
-- =====================================================================

create table producto (
  id             bigint generated always as identity primary key,
  categoria      text not null,
  nombre         text not null,         -- "Borges", "Estocolmo 70"
  tipo           tipo_producto not null default 'estandar',
  activo         boolean not null default true,
  discontinuado  boolean not null default false,
  publicado_tn   boolean not null default false,
  tn_product_id  text,                  -- TN es una VISTA del catálogo
  imagen_url     text,
  pdf_dibujo_url text,                  -- catálogo de Drive → imprimir directo
  tiempo_fabricacion_dias integer,
  created_by     bigint references agente(id),
  created_at     timestamptz not null default now()
);

-- FIX 2 · El unique sobre lower(nombre) global bloqueaba una cómoda "Borges" y
-- una mesa "Borges". El criterio de identidad del catálogo es el dibujo, no el
-- nombre: dos categorías distintas pueden repetir nombre legítimamente.
create unique index on producto (categoria, lower(nombre));

-- LOS TRES EJES, orden fijo y universal: medida → estructura → frente.
-- Columnas fijas y no tabla de atributos: se filtra y ordena sin joins.
create table variante (
  id            bigint generated always as identity primary key,
  producto_id   bigint not null references producto(id),
  medida        text,                   -- eje 1
  estructura    text,                   -- eje 2
  frente        text,                   -- eje 3 (frentes/detalles/tapas)
  -- SKU estable de catálogo (COM-MIA-BLA-PAR-120). NO es el código de línea
  -- (OV-001048-02), que identifica el renglón de una venta. El prototipo v5
  -- los mezclaba: el SKU con Nº de orden adentro no sirve para inventario.
  sku           text unique,
  tn_variant_id text,
  precio        numeric(14,2),          -- el precio vive acá, sin proporciones
  precio_ts     timestamptz,
  stock_minimo  integer,                -- solo alta rotación, no las 5.527
  ubicacion_habitual_id bigint,
  activo        boolean not null default true
);
create unique index on variante
  (producto_id, coalesce(medida,''), coalesce(estructura,''), coalesce(frente,''));
create index on variante (producto_id) where activo;

-- COSTO: fuera de core. El RLS de Supabase es por FILA, no por columna —
-- si viviera en variante, cualquiera que lea el catálogo lee el costo,
-- y el vendedor TIENE que leer el catálogo.
create table finanzas.variante_costo (
  variante_id  bigint primary key references core.variante(id),
  costo        numeric(14,2),
  costo_ts     timestamptz,             -- alerta si > 4 meses (parámetro)
  proveedor_id bigint,                  -- FK en bloque 3
  updated_by   bigint references core.agente(id)
);
create index on finanzas.variante_costo (costo_ts);

create table finanzas.variante_hist (
  id          bigint generated always as identity primary key,
  variante_id bigint not null references core.variante(id),
  campo       text not null check (campo in ('precio','costo')),
  valor_ant   numeric(14,2),
  valor_nuevo numeric(14,2),
  motivo      text,
  lote        text,                     -- identifica una actualización masiva
  actor_id    bigint references core.agente(id),
  ts          timestamptz not null default now()
);
create index on finanzas.variante_hist (variante_id, ts desc);

-- PRODUCTO EFÍMERO: el a medida no vive en el catálogo maestro.
-- Si el vendedor pudiera crear catálogo, en seis meses conviven "Borges 80" y
-- "borges 80cm", y el costeo y el stock mínimo se ensucian sin arreglo.
create table producto_efimero (
  id             bigint generated always as identity primary key,
  orden_id       bigint,                -- FK más abajo (circular)
  descripcion    text not null,
  basado_en_id   bigint references producto(id),
  medida         text,
  estructura     text,
  frente         text,
  pdf_dibujo_url text,
  archivado      boolean not null default false,
  firma          text,                  -- hash de config → detectar repetidos
  created_by     bigint references agente(id),
  created_at     timestamptz not null default now()
);
create index on producto_efimero (firma);

-- "Esta configuración se vendió 7 veces en 4 meses" → candidata a estándar.
create view efimeros_repetidos as
select firma, min(descripcion) as ejemplo, count(*) as veces,
       min(created_at) as primera, max(created_at) as ultima
  from producto_efimero
 where firma is not null
 group by firma
having count(*) > 1;

-- Traducción al muestrario de cada proveedor. Diccionario abierto:
-- se carga solo lo que hace falta para que entienda el pedido.
create table equivalencia_proveedor (
  id            bigint generated always as identity primary key,
  proveedor_id  bigint not null references agente(id),
  nivel         text not null check (nivel in ('producto','medida','estructura','frente')),
  valor_interno text not null,          -- "lino gris" / "foster"
  valor_prov    text not null,          -- "steel" / "ana"
  unique (proveedor_id, nivel, valor_interno)
);


-- =====================================================================
-- 4 · UBICACIONES Y UNIDADES FÍSICAS
-- Inventario unitario desde etapa 1.
-- =====================================================================

create table ubicacion (
  id       bigint generated always as identity primary key,
  codigo   text unique,
  nombre   text not null,               -- "Belgrano 2020 · Piso 2"
  tipo     text not null check (tipo in
             ('local','deposito','centro_distribucion','camion',
              'area_fabrica','proveedor','piso')),
  padre_id bigint references ubicacion(id),   -- jerárquica: local → piso
  es_exhibicion boolean not null default false,
  dias_entre_conteos integer,
  activa   boolean not null default true
);

alter table variante
  add constraint fk_variante_ubicacion
  foreign key (ubicacion_habitual_id) references ubicacion(id);

create table unidad (
  id                bigint generated always as identity primary key,
  variante_id       bigint references variante(id),
  ubicacion_id      bigint references ubicacion(id),
  condicion         condicion_unidad not null default 'primera',
  dias_recuperacion integer,            -- "stock en 3 días"
  detalle_condicion text,
  en_exhibicion     boolean not null default false,
  exhibicion_desde  date,               -- contador de vidriera (30-50 días)
  foto_url          text,               -- obligatoria en outlet
  origen            text check (origen in ('compra','produccion','devolucion')),
  activa            boolean not null default true,
  created_at        timestamptz not null default now(),
  -- Cada unidad de outlet es distinta: el cliente tiene que ver cuál es ESA.
  check (condicion <> 'saldo_outlet' or foto_url is not null)
);
create index on unidad (variante_id, ubicacion_id) where activa;
create index on unidad (condicion) where activa;
create index on unidad (exhibicion_desde) where en_exhibicion;

create table finanzas.unidad_costo (
  unidad_id  bigint primary key references core.unidad(id),
  costo_real numeric(14,2),             -- el costo nace al RECIBIR
  fecha      date
);

create table movimiento_unidad (
  id          bigint generated always as identity primary key,
  unidad_id   bigint not null references unidad(id),
  origen_id   bigint references ubicacion(id),
  destino_id  bigint not null references ubicacion(id),
  motivo      text,
  -- Principio 8: el movimiento se registra aunque el costo sea $0.
  costo_flete numeric(14,2) not null default 0,
  actor_id    bigint references agente(id),
  ts          timestamptz not null default now()
);
create index on movimiento_unidad (unidad_id, ts desc);


-- =====================================================================
-- 5 · GRUPOS
-- Dos agrupadores distintos: uno de órdenes, uno de líneas.
-- =====================================================================

-- BLANDO · unificación de pedidos. Agrupa ÓRDENES por cliente o dirección.
-- Entrega parcial PERMITIDA: logística decide.
-- Es el objetivo medible de la Etapa 1.
create table grupo_orden (
  id             bigint generated always as identity primary key,
  motivo         text not null check (motivo in ('mismo_cliente','misma_direccion','manual')),
  confirmado_por bigint references agente(id),
  confirmado_en  timestamptz,
  activo         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- DURO · líneas atadas. Tienen que ser IDÉNTICAS entre sí (misma tanda).
-- Lo marca el vendedor: una pregunta, dos consecuencias — se fabrican juntas
-- y se entregan juntas. Entrega parcial PROHIBIDA: candado.
create table grupo_atado (
  id                 bigint generated always as identity primary key,
  tipo               text not null default 'atado'
                       check (tipo in ('atado','vinculado')),
  motivo             text,              -- "mismas mesas de luz, mismo color"
  marcado_por        bigint references agente(id),
  -- Si el cliente pide dos envíos, se desagrupa y cada parte corre en paralelo.
  desagrupado        boolean not null default false,
  desagrupado_por    bigint references agente(id),
  desagrupado_en     timestamptz,
  desagrupado_motivo text,
  created_at         timestamptz not null default now()
);

comment on column grupo_atado.tipo is
  'atado = tienen que ser idénticos entre sí. vinculado = el hierro y su mueble son un conjunto: si falta uno, no hay entrega.';


-- =====================================================================
-- 6 · PRESUPUESTO
-- Cada visita con precio = un presupuesto nuevo.
-- =====================================================================

create table presupuesto (
  id             bigint generated always as identity primary key,
  numero         text unique not null,
  cliente_id     bigint not null references cliente(id),
  vendedor_id    bigint not null references agente(id),
  local_id       bigint references ubicacion(id),
  estado         text not null default 'abierto'
                   check (estado in ('abierto','concretado_parcial','concretado','rechazado','vencido')),
  -- Si es "ambos", la cotización sale con los dos precios para el cliente.
  mostrar_precio text not null default 'ambos'
                   check (mostrar_precio in ('efectivo','tarjeta','ambos')),
  motivo_rechazo text,
  created_at     timestamptz not null default now()
);
create index on presupuesto (cliente_id);
create index on presupuesto (vendedor_id, estado);

create table presupuesto_linea (
  id                  bigint generated always as identity primary key,
  presupuesto_id      bigint not null references presupuesto(id) on delete cascade,
  variante_id         bigint references variante(id),
  producto_efimero_id bigint references producto_efimero(id),
  tipo                tipo_producto not null default 'estandar',
  descripcion_libre   text,
  -- Las observaciones NO crean variante. "Profundidad 25 cm" sigue siendo una
  -- Borges 80 PB. Si cada profundidad creara variante, las 5.527 se multiplican
  -- y el stock mínimo deja de servir.
  observaciones       text,
  -- Acá SÍ hay cantidad: al concretar, el sistema explota en N líneas de orden.
  cantidad            integer not null default 1 check (cantidad > 0),
  precio_efectivo     numeric(14,2),
  precio_tarjeta      numeric(14,2),
  suma_al_total       boolean not null default true,
  estado              text not null default 'abierta'
                        check (estado in ('abierta','concretada','rechazada')),
  motivo_rechazo      text,
  check (variante_id is not null or producto_efimero_id is not null
         or descripcion_libre is not null)
);
create index on presupuesto_linea (presupuesto_id);


-- =====================================================================
-- 7 · ORDEN
-- Contenedor. NO tiene estado propio: resume el de sus líneas.
-- =====================================================================

create table orden (
  id                 bigint generated always as identity primary key,
  numero             text unique not null,
  cliente_id         bigint not null references cliente(id),
  presupuesto_id     bigint references presupuesto(id),
  -- Nullable: las ventas de Tienda Nube no tienen vendedor y no comisionan.
  vendedor_id        bigint references agente(id),
  vendedor_2_id      bigint references agente(id),   -- compartida → 50/50
  local_id           bigint references ubicacion(id),
  origen_canal       text not null default 'local'
                       check (origen_canal in ('local','crm','tienda_nube','whatsapp',
                                               'instagram','mercado_libre','otro')),

  -- Umbral 2 (confirmar): lo obligatorio es la MODALIDAD, no la dirección.
  -- A veces el cliente retira. Y la modalidad puede cambiar: al pasar a
  -- entrega, el sistema pide la dirección en ese momento.
  modalidad          modalidad_entrega,
  direccion_id       bigint references cliente_direccion(id),
  medio_pago         text,
  medio_pago_ts      timestamptz,

  compromiso_hasta   date,
  prorroga_hasta     date,              -- "dar más tiempo" = acción registrada
  prorroga_motivo    text,

  grupo_orden_id     bigint references grupo_orden(id),

  -- 04_DECISIONES: meterlo en el esquema inicial aunque la facturación
  -- se vincule más adelante.
  nro_comprobante_externo text,

  anulada            boolean not null default false,
  anulada_motivo     text,
  anulada_por        bigint references agente(id),

  -- Única excepción a "avisa, no bloquea": un cobro caído significa que la
  -- venta dejó de ser real, y ahí no hay nada que proteger.
  bloqueo_financiero boolean not null default false,
  bloqueo_motivo     text,

  notas_internas     text,
  notas_externas     text,
  created_at         timestamptz not null default now(),
  created_by         bigint references agente(id),

  -- FIX 6 · la dirección es obligatoria solo si la modalidad es entrega.
  -- El v2 admitía modalidad='entrega' con dirección nula.
  check (modalidad is distinct from 'entrega' or direccion_id is not null)
);
create index on orden (cliente_id);
create index on orden (grupo_orden_id);
create index on orden (vendedor_id);
create index on orden (bloqueo_financiero) where bloqueo_financiero;

alter table producto_efimero
  add constraint fk_efimero_orden foreign key (orden_id) references orden(id);


-- =====================================================================
-- 8 · LÍNEA — la unidad de trabajo
-- Cantidad SIEMPRE 1. Si el vendedor carga 3, se crean 3 líneas.
-- Una línea con cantidad 3 no podría estar "2 listas y 1 en producción".
-- =====================================================================

create table linea (
  id                  bigint generated always as identity primary key,
  orden_id            bigint not null references orden(id),
  codigo_linea        text,             -- OV-001048-02, el renglón de la venta
  tipo                tipo_linea not null default 'mueble',

  variante_id         bigint references variante(id),
  producto_efimero_id bigint references producto_efimero(id),
  tipo_producto       tipo_producto not null default 'estandar',
  descripcion         text,             -- servicios: "armado placard", "flete"
  observaciones       text,
  -- Congela los tres ejes al momento de la venta: si mañana se corrige el
  -- catálogo, la venta vieja sigue diciendo lo que se vendió.
  atributos_snapshot  jsonb,

  estado              estado_linea not null default 'en_orden_a_confirmar',

  -- Banderas: se superponen al estado, no lo reemplazan. Una línea puede estar
  -- en_produccion Y en_reparacion al mismo tiempo.
  pend_autoriz_precio boolean not null default false,
  bloqueada_financ    boolean not null default false,
  en_reemplazo        boolean not null default false,
  en_reparacion       boolean not null default false,

  -- Origen: lo decide PRODUCCIÓN, no el vendedor. Si el cliente está dispuesto
  -- a esperar 30 días, conviene guardar la unidad disponible para el que
  -- necesita entrega inmediata — ese es el que se pierde si no hay stock.
  origen              origen_linea,
  origen_definido_por bigint references agente(id),

  unidad_id           bigint references unidad(id),
  reserva_tipo        tipo_reserva,     -- firme = "el cliente vio ESA"
  reserva_hasta       date,

  -- Marcas del vendedor: endurecen, no asignan.
  grupo_atado_id      bigint references grupo_atado(id),

  fecha_prometida     date,             -- default 30 días; menos → autorización
  fecha_prometida_por bigint references agente(id),

  -- Las tres capas de valor.
  precio_total        numeric(14,2) not null,
  valor_mueble        numeric(14,2) not null,          -- comisión y margen
  costo_financiacion  numeric(14,2) not null default 0,-- fuera de métricas
  -- FIX 7 · el flete y el armado entran en el total pero NO comisionan.
  -- Sin este flag, el primer placard con armado paga comisión sobre el flete.
  comisiona           boolean not null default true,

  anulada_motivo      text,
  entregada_ts        timestamptz,
  cerrada_ts          timestamptz,
  created_at          timestamptz not null default now(),

  check (tipo <> 'mueble' or variante_id is not null or producto_efimero_id is not null),
  -- La regla que impide que la comisión y el margen se calculen sobre plata
  -- que es de la financiera. No depende de que la aplicación se acuerde.
  check (precio_total = valor_mueble + costo_financiacion),
  -- Un servicio no es una unidad física: no se fabrica ni se reserva.
  check (tipo <> 'servicio' or (origen is null and unidad_id is null))
);
create index on linea (orden_id);
create index on linea (estado) where estado not in ('cerrada','anulada');
create index on linea (fecha_prometida)
  where estado not in ('entregada','por_rendir','cerrada','anulada');
create index on linea (grupo_atado_id);
create index on linea (variante_id);

-- FIX 5 · Una unidad física no puede estar reservada por dos líneas vivas.
-- El v2 lo permitía: dos clientes con la misma cómoda asignada. Es el bug que
-- rompe el inventario unitario entero — sin esto no hay reserva firme posible.
create unique index unidad_una_sola_reserva_viva
  on linea (unidad_id)
  where unidad_id is not null and estado not in ('cerrada','anulada');

-- PRECEDENCIA · grafo, no self-FK.
-- §Compras: "en bibliotecas primero viene el hierro y recién después se piden
-- los estantes, porque llevan una medida específica. El sistema impide pedir B
-- hasta que A esté recibido y medido."
-- Un hierro puede preceder a VARIOS juegos de estantes: por eso es tabla, no
-- columna. Es la única de las cuatro relaciones que frena una acción del
-- sistema (emitir el pedido); las otras tres frenan la entrega.
create table linea_precedencia (
  antecesora_id bigint not null references linea(id) on delete cascade,
  sucesora_id   bigint not null references linea(id) on delete cascade,
  motivo        text,
  creada_por    bigint references agente(id),
  created_at    timestamptz not null default now(),
  primary key (antecesora_id, sucesora_id),
  check (antecesora_id <> sucesora_id)
);
create index on linea_precedencia (sucesora_id);

-- Guarda anti-ciclo: dos líneas que se preceden mutuamente no se pueden pedir
-- nunca, y el sistema se queda esperando para siempre sin decir por qué.
create or replace function core.precedencia_sin_ciclo()
returns trigger language plpgsql as $$
begin
  if exists (
    with recursive cadena as (
      select new.antecesora_id as nodo
      union
      select p.antecesora_id
        from core.linea_precedencia p
        join cadena c on p.sucesora_id = c.nodo
    )
    select 1 from cadena where nodo = new.sucesora_id
  ) then
    raise exception 'Ciclo de precedencia: la línea % ya depende de la %',
      new.antecesora_id, new.sucesora_id;
  end if;
  return new;
end;
$$;

create trigger precedencia_guard before insert or update on linea_precedencia
  for each row execute function core.precedencia_sin_ciclo();


-- =====================================================================
-- 9 · PARÁMETROS
-- Principio 10: los números específicos son parámetros, no código.
-- Unifica los valores que cada sección definió por su cuenta.
-- =====================================================================

create table parametro (
  clave       text primary key,
  valor       text not null,
  tipo        text not null check (tipo in ('numero','porcentaje','dias','horas','monto','texto','booleano')),
  descripcion text not null,
  origen      text,
  a_confirmar boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  bigint references agente(id)
);

comment on column parametro.a_confirmar is
  'TRUE = valor provisorio con decisión pendiente. Distinto de un default elegido.';

create or replace function core.param_num(p_clave text)
returns numeric language sql stable as $$
  select valor::numeric from core.parametro where clave = p_clave;
$$;


-- =====================================================================
-- 10 · AUTORIZACIÓN
-- Un solo mecanismo para todo el sistema.
-- La autorización NO frena: pop-up → verbal → LA VENTA SIGUE → pendiente
-- de ratificación → confirma sí o no → registro escrito.
-- "La flexibilidad la pone la persona. La memoria la pone el sistema."
-- =====================================================================

create table autorizacion (
  id               bigint generated always as identity primary key,
  ambito           text not null check (ambito in (
                     'descuento_sobre_limite','precio_a_medida','sacar_linea',
                     'reprecio_medio_pago','devolucion','plazo_corto',
                     'despacho_sobre_limite','entrega_con_saldo',
                     'cambio_medio_devolucion','cesion_saldo',
                     'reconocimiento_saldo_viejo','bonificacion_sobre_umbral',
                     'salida_unidad_exhibicion','baja_unidad',
                     'destrabar_bloqueo_financiero','destrabar_candado_completitud',
                     'adelanto_vendedor','venta_sin_mail','pago_a_chofer')),
  objeto_tipo      text not null,
  objeto_id        bigint not null,
  orden_id         bigint references orden(id),
  linea_id         bigint references linea(id),

  solicitada_por   bigint not null references agente(id),
  solicitada_en    timestamptz not null default now(),
  autorizador_id   bigint not null references agente(id),

  -- Al autorizar se define un RANGO editable ("entre 15 y 20 días"),
  -- no un sí/no pelado.
  valor_solicitado numeric,
  rango_min        numeric,
  rango_max        numeric,
  unidad           text,                -- 'dias' | 'pesos' | 'porcentaje'

  estado           text not null default 'pendiente_ratificacion'
                     check (estado in ('pendiente_ratificacion','ratificada','rechazada')),
  ratificada_en    timestamptz,
  ratificada_por   bigint references agente(id),
  observacion      text,

  -- Ratificación negativa: la venta ya avanzó y NO se deshace sola.
  en_cola_revision boolean not null default false,
  revisada_en      timestamptz,
  revisada_por     bigint references agente(id),
  resolucion_revision text,

  check (rango_max is null or rango_min is null or rango_max >= rango_min),
  check ((estado =  'pendiente_ratificacion' and ratificada_en is null)
      or (estado <> 'pendiente_ratificacion' and ratificada_en is not null))
);
create index on autorizacion (autorizador_id) where estado = 'pendiente_ratificacion';
create index on autorizacion (solicitada_por, estado);
create index on autorizacion (objeto_tipo, objeto_id);
create index on autorizacion (en_cola_revision) where en_cola_revision;

create or replace function core.autorizacion_a_cola()
returns trigger language plpgsql as $$
begin
  if new.estado = 'rechazada' and old.estado <> 'rechazada' then
    new.en_cola_revision := true;
  end if;
  return new;
end;
$$;

create trigger autorizacion_rechazada before update on autorizacion
  for each row execute function core.autorizacion_a_cola();


-- =====================================================================
-- 11 · EVENTO  (esquema audit)
--
-- 00_ARRANQUE §5: "Todas las capas transversales pueden esperar. Eventos no.
--   El resto son vistas sobre datos que ya van a existir. Eventos SON los
--   datos: si el primer módulo no los escribe, esa historia no existe nunca
--   y no se reconstruye. Media jornada al principio, irrecuperable después."
--
-- Nadie la lee todavía. Es plomería, no módulo.
-- =====================================================================

create table audit.evento (
  id             bigint generated always as identity primary key,
  tipo           text not null,
  objeto_tipo    text not null,
  objeto_id      bigint not null,
  -- Contexto de trazabilidad: permite responder "qué pasó con esta orden" de
  -- punta a punta, aunque el evento haya ocurrido sobre una línea o una unidad.
  orden_id       bigint,
  linea_id       bigint,
  cliente_id     bigint,
  agente_id      bigint references core.agente(id),
  ts             timestamptz not null default now(),
  valor_anterior jsonb,
  valor_nuevo    jsonb,
  motivo         text,
  datos          jsonb not null default '{}'::jsonb
);

create index on audit.evento (objeto_tipo, objeto_id, ts desc);
create index on audit.evento (orden_id, ts)   where orden_id   is not null;
create index on audit.evento (linea_id, ts)   where linea_id   is not null;
create index on audit.evento (cliente_id, ts) where cliente_id is not null;
create index on audit.evento (tipo, ts desc);
create index on audit.evento (agente_id, ts desc) where agente_id is not null;

-- Append-only. Principio 7: lo que salió al mundo no se edita, se compensa.
create or replace function audit.evento_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'audit.evento es append-only: los eventos no se editan ni se borran';
end;
$$;

create trigger evento_no_update before update on audit.evento
  for each row execute function audit.evento_append_only();
create trigger evento_no_delete before delete on audit.evento
  for each row execute function audit.evento_append_only();

-- Helper. Que registrar sea más fácil que no registrar es lo que hace que la
-- tabla se llene de verdad.
create or replace function audit.registrar(
  p_tipo        text,
  p_objeto_tipo text,
  p_objeto_id   bigint,
  p_agente_id   bigint  default null,
  p_anterior    jsonb   default null,
  p_nuevo       jsonb   default null,
  p_orden_id    bigint  default null,
  p_linea_id    bigint  default null,
  p_cliente_id  bigint  default null,
  p_motivo      text    default null,
  p_datos       jsonb   default '{}'::jsonb
) returns bigint language plpgsql as $$
declare v_id bigint;
begin
  insert into audit.evento (tipo, objeto_tipo, objeto_id, agente_id,
                            valor_anterior, valor_nuevo,
                            orden_id, linea_id, cliente_id, motivo, datos)
  values (p_tipo, p_objeto_tipo, p_objeto_id, p_agente_id,
          p_anterior, p_nuevo, p_orden_id, p_linea_id, p_cliente_id, p_motivo, p_datos)
  returning id into v_id;
  return v_id;
end;
$$;

-- Cadena canónica de la venta. Todo tablero sale de acá.
create table audit.tipo_evento (
  codigo         text primary key,
  etiqueta       text not null,
  es_canonico    boolean not null default false,
  orden_canonico smallint
);

insert into audit.tipo_evento (codigo, etiqueta, es_canonico, orden_canonico) values
  ('venta_creada',             'Venta creada',               true,  1),
  ('linea_agregada',           'Línea agregada',             true,  2),
  ('precio_autorizado',        'Precio autorizado',          true,  3),
  ('cobro_registrado',         'Cobro registrado',           true,  4),
  ('cobro_rendido',            'Cobro rendido',              true,  5),
  ('pedido_proveedor_emitido', 'Pedido a proveedor emitido', true,  6),
  ('recepcion',                'Recepción',                  true,  7),
  ('logistica_creada',         'Logística creada',           true,  8),
  ('entrega_realizada',        'Entrega realizada',          true,  9),
  ('cobranza_rendida',         'Cobranza rendida',           true, 10),
  ('linea_cerrada',            'Línea cerrada',              true, 11);

insert into audit.tipo_evento (codigo, etiqueta) values
  ('estado_cambiado',          'Cambio de estado'),
  ('autorizacion_solicitada',  'Autorización solicitada'),
  ('autorizacion_ratificada',  'Autorización ratificada'),
  ('autorizacion_rechazada',   'Autorización rechazada'),
  ('linea_caida',              'Línea caída'),
  ('peldano_resuelto',         'Peldaño de resolución aplicado'),
  ('bonificacion_otorgada',    'Bonificación otorgada'),
  ('linea_anulada',            'Línea anulada'),
  ('grupo_desagrupado',        'Grupo desagrupado'),
  ('reserva_creada',           'Reserva creada'),
  ('unidad_intercambiada',     'Intercambio de unidad'),
  ('condicion_cambiada',       'Condición de unidad cambiada'),
  ('movimiento_interno',       'Movimiento interno de unidad'),
  ('bloqueo_financiero',       'Bloqueo financiero activado'),
  ('bloqueo_destrabado',       'Bloqueo financiero destrabado'),
  ('precio_costo_actualizado', 'Precio de costo actualizado'),
  ('precio_venta_actualizado', 'Precio de venta actualizado'),
  ('configuracion_repetida',   'Configuración a medida repetida'),
  ('atraso_registrado',        'Atraso registrado'),
  ('cliente_duplicado_avisado','Posible cliente duplicado — respuesta');


-- =====================================================================
-- 12 · VISTAS
-- =====================================================================

-- FIX 3 y 4 · el v2 devolvía 'parcial' para órdenes anuladas y para órdenes
-- sin líneas, e ignoraba orden.anulada. Jerarquía correcta, de arriba abajo:
--   anulada > bloqueada > atrasada > fase única > parcial
create view orden_estado as
select
  o.id,
  o.numero,
  o.cliente_id,
  count(l.id) filter (where l.estado <> 'anulada')                            as lineas,
  count(l.id) filter (where l.estado in ('entregada','por_rendir','cerrada')) as listas,
  bool_or(l.fecha_prometida < current_date
          and l.estado not in ('entregada','por_rendir','cerrada','anulada')) as atrasada,
  min(l.fecha_prometida) filter
      (where l.estado not in ('entregada','por_rendir','cerrada','anulada'))  as proxima_fecha,
  case
    when o.anulada                                              then 'anulada'
    when count(l.id) = 0                                        then 'sin_lineas'
    when count(l.id) filter (where l.estado <> 'anulada') = 0   then 'anulada'
    when o.bloqueo_financiero                                   then 'bloqueada'
    when bool_or(l.fecha_prometida < current_date
                 and l.estado not in ('entregada','por_rendir','cerrada','anulada'))
                                                                then 'atrasada'
    when count(distinct l.estado) filter (where l.estado <> 'anulada') = 1
                                                                then min(l.estado::text)
                                                                else 'parcial'
  end                                                                          as estado,
  sum(l.valor_mueble)       filter (where l.estado <> 'anulada')               as valor_mueble,
  sum(l.costo_financiacion) filter (where l.estado <> 'anulada')               as costo_financiacion,
  sum(l.precio_total)       filter (where l.estado <> 'anulada')               as total,
  -- Base de comisión: solo lo que comisiona, y siempre sobre valor del mueble.
  sum(l.valor_mueble) filter (where l.estado <> 'anulada' and l.comisiona)     as base_comision
from orden o
left join linea l on l.orden_id = o.id
group by o.id, o.numero, o.cliente_id, o.anulada, o.bloqueo_financiero;

-- Candado de completitud. Dos controles, dos consumidores: la alerta temprana
-- avisa a operaciones mientras hay tiempo; el candado impide que el problema
-- salga a la calle. No se entrega el 95%.
create view grupo_completitud as
select
  g.id                        as grupo_id,
  g.tipo,
  count(l.id)                 as lineas,
  count(l.id) filter (where l.estado in ('lista','en_logistica','despachada','entregada')) as listas,
  bool_and(l.estado in ('lista','en_logistica','despachada','entregada'))                  as puede_despachar,
  -- La fecha del grupo es la MÁS TARDÍA de sus líneas: el cliente espera a que
  -- estén los dos pedidos juntos, y el último es el que manda.
  max(l.fecha_prometida)      as fecha_grupo,
  array_agg(l.id) filter
    (where l.estado not in ('lista','en_logistica','despachada','entregada')) as faltantes
from grupo_atado g
join linea l on l.grupo_atado_id = g.id
where not g.desagrupado and l.estado <> 'anulada'
group by g.id, g.tipo;

-- Margen por variante. Vive en finanzas: solo dirección.
create view finanzas.margen_variante as
select
  v.id as variante_id, p.categoria, p.nombre as producto,
  v.medida, v.estructura, v.frente,
  v.precio, c.costo, c.costo_ts,
  v.precio - c.costo                                          as margen,
  round(100.0 * (v.precio - c.costo) / nullif(v.precio,0), 1)  as margen_pct,
  (c.costo_ts < now() - (core.param_num('costo.alerta_antiguedad_meses') || ' months')::interval)
                                                               as costo_vencido
from core.variante v
join core.producto p on p.id = v.producto_id
left join finanzas.variante_costo c on c.variante_id = v.id
where v.activo;


-- =====================================================================
-- 13 · SEMILLA
-- =====================================================================

insert into ubicacion (codigo, nombre, tipo, es_exhibicion, dias_entre_conteos) values
  ('B5-699',  'Zavaleta 699',   'centro_distribucion', false, 30),
  ('B1-2020', 'Belgrano 2020',  'local',               true,  90),
  ('B3-2299', 'Belgrano 2299',  'local',               true,  90);

-- Zavaleta es depósito Y fábrica en la misma dirección física: dos ubicaciones
-- lógicas, para distinguir producto terminado de material en proceso.
insert into ubicacion (codigo, nombre, tipo, padre_id)
select 'B5-699-FAB', 'Zavaleta 699 · Fábrica', 'area_fabrica', id
  from ubicacion where codigo = 'B5-699';

-- El piso no es un detalle: el vendedor necesita saber en qué piso está el
-- mueble para no pasear al cliente por todo el local.
insert into ubicacion (codigo, nombre, tipo, padre_id, es_exhibicion)
select 'B1-2020-P'||g, 'Belgrano 2020 · Piso '||g, 'piso', id, true
  from ubicacion, generate_series(1,3) g where codigo = 'B1-2020';

-- El camión es una ubicación del inventario: una unidad puede estar en
-- tránsito sin haber vuelto al depósito.
insert into ubicacion (codigo, nombre, tipo) values ('CAM-1', 'Camioneta', 'camion');

insert into agente (nombre, tipo) values
  ('Tienda Nube', 'canal');   -- absorbe las ventas sin vendedor

insert into parametro (clave, valor, tipo, descripcion, origen, a_confirmar) values
  ('venta.sena_porcentaje',                '30',    'porcentaje','Seña mínima para avanzar a fabricar. Excepción: retiro en local.','04_DECISIONES', false),
  ('venta.descuento_libre_vendedor',       '3',     'porcentaje','Descuento sin autorización. El prototipo v5 usaba 5%: vale el 3%.','04_DECISIONES', true),
  ('venta.plazo_estandar_dias',            '30',    'dias',      'Plazo de entrega estándar. 40 en Hot Sale, 20 en mes flojo.',      'Sección 3',     false),
  ('venta.compromiso_dias',                '7',     'dias',      'Plazo de compromiso comercial de la orden.',                       'Principio 10',  true),
  ('venta.leyenda_precio_efectivo',        'Precio en efectivo — no incluye IVA.', 'texto','Leyenda condicional según medio de pago.','Sección 2',    false),
  ('venta.leyenda_escalera',               'La subida por escalera no está incluida: es un servicio con costo extra.','texto','Segunda leyenda parametrizable.','Sección 9', false),
  ('cobro.ventana_duplicado_horas',        '48',    'horas',     'Ventana para avisar posible pago duplicado. Avisa, no bloquea.',   '§Cobros',       false),
  ('cobro.dias_max_sin_decision',          '3',     'dias',      'Un cobro abierto no puede pasar N días sin decisión.',             '00_OBJETOS',    false),
  ('cobro.dias_sin_rendir_bloquea',        '3',     'dias',      'Día 1 avisa, día 2 escala, día 3 bloquea.',                        'Sección 3',     false),
  ('saldo.vigencia_precio_congelado_dias', '30',    'dias',      'El saldo NUNCA caduca: caduca la condición comercial.',            '§Cobros',       false),
  ('facturacion.umbral_sugerencia',        '100000','monto',     'Transferencia sobre la cual se sugiere emitir comprobante.',       '00_OBJETOS',    false),
  ('reserva.vigencia_dias',                '7',     'dias',      'Duración de la reserva que nace con la orden.',                    '00_OBJETOS',    false),
  ('inventario.umbral_exhibicion_dias',    '30',    'dias',      'Días en vidriera tras los cuales sale de reasignación automática.','Sección 7',     true),
  ('costo.alerta_antiguedad_meses',        '4',     'numero',    'Aviso cuando el costo lleva N meses sin actualizar.',              'Sección 6',     false),
  ('proveedor.carga_minima_alerta',        '15',    'numero',    'Al tercerizado no se lo deja sin trabajo.',                        'Sección 5',     false),
  ('proveedor.capacidad_tanda_default',    '40',    'numero',    'Capacidad por tanda de los proveedores de guardado.',              'Sección 5',     false),
  ('logistica.limite_cobro_domicilio',     '500000','monto',     'Saldo máximo con el que puede salir el camión.',                   'Sección 9',     false),
  ('entrega.aviso_previo_minutos',         '45',    'numero',    'Se llama al cliente 30-60 min antes. Es un paso del proceso.',     'Sección 9',     false),
  ('entrega.dias_para_no_reingresar',      '1',     'dias',      'Dentro de este plazo la unidad queda en la camioneta.',            'Sección 9',     false),
  ('crm.dias_enfriandose',                 '3',     'dias',      'Consulta sin mover: avisa al vendedor.',                           'TRASPASO_CRM',  false),
  ('crm.dias_estancada',                   '7',     'dias',      'Consulta sin mover: el vendedor define cerrar o trabajar.',        'TRASPASO_CRM',  false),
  ('crm.dias_escala_supervision',          '10',    'dias',      'Escala. Solo escala lo que estuvo en rojo y no se tocó.',          'TRASPASO_CRM',  false),
  ('comision.reparto_venta_compartida',    '50',    'porcentaje','Venta compartida: mitad y mitad.',                                 '§Comisiones',   false),
  ('bonificacion.umbral_direccion',        '0',     'porcentaje','Sobre este % autoriza dirección. PENDIENTE DE DECISIÓN.',          '00_ARRANQUE §8',true);


-- =====================================================================
-- PENDIENTE PARA LOS PRÓXIMOS BLOQUES
--   Bloque 2 · plata: cobro · imputación · caja · rendición · devolución
--   Bloque 3 · abastecimiento: proveedor · pedido · recepción
--   Bloque 4 · RLS y permisos finos
--
-- RLS: se define cuando estén los cuatro bloques. Regla base —
--   core     → según rol
--   finanzas → solo dirección
--   audit    → solo lectura, dirección
--
-- NO exponer los esquemas en Settings → API hasta tener el RLS.
-- Mientras tanto el SQL Editor entra por debajo y alcanza para probar.
-- =====================================================================

-- =====================================================================
-- BELGRANO CORE · MIGRACIÓN DEL CATÁLOGO  (v2 · variante flexible)
-- Desde staging.tn_catalogo (lo llena la Edge Function sync-catalogo)
-- hacia core.producto y core.variante.
--
-- Correr DESPUÉS de bloque5b_variante_flexible.sql. Idempotente.
--
-- MODELO
--   Cada variante guarda TODOS sus atributos en una bolsa jsonb con claves
--   canónicas. Las columnas medida/estructura/frente son una proyección de
--   las tres claves homónimas, para filtrar rápido. La identidad de la
--   variante es producto + bolsa completa: dos con los mismos atributos son
--   la misma, y los sinónimos ("MEDIDA" vs "MEDIDAS DEL FRENTE") colapsan
--   solos porque comparten clave canónica.
--
-- REGLA DEL MAPEO
--   Solo hace falta declarar dos cosas:
--     · qué atributos llenan las 3 COLUMNAS (medida, estructura, frente)
--     · qué atributos son BASURA y se ignoran
--   Todo lo demás cae solo a la bolsa con su nombre normalizado. Así un
--   atributo nuevo cargado mañana en Tienda Nube nunca se pierde.
-- =====================================================================

create schema if not exists staging;

-- Limpieza de objetos que cambiaron de forma entre versiones.
drop view     if exists staging.tn_bolsa;
drop view     if exists staging.tn_ejes;
drop function if exists staging.limpiar_valor(text);
drop function if exists staging.unaccent_simple(text);
drop function if exists staging.norm_clave(text);


-- =====================================================================
-- 1 · ESPEJO DE TIENDA NUBE  (lo llena la Edge Function)
-- =====================================================================
create table if not exists staging.tn_catalogo (
  variant_id   bigint primary key,
  product_id   bigint not null,
  nombre       text,
  categoria    text,
  categoria_id bigint,
  atributos    jsonb,
  valores      jsonb,
  sku          text,
  precio       numeric,
  publicado    boolean,
  actualizado  timestamptz
);


-- =====================================================================
-- 2 · HELPERS
-- =====================================================================

-- Quita acentos sin depender de la extensión unaccent.
create or replace function staging.unaccent_simple(p text)
returns text language sql immutable as $$
  select translate(coalesce(p,''),
    'áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜñÑçÇ',
    'aeiouAEIOUaeiouAEIOUaeiouAEIOUnNcC');
$$;

-- Normaliza el NOMBRE de un atributo a una clave: minúsculas, sin acentos,
-- espacios → guión bajo. "MEDIDAS DEL FRENTE" → "medidas_del_frente".
create or replace function staging.norm_clave(p text)
returns text language sql immutable as $$
  select nullif(regexp_replace(
           lower(staging.unaccent_simple(trim(p))),
           '[^a-z0-9]+', '_', 'g'), '');
$$;

-- Tienda Nube repite el nombre del atributo dentro del valor:
-- ESTRUCTURA → "ESTRUCTURA BLANCA". Se saca el prefijo y se pasa a
-- minúscula para que "BLANCA" y "Blanca" no cuenten como valores distintos.
create table if not exists staging.prefijo_redundante (prefijo text primary key);
insert into staging.prefijo_redundante (prefijo) values
  ('ESTRUCTURA'),('TAPA'),('DETALLE'),('DETALLES'),('FRENTE'),('FRENTES'),
  ('MEDIDA'),('MEDIDAS'),('COLOR'),('COLOR DE'),('TIPO DE MELAMINA'),('MELAMINA'),
  ('PATA'),('PATAS'),('ESTANTE'),('ESTANTES'),('MODULO'),('MÓDULO'),('PANEL'),
  ('HUECO'),('HUECOS'),('RESPALDO'),('TAPIZADO'),('HIERRO'),('LATERAL')
on conflict (prefijo) do nothing;

create or replace function staging.limpiar_valor(p_valor text)
returns text language sql immutable as $$
  select lower(coalesce(
    (select nullif(trim(regexp_replace(p_valor, '^'||pr.prefijo||'\s+', '', 'i')), '')
       from staging.prefijo_redundante pr
      where upper(p_valor) like upper(pr.prefijo)||' %'
      order by length(pr.prefijo) desc
      limit 1),
    trim(p_valor)));
$$;


-- =====================================================================
-- 3 · MAPEO — solo columnas e ignorados; el resto cae a la bolsa
-- =====================================================================

create table if not exists staging.mapeo_atributo (
  atributo_tn text primary key,
  canonico    text not null    -- 'medida' | 'estructura' | 'frente' | 'ignorar'
);

insert into staging.mapeo_atributo (atributo_tn, canonico) values
  -- → COLUMNA medida (la dimensión principal del frente/mueble)
  ('MEDIDAS DEL FRENTE','medida'), ('MEDIDA','medida'), ('MEDIDAS','medida'),
  ('MEDIDA DE FRENTE','medida'),   ('MEDIDA DEL FRENTE','medida'),
  ('Medidas del Frente','medida'), ('MEDIDAS DE FRENTE','medida'),
  ('FRENTE DE COMODA','medida'),   ('MEDIDAS DEL FRENTES','medida'),
  ('MEDIDAS DEL FRENTE TOTAL','medida'),
  -- → COLUMNA estructura (color/material del cuerpo)
  ('ESTRUCTURA','estructura'), ('TIPO DE MELAMINA','estructura'),
  ('COLOR DE MELAMINA','estructura'), ('color de estructura','estructura'),
  -- → COLUMNA frente (color del frente/puertas)
  ('FRENTE','frente'), ('FRENTES','frente'), ('COLOR DE FRENTE','frente'),
  ('Frente','frente'), ('COLOR DE FRENTES','frente'),
  -- → CLAVES DE BOLSA unificadas (sinónimos que no van a columna pero
  --   conviene juntar para que dos variantes iguales colapsen)
  ('ESPEJOS','espejo'), ('ESPEJO','espejo'), ('ALTURA DEL ESPEJO','espejo_altura'),
  ('TAPIZADOS','tapizado'), ('TAPIZADO','tapizado'), ('TELA','tapizado'),
  ('FORMA DE ENTREGA','forma_entrega'),
  ('PATAS','pata'), ('PATA','pata'),
  ('DETALLES','detalle'), ('DETALLE','detalle'),
  ('ESTANTES','estante'), ('ESTANTE','estante'),
  ('MÓDULO','modulo'), ('MODULO','modulo'), ('HUECOS','hueco'), ('HUECO','hueco'),
  ('FRENTES','frente_extra'),
  -- → IGNORAR (basura de e-commerce, no describe la variante)
  ('MUEBLES EN IMAGEN','ignorar'),   -- lista de muebles de una foto de ambiente
  ('Talle','ignorar'),               -- residuo de plantilla de ropa
  ('colores de pantalla','ignorar')
on conflict (atributo_tn) do nothing;

comment on table staging.mapeo_atributo is
  'Solo lista lo que va a columna (medida/estructura/frente) o se ignora. Lo no listado cae a la bolsa con su nombre normalizado.';


-- =====================================================================
-- 4 · BOLSA DE ATRIBUTOS POR VARIANTE
-- =====================================================================

create or replace view staging.tn_bolsa as
with pares as (
  select
    t.variant_id,
    trim(a.value #>> '{}')                        as atributo,
    staging.limpiar_valor(trim(v.value #>> '{}')) as valor
  from staging.tn_catalogo t
  cross join lateral jsonb_array_elements(coalesce(t.atributos,'[]'::jsonb))
       with ordinality as a(value, pos)
  left join lateral jsonb_array_elements(coalesce(t.valores,'[]'::jsonb))
       with ordinality as v(value, pos) on v.pos = a.pos
), clasificado as (
  select
    p.variant_id,
    case
      when m.canonico = 'ignorar' then null
      when m.canonico is not null then m.canonico
      else staging.norm_clave(p.atributo)
    end as clave,
    p.valor
  from pares p
  left join staging.mapeo_atributo m on lower(m.atributo_tn) = lower(p.atributo)
  where nullif(p.valor,'') is not null
)
select
  variant_id,
  jsonb_object_agg(clave, valor) filter (where clave is not null) as bolsa
from clasificado
group by variant_id;


-- =====================================================================
-- 5 · MIGRACIÓN
-- =====================================================================

-- 5.1 · PRODUCTOS (uno por categoría + nombre)
-- Tienda Nube a veces tiene el mismo producto cargado dos veces, con
-- product_id distinto pero mismo nombre. Se agrupa por (categoría, nombre),
-- no por product_id, para que colapsen en un solo producto de Core en vez
-- de chocar entre sí. Las variantes de ambos matchean por nombre.
insert into core.producto (categoria, nombre, tipo, publicado_tn, tn_product_id, activo)
select
  coalesce(nullif(trim(t.categoria),''),'Sin categoría'),
  min(trim(t.nombre))            as nombre,   -- una forma; el resto son mismo mueble
  'estandar',
  bool_or(coalesce(t.publicado,false)),
  max(t.product_id)::text,                    -- uno cualquiera; el vínculo real es por nombre
  true
from staging.tn_catalogo t
where nullif(trim(t.nombre),'') is not null
group by coalesce(nullif(trim(t.categoria),''),'Sin categoría'), lower(trim(t.nombre))
on conflict (categoria, lower(nombre)) do update
  set publicado_tn = excluded.publicado_tn,
      tn_product_id = excluded.tn_product_id;

-- 5.2 · VARIANTES
insert into core.variante
  (producto_id, medida, estructura, frente, atributos, tn_variant_id, precio, precio_ts, activo)
select
  x.producto_id,
  x.bolsa->>'medida',
  x.bolsa->>'estructura',
  x.bolsa->>'frente',
  x.bolsa,
  x.tn_variant_id,
  x.precio,
  x.precio_ts,
  true
from (
  select
    p.id                              as producto_id,
    coalesce(b.bolsa, '{}'::jsonb)    as bolsa,
    t.variant_id::text                as tn_variant_id,
    t.precio,
    coalesce(t.actualizado, now())    as precio_ts,
    row_number() over (
      partition by p.id, md5(coalesce(b.bolsa,'{}'::jsonb)::text)
      order by t.variant_id) as rn
  from staging.tn_catalogo t
  join staging.tn_bolsa b on b.variant_id = t.variant_id
  join core.producto p
    on  p.categoria = coalesce(nullif(trim(t.categoria),''),'Sin categoría')
    and lower(p.nombre) = lower(trim(t.nombre))
  where nullif(trim(t.nombre),'') is not null
) x
where x.rn = 1
on conflict (producto_id, md5(atributos::text)) do update set
  precio        = excluded.precio,
  precio_ts     = excluded.precio_ts,
  tn_variant_id = excluded.tn_variant_id,
  medida        = excluded.medida,
  estructura    = excluded.estructura,
  frente        = excluded.frente;


-- =====================================================================
-- 6 · VERIFICACIONES
-- =====================================================================

-- 6.1 · Cuánto entró.
select
  (select count(*) from staging.tn_catalogo)                          as tn_variantes,
  (select count(distinct product_id) from staging.tn_catalogo)        as tn_productos,
  (select count(*) from core.variante where tn_variant_id is not null) as core_variantes,
  (select count(*) from core.producto where tn_product_id is not null) as core_productos;

-- 6.2 · Variantes de TN colapsadas por tener la misma bolsa.
select p.nombre,
       count(*)                                       as tn,
       count(distinct md5(b.bolsa::text))             as bolsas_distintas,
       count(*) - count(distinct md5(b.bolsa::text))  as colapsadas
from staging.tn_catalogo t
join staging.tn_bolsa b on b.variant_id = t.variant_id
join core.producto p on p.categoria = coalesce(nullif(trim(t.categoria),''),'Sin categoría')
                     and lower(p.nombre) = lower(trim(t.nombre))
group by p.nombre
having count(*) <> count(distinct md5(b.bolsa::text))
order by colapsadas desc
limit 30;

-- 6.3 · Claves que quedaron en la BOLSA (fuera de las 3 columnas).
select key as clave_en_bolsa, count(*) as variantes
from core.variante, jsonb_each_text(atributos)
where key not in ('medida','estructura','frente')
group by key order by variantes desc;

-- 6.4 · Muestra final.
select p.categoria, p.nombre, v.medida, v.estructura, v.frente, v.precio, v.atributos
from core.variante v join core.producto p on p.id = v.producto_id
order by p.nombre, v.medida, v.estructura, v.frente
limit 25;

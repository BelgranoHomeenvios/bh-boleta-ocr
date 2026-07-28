-- =====================================================================
-- BELGRANO CORE · MIGRACIÓN DEL CATÁLOGO
-- Desde `rentabilidad.tn_catalogo` (Belgrano Cost) hacia `core.producto`
-- y `core.variante`.
--
-- ⚠ ANTES DE CORRER: pasar el diagnóstico (diagnostico_catalogo_tn.sql) y
--   ajustar la tabla `staging.mapeo_eje` según los nombres de atributo que
--   Tienda Nube use de verdad. Los defaults de acá son una hipótesis.
--
-- Es idempotente: se puede correr de nuevo. Actualiza precios y agrega lo
-- que falte, sin duplicar.
--
-- ORDEN FIJO Y UNIVERSAL de los tres ejes (§Catálogo):
--   1 medida · 2 estructura · 3 frentes/detalles/tapas
-- Se respeta en catálogo, venta, inventario, pedidos y reportes.
-- =====================================================================

create schema if not exists staging;

-- ---------------------------------------------------------------------
-- Compatibilidad con corridas anteriores.
--
-- Este script evolucionó: la vista de ejes sumó una columna y la función
-- de SKU sumó un parámetro. Ni `create or replace view` ni `create or
-- replace function` pueden con eso —la vista no admite reordenar columnas
-- y la función crearía una sobrecarga ambigua—, así que los objetos que
-- cambiaron de forma se borran antes de recrearse.
--
-- Se borran solo definiciones, nunca datos.
-- ---------------------------------------------------------------------
drop view     if exists staging.tn_ejes;
drop function if exists staging.sku_generado(text,text,text,text,text);
drop function if exists staging.sku_generado(text,text,text,text,text,text);
drop function if exists staging.limpiar_valor(text);
drop function if exists staging.unaccent_simple(text);


-- =====================================================================
-- 1 · ESPEJO DEL CATÁLOGO DE TIENDA NUBE
--
-- Si Core y Belgrano Cost son proyectos Supabase DISTINTOS, hay que traer
-- la tabla primero. Dos caminos:
--
--   a) CSV  — exportar `rentabilidad.tn_catalogo` desde Cost e importarlo
--             acá con el importador de Supabase. Es lo más simple.
--   b) FDW  — create extension postgres_fdw; y traerla en vivo. Sirve si
--             se va a sincronizar seguido; para una migración única, no
--             vale la pena.
--
-- Si son el MISMO proyecto, borrar esta tabla y apuntar directo a
-- rentabilidad.tn_catalogo en la sección 4.
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
-- 2 · MAPEO DE ATRIBUTOS
-- Qué nombre de Tienda Nube corresponde a cada eje de Core.
-- Editable: si el diagnóstico muestra otros nombres, se agregan acá y se
-- vuelve a correr. No hay nada hardcodeado en el resto del script.
-- =====================================================================

create table if not exists staging.mapeo_eje (
  atributo_tn text primary key,
  eje         text not null check (eje in ('medida','estructura','frente','complemento','ignorar'))
);

-- Si la tabla ya existía de una corrida anterior, su check no conoce el
-- cuarto eje. `create table if not exists` no toca la que ya está, así que
-- el constraint se reemplaza a mano.
do $$
declare c text;
begin
  select conname into c
    from pg_constraint
   where conrelid = 'staging.mapeo_eje'::regclass
     and contype = 'c'
     and pg_get_constraintdef(oid) not like '%complemento%';
  if c is not null then
    execute format('alter table staging.mapeo_eje drop constraint %I', c);
    alter table staging.mapeo_eje
      add constraint mapeo_eje_eje_check
      check (eje in ('medida','estructura','frente','complemento','ignorar'));
  end if;
end $$;

-- Los tres primeros son los nombres REALES que usa Tienda Nube, tomados del
-- diagnóstico. El resto son variantes previsibles, por si aparecen en otras
-- categorías. El match es case-insensitive y sobre el nombre ya recortado,
-- así que "MEDIDAS DEL FRENTE " y "MEDIDAS DEL FRENTE" caen en la misma fila.
insert into staging.mapeo_eje (atributo_tn, eje) values
  -- Eje 1 · MEDIDA. Tienda Nube usa tres nombres para lo mismo.
  ('MEDIDAS DEL FRENTE', 'medida'),
  ('MEDIDAS',            'medida'),
  ('MEDIDA',             'medida'),
  ('Medida',             'medida'),
  ('Tamaño',             'medida'),
  -- Eje 2 · ESTRUCTURA. Es el material o color del cuerpo del mueble.
  ('ESTRUCTURA',         'estructura'),
  ('TIPO DE MELAMINA',   'estructura'),
  ('TAPIZADOS',          'estructura'),   -- CUERINA · LINO · PANA
  ('Material',           'estructura'),
  -- Eje 3 · FRENTES / DETALLES / TAPAS
  ('DETALLE',            'frente'),
  ('Tapa',               'frente'),
  ('Frente',             'frente'),
  ('Frentes',            'frente'),
  ('Terminación',        'frente'),
  ('Terminacion',        'frente'),
  -- Eje 4 · COMPLEMENTO. Configuración que no es ninguna de las tres.
  ('ESPEJO',             'complemento'),  -- 1 / 2 / 3 / SIN ESPEJO
  ('ESPEJOS',            'complemento'),  -- mismo atributo, otro nombre
  ('FORMA DE ENTREGA',   'complemento'),  -- ARMADA · DESARMADA
  ('Color',              'estructura'),  -- en lámparas y macetas el color ES el cuerpo
  -- 'Talle' es residuo de la plantilla de e-commerce de ropa: se ignora.
  ('Talle',              'ignorar')
on conflict (atributo_tn) do nothing;

comment on table staging.mapeo_eje is
  'Traduce el nombre del atributo de Tienda Nube al eje de Core. Ajustar según el diagnóstico antes de migrar.';


-- ---------------------------------------------------------------------
-- PREFIJOS REDUNDANTES
-- Tienda Nube repite el nombre del atributo adentro del valor:
--   ESTRUCTURA → "ESTRUCTURA BLANCA"      DETALLE → "TAPA PARAISO"
-- Guardarlo así deja la columna estructura con el texto "ESTRUCTURA
-- BLANCA", que es ruido en cada filtro y en cada pedido a proveedor.
--
-- Se limpia el prefijo y queda "BLANCA" / "PARAISO". Si en alguna categoría
-- el prefijo NO fuera redundante, se saca de esta tabla y ese valor se
-- guarda entero.
-- ---------------------------------------------------------------------
-- Interruptor del SKU. Mientras esté en false, la migración no inventa
-- códigos: el formato se decide aparte y recién ahí se prende.
create table if not exists staging.opcion (
  clave text primary key,
  valor boolean not null
);
insert into staging.opcion (clave, valor) values ('generar_sku', false)
on conflict (clave) do nothing;

create table if not exists staging.prefijo_redundante (
  prefijo text primary key
);

insert into staging.prefijo_redundante (prefijo) values
  ('ESTRUCTURA'), ('TAPA'), ('DETALLE'), ('FRENTE'), ('MEDIDA'), ('COLOR'),
  ('TIPO DE MELAMINA'), ('MELAMINA')
on conflict (prefijo) do nothing;

create or replace function staging.limpiar_valor(p_valor text)
returns text language sql immutable as $$
  select coalesce(
    (select nullif(trim(regexp_replace(p_valor, '^'||pr.prefijo||'\s+', '', 'i')), '')
       from staging.prefijo_redundante pr
      where upper(p_valor) like upper(pr.prefijo)||' %'
      limit 1),
    trim(p_valor));
$$;



-- Quita acentos sin depender de la extensión unaccent, que en Supabase hay
-- que habilitar aparte.
create or replace function staging.unaccent_simple(p text)
returns text language sql immutable as $$
  select translate(coalesce(p,''),
    'áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜñÑçÇ',
    'aeiouAEIOUaeiouAEIOUaeiouAEIOUnNcC');
$$;

-- ---------------------------------------------------------------------
-- SKU GENERADO  ·  ⚠ PROVISORIO — el formato se define aparte
--
-- Poner un SKU ahora y cambiarlo después es caro: queda impreso en
-- etiquetas y referenciado en pedidos viejos. Por eso la migración lo deja
-- en NULL por defecto (ver staging.generar_sku más abajo) y la variante se
-- identifica mientras tanto por tn_variant_id, que ya es único y estable.
--
-- Cuando el formato esté definido, se prende el flag y se corre de nuevo.
-- ---------------------------------------------------------------------
-- SKU GENERADO
-- Tienda Nube no trae SKU. Se arma uno estable y legible con el formato ya
-- definido: CATEGORIA-PRODUCTO-ESTRUCTURA-FRENTE-MEDIDA, tres letras cada
-- parte. Ej: ESP-MUE-BLA-PAR-120
-- ---------------------------------------------------------------------
create or replace function staging.sku_generado(
  p_categoria text, p_producto text,
  p_medida text, p_estructura text, p_frente text, p_complemento text default null
) returns text language sql immutable as $$
  -- array_remove solo saca NULL, no cadenas vacías: sin el nullif de cada
  -- parte, un producto sin frente deja el SKU con guiones colgando
  -- (FUN-LAM-BLA--). Cada parte se anula si queda vacía.
  select upper(array_to_string(array_remove(array[
    nullif(substr(regexp_replace(staging.unaccent_simple(p_categoria), '[^A-Za-z]','','g'),1,3), ''),
    -- 3 letras del producto MÁS sus dígitos: sin los dígitos, "Amberes 70" y
    -- "Amberes 55" dan el mismo código y colisionan.
    nullif(substr(regexp_replace(staging.unaccent_simple(p_producto), '[^A-Za-z]','','g'),1,3)
      || regexp_replace(coalesce(p_producto,''), '[^0-9]','','g'), ''),
    nullif(substr(regexp_replace(staging.unaccent_simple(p_estructura),'[^A-Za-z0-9]','','g'),1,3), ''),
    nullif(substr(regexp_replace(staging.unaccent_simple(p_frente),    '[^A-Za-z0-9]','','g'),1,3), ''),
    nullif(substr(regexp_replace(staging.unaccent_simple(p_complemento),'[^A-Za-z0-9]','','g'),1,3), ''),
    nullif(regexp_replace(coalesce(p_medida,''), '[^0-9]','','g'), '')
  ], null), '-'));
$$;


-- =====================================================================
-- 3 · ATRIBUTOS DESARMADOS
-- `atributos` y `valores` son dos arrays paralelos. Se cruzan por posición
-- (WITH ORDINALITY) y se pivotean a las tres columnas.
-- =====================================================================

create or replace view staging.tn_ejes as
with pares as (
  select
    t.variant_id,
    trim(a.value #>> '{}')                        as atributo,
    staging.limpiar_valor(trim(v.value #>> '{}'))  as valor
  from staging.tn_catalogo t
  cross join lateral jsonb_array_elements(coalesce(t.atributos,'[]'::jsonb))
       with ordinality as a(value, pos)
  left join lateral jsonb_array_elements(coalesce(t.valores,'[]'::jsonb))
       with ordinality as v(value, pos) on v.pos = a.pos
)
select
  p.variant_id,
  max(p.valor) filter (where m.eje = 'medida')     as medida,
  max(p.valor) filter (where m.eje = 'estructura') as estructura,
  max(p.valor) filter (where m.eje = 'frente')      as frente,
  max(p.valor) filter (where m.eje = 'complemento') as complemento,
  -- Atributos que no mapean a ningún eje. Si esto no queda vacío, hay que
  -- completar staging.mapeo_eje antes de dar la migración por buena.
  string_agg(distinct p.atributo, ', ')
    filter (where m.eje is null)                   as sin_mapear
from pares p
left join staging.mapeo_eje m on lower(m.atributo_tn) = lower(p.atributo)
where nullif(p.valor,'') is not null
group by p.variant_id;


-- =====================================================================
-- 4 · MIGRACIÓN
-- =====================================================================

-- 4.1 · PRODUCTOS
-- Un producto por product_id de Tienda Nube. El nombre y la categoría son
-- los mismos para todas sus variantes.
--
-- Tienda Nube es una VISTA PUBLICADA del catálogo, no un catálogo aparte:
-- por eso `publicado_tn` es un atributo del producto, no una tabla separada.
insert into core.producto (categoria, nombre, tipo, publicado_tn, tn_product_id, activo)
select
  coalesce(nullif(trim(t.categoria),''), 'Sin categoría'),
  trim(t.nombre),
  'estandar',
  bool_or(coalesce(t.publicado,false)),
  t.product_id::text,
  true
from staging.tn_catalogo t
where nullif(trim(t.nombre),'') is not null
group by t.product_id, t.categoria, t.nombre
on conflict (categoria, lower(nombre)) do update
  set publicado_tn  = excluded.publicado_tn,
      tn_product_id = excluded.tn_product_id;

-- 4.2 · VARIANTES
-- El precio vive en la variante. Sin proporciones ni fórmulas entre
-- variantes: cada combinación tiene el suyo.
insert into core.variante
  (producto_id, medida, estructura, frente, complemento, sku, tn_variant_id, precio, precio_ts, activo)
select
  x.producto_id, x.medida, x.estructura, x.frente, x.complemento,
  -- Si dos variantes generaran el mismo SKU, la segunda lleva el variant_id
  -- pegado. El SKU tiene que ser único porque es la clave de inventario.
  case when x.sku is null then null
       when x.rn = 1     then x.sku
       else x.sku || '-' || x.variant_id end,
  x.variant_id::text, x.precio, x.precio_ts, true
from (
  select
    p.id                    as producto_id,
    nullif(e.medida,'')     as medida,
    nullif(e.estructura,'') as estructura,
    nullif(e.frente,'')      as frente,
    nullif(e.complemento,'') as complemento,
    t.variant_id,
    t.precio,
    coalesce(t.actualizado, now()) as precio_ts,
    case when (select valor from staging.opcion where clave='generar_sku')
         then coalesce(nullif(trim(t.sku),''), staging.sku_generado(
                coalesce(nullif(trim(t.categoria),''),'GEN'), trim(t.nombre),
                e.medida, e.estructura, e.frente, e.complemento))
         else nullif(trim(t.sku),'')                            -- solo el de TN, si lo hubiera
    end                                                         as sku,
    -- Dos variantes de Tienda Nube pueden caer en la misma combinación de
    -- ejes: pasa cuando un atributo no mapea y quedan indistinguibles. Sin
    -- esto, el upsert falla con "cannot affect row a second time". Se queda
    -- la de variant_id más bajo y la otra se lista en la verificación 5.6.
    row_number() over (
      partition by p.id, coalesce(e.medida,''), coalesce(e.estructura,''),
                   coalesce(e.frente,''), coalesce(e.complemento,'')
      order by t.variant_id)                                    as rn_eje,
    row_number() over (
      partition by coalesce(nullif(trim(t.sku),''), staging.sku_generado(
        coalesce(nullif(trim(t.categoria),''),'GEN'), trim(t.nombre),
        e.medida, e.estructura, e.frente, e.complemento))
      order by t.variant_id)                                    as rn
  from staging.tn_catalogo t
  join staging.tn_ejes e on e.variant_id = t.variant_id
  join core.producto p
    on  p.categoria = coalesce(nullif(trim(t.categoria),''), 'Sin categoría')
    and lower(p.nombre) = lower(trim(t.nombre))
  where nullif(trim(t.nombre),'') is not null
) x
where x.rn_eje = 1
on conflict (producto_id, coalesce(medida,''), coalesce(estructura,''),
             coalesce(frente,''), coalesce(complemento,''))
do update set
  precio        = excluded.precio,
  precio_ts     = excluded.precio_ts,
  tn_variant_id = excluded.tn_variant_id,
  sku           = coalesce(core.variante.sku, excluded.sku);


-- =====================================================================
-- 5 · VERIFICACIÓN — correr SIEMPRE después de migrar
-- =====================================================================

-- 5.1 · Cuánto entró
select
  (select count(*) from staging.tn_catalogo)                          as tn_variantes,
  (select count(distinct product_id) from staging.tn_catalogo)        as tn_productos,
  (select count(*) from core.variante where tn_variant_id is not null) as core_variantes,
  (select count(*) from core.producto where tn_product_id is not null) as core_productos;

-- 5.2 · ⚠ ATRIBUTOS SIN MAPEAR
-- Si devuelve filas, hay atributos de Tienda Nube que no cayeron en ningún
-- eje: esas variantes quedaron incompletas. Agregarlos a staging.mapeo_eje
-- y volver a correr la sección 4.
select sin_mapear, count(*) as variantes
from staging.tn_ejes
where sin_mapear is not null
group by sin_mapear order by 2 desc;

-- 5.3 · Variantes que perdieron todos sus ejes (posible pérdida de datos)
select t.variant_id, t.nombre, t.atributos, t.valores
from staging.tn_catalogo t
join staging.tn_ejes e on e.variant_id = t.variant_id
where e.medida is null and e.estructura is null and e.frente is null
  and e.complemento is null
  and jsonb_array_length(coalesce(t.atributos,'[]'::jsonb)) > 0
limit 20;

-- 5.6 · ⚠ VARIANTES DESCARTADAS por caer en la misma combinación de ejes.
-- Si devuelve filas, Tienda Nube tiene variantes que Core no puede
-- distinguir: o falta mapear un atributo, o están duplicadas en el origen.
select t.product_id, t.nombre, count(*) as variantes_tn,
       count(distinct (e.medida, e.estructura, e.frente, e.complemento)) as combinaciones,
       count(*) - count(distinct (e.medida, e.estructura, e.frente, e.complemento)) as descartadas
from staging.tn_catalogo t
join staging.tn_ejes e on e.variant_id = t.variant_id
group by t.product_id, t.nombre
having count(*) > count(distinct (e.medida, e.estructura, e.frente, e.complemento));

-- 5.4 · Colisiones: dos variantes de TN que caen en la misma combinación
select p.nombre, v.medida, v.estructura, v.frente, v.complemento, count(*) as veces
from core.variante v join core.producto p on p.id = v.producto_id
group by 1,2,3,4,5 having count(*) > 1;

-- 5.5 · Muestra final, como se va a ver en el sistema
select p.categoria, p.nombre, v.medida, v.estructura, v.frente, v.complemento, v.precio, v.sku
from core.variante v join core.producto p on p.id = v.producto_id
order by p.categoria, p.nombre, v.medida, v.estructura, v.frente, v.complemento
limit 25;

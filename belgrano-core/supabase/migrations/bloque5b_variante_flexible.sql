-- =====================================================================
-- BELGRANO CORE · VARIANTE FLEXIBLE (3 columnas + bolsa)
-- Reemplaza al bloque 5 (cuarto eje). Correr después del bloque 4.
-- Idempotente.
--
-- POR QUÉ
--   El catálogo real tiene muebles con más ejes que tres: un placard puede
--   tener estructura, frente, tapa, pata y detalle, cada uno con su color.
--   Tres columnas fijas no alcanzan, y forzarlo pierde variantes.
--
--   Decisión (Brian): las tres columnas se quedan —son lo que el vendedor
--   filtra siempre: medida, estructura, frente— y TODO lo demás va a una
--   bolsa flexible por variante. Así no se pierde ninguna combinación, el
--   filtrado rápido sigue en columnas, y cuando el catálogo de Tienda Nube
--   se limpie la bolsa queda más chica sin romper nada.
--
-- CÓMO IDENTIFICA UNA VARIANTE
--   Dos variantes con exactamente los mismos atributos son la misma —tal
--   como pediste—. La identidad es producto + la bolsa completa. Como la
--   bolsa guarda claves canónicas, "MEDIDA" y "MEDIDAS DEL FRENTE" cuentan
--   igual: los sinónimos colapsan solos, sin tocar Tienda Nube.
-- =====================================================================

set search_path = core, public;

-- La bolsa. Guarda TODOS los atributos de la variante con clave canónica:
--   {"medida":"1.20","estructura":"blanca","frente":"paraiso","tapa":"negra"}
alter table variante add column if not exists atributos jsonb not null default '{}'::jsonb;

comment on column variante.atributos is
  'Todos los atributos de la variante con clave canónica. Las columnas medida/estructura/frente son una proyección de las tres claves homónimas para filtrar rápido; la bolsa tiene además el resto (tapa, pata, detalle, espejo, tapizado...).';

-- El cuarto eje del bloque 5 se absorbe en la bolsa. Si quedó con datos, se
-- migran a la bolsa antes de soltar la columna.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='core' and table_name='variante' and column_name='complemento') then
    update core.variante
       set atributos = atributos || jsonb_build_object('complemento', complemento)
     where complemento is not null and not (atributos ? 'complemento');
    alter table core.variante drop column complemento;
  end if;
end $$;

-- La identidad de la variante deja de ser las columnas: pasa a ser la bolsa
-- completa. Dos variantes con la misma bolsa son la misma.
do $$
declare r record;
begin
  for r in
    select indexname from pg_indexes
     where schemaname='core' and tablename='variante'
       and indexdef ilike '%unique%' and indexdef ilike '%coalesce%'
  loop
    execute format('drop index if exists core.%I', r.indexname);
  end loop;
end $$;

-- jsonb normaliza el orden de claves, así que el md5 de su texto es estable:
-- misma bolsa → mismo hash. Más liviano que indexar el jsonb entero.
create unique index if not exists variante_identidad_uq
  on variante (producto_id, md5(atributos::text));

-- Índice para filtrar por cualquier atributo de la bolsa
-- ("mostrame las que tienen tapa negra"), no solo por las tres columnas.
create index if not exists variante_atributos_gin
  on variante using gin (atributos);

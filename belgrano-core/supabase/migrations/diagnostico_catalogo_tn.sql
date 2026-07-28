-- =====================================================================
-- DIAGNÓSTICO DEL CATÁLOGO DE TIENDA NUBE
--
-- Correr en el Supabase de BELGRANO COST (el que tiene el esquema
-- `rentabilidad`). No modifica nada: son cinco consultas de lectura.
--
-- Para qué: `tn_catalogo` guarda los atributos como dos arrays paralelos
--   atributos = ["Color","Medida"]     ← los nombres de las opciones
--   valores   = ["Blanco","1.80"]      ← los valores de ESTA variante
--
-- Para mapear a los tres ejes de Core (medida · estructura · frente) hay
-- que saber qué nombres de atributo usa Tienda Nube realmente. Eso no se
-- puede adivinar: sale de estas consultas.
-- =====================================================================


-- 1 · Volumen. Cuántos productos y cuántas variantes hay de verdad.
select
  count(*)                                    as variantes,
  count(distinct product_id)                  as productos,
  count(*) filter (where publicado)           as publicadas,
  count(*) filter (where precio is null)      as sin_precio,
  count(distinct categoria)                   as categorias
from rentabilidad.tn_catalogo;


-- 2 · LA CONSULTA QUE MÁS IMPORTA.
--     Qué nombres de atributo usa Tienda Nube, y cuántas variantes tiene
--     cada uno. De acá sale el mapeo a medida / estructura / frente.
select
  atributo,
  count(*)                                as variantes,
  count(distinct valor)                   as valores_distintos,
  (array_agg(distinct valor))[1:12]       as ejemplos
from (
  select
    trim(a.value #>> '{}')  as atributo,
    trim(v.value #>> '{}')  as valor
  from rentabilidad.tn_catalogo t
  cross join lateral jsonb_array_elements(coalesce(t.atributos,'[]'::jsonb))
       with ordinality as a(value, pos)
  left join lateral jsonb_array_elements(coalesce(t.valores,'[]'::jsonb))
       with ordinality as v(value, pos) on v.pos = a.pos
) x
where atributo is not null and atributo <> ''
group by atributo
order by variantes desc;


-- 3 · Cuántos ejes tiene cada producto. Sirve para ver si hay productos
--     con más de tres atributos, que no entrarían en el modelo tal cual.
select
  jsonb_array_length(coalesce(atributos,'[]'::jsonb)) as cantidad_ejes,
  count(*)                                            as variantes,
  count(distinct product_id)                          as productos
from rentabilidad.tn_catalogo
group by 1 order by 1;


-- 4 · Categorías, con volumen. Van a `core.producto.categoria`.
select categoria, count(distinct product_id) as productos, count(*) as variantes
from rentabilidad.tn_catalogo
group by categoria order by variantes desc;


-- 5 · Muestra concreta de una cómoda, para ver el formato tal cual.
select nombre, categoria, sku, precio, publicado, atributos, valores
from rentabilidad.tn_catalogo
where categoria ilike '%comoda%' or categoria ilike '%cómoda%' or nombre ilike '%amberes%'
order by product_id, variant_id
limit 20;

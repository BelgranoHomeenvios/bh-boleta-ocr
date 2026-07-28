-- =====================================================================
-- PREPARAR STAGING PARA EL ÁRBOL DE CATEGORÍAS
-- Correr antes de resincronizar con la función actualizada. Idempotente.
-- =====================================================================

-- El árbol de categorías de Tienda Nube, tal cual: cada una con su padre.
create table if not exists staging.tn_categoria (
  tn_id       bigint primary key,
  nombre      text,
  parent_id   bigint,           -- tn_id del padre; null en las raíces
  actualizado timestamptz
);

-- Todas las categorías de cada producto, para elegir la más específica.
alter table staging.tn_catalogo add column if not exists categoria_ids jsonb;

-- Permisos para que la Edge Function (service_role) escriba.
grant all privileges on all tables in schema staging to service_role, authenticated;

-- Ver el árbol después de sincronizar: nivel, padre, cuántos productos cuelgan.
-- (Esta consulta la corrés DESPUÉS de la función; ahora devuelve vacío.)
with recursive arbol as (
  select tn_id, nombre, parent_id, 1 as nivel, nombre::text as ruta
  from staging.tn_categoria where parent_id is null
  union all
  select c.tn_id, c.nombre, c.parent_id, a.nivel+1, a.ruta||' › '||c.nombre
  from staging.tn_categoria c join arbol a on c.parent_id = a.tn_id
)
select nivel, ruta,
       (select count(distinct product_id) from staging.tn_catalogo t
         where t.categoria_ids @> to_jsonb(arbol.tn_id)) as productos
from arbol order by ruta;

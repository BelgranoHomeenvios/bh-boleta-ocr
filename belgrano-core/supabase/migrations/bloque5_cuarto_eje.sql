-- =====================================================================
-- BELGRANO CORE · CUARTO EJE DE VARIANTE
-- Correr después del bloque 4. Idempotente.
--
-- POR QUÉ
--   Los tres ejes cubren medida · estructura · frentes. Pero el catálogo
--   real tiene configuraciones que no son ninguna de las tres: el placard
--   con 1, 2, 3 o sin espejo tiene precio distinto y stock distinto, así
--   que es una variante — pero el espejo no es una medida, ni el material
--   de la estructura, ni el color del frente.
--
--   Se agrega un cuarto eje en vez de forzarlo dentro de "frente", porque
--   un placard puede tener a la vez color de frente Y cantidad de espejos.
--   Metidos en la misma columna, esa combinación no se puede expresar.
--
-- EL ORDEN SIGUE SIENDO FIJO Y UNIVERSAL
--   1 medida · 2 estructura · 3 frentes/detalles/tapas · 4 complemento
--   Se respeta igual en catálogo, venta, inventario, pedidos y reportes.
-- =====================================================================

set search_path = core, public;

alter table variante add column if not exists complemento text;

comment on column variante.complemento is
  'Eje 4. Configuración que no es medida, estructura ni frente: cantidad de espejos, forma de entrega, equipamiento. Nullable como los otros tres.';

-- La unicidad tiene que incluir el cuarto eje, o dos variantes que solo se
-- diferencian por el espejo colisionan.
drop index if exists variante_producto_id_coalesce_coalesce1_coalesce2_idx;

do $$
declare r record;
begin
  for r in
    select indexname from pg_indexes
     where schemaname='core' and tablename='variante'
       and indexdef ilike '%unique%' and indexdef ilike '%coalesce%'
       and indexdef not ilike '%complemento%'
  loop
    execute format('drop index if exists core.%I', r.indexname);
  end loop;
end $$;

create unique index if not exists variante_ejes_uq on variante
  (producto_id,
   coalesce(medida,''), coalesce(estructura,''),
   coalesce(frente,''), coalesce(complemento,''));

-- La línea congela los cuatro ejes al momento de la venta.
comment on column linea.atributos_snapshot is
  'Los cuatro ejes al momento de la venta. Si mañana se corrige el catálogo, la venta vieja sigue diciendo lo que se vendió.';

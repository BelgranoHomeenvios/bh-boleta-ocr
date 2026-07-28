-- =====================================================================
-- BELGRANO CORE · SEMILLA — CHOFERES Y CARPINTEROS
-- Correr después del bloque 4. Idempotente.
--
-- Los nombres salen de las constantes FLETES y PROVEEDORES de la app de
-- reclamos que está en producción. Son las personas reales con las que se
-- opera todos los días, y ninguna estaba en los documentos de diseño.
--
-- Principio 6: cada sujeto tiene una cuenta. El chofer cobra el saldo en la
-- puerta, sale con plata para devoluciones y se le descuenta el segundo
-- viaje cuando la fallida es suya — necesita existir como agente aunque
-- nunca inicie sesión.
-- =====================================================================

set search_path = core, public;

-- ---------------------------------------------------------------------
-- CHOFERES
-- De la constante FLETES. Se excluyen "EXPRESO" y "RETIRO": no son
-- personas, son tipos de flete y ya viven en el enum tipo_flete.
-- "PEDRO (jony)" queda como Pedro; la aclaración era para saber quién lo
-- coordina, no parte del nombre.
-- ---------------------------------------------------------------------
insert into agente (nombre, tipo) values
  ('Iván',   'chofer'),
  ('Fabián', 'chofer'),
  ('Juan',   'chofer'),
  ('Marcos', 'chofer'),
  ('Pedro',  'chofer'),
  ('Lalo',   'chofer'),
  ('Mauro',  'chofer')
on conflict do nothing;

insert into agente_rol (agente_id, rol)
select id, 'chofer' from agente where tipo = 'chofer'
on conflict do nothing;

-- Caja personal para cada chofer. La necesitan por dos motivos:
--   · cobran el saldo en la puerta y después rinden
--   · salen con plata cuando hay una devolución en efectivo — el inverso de
--     la rendición, mismo control con signo negativo
insert into caja (nombre, tipo, agente_id)
select 'Caja ' || nombre, 'personal', id
from agente where tipo = 'chofer' and activo
on conflict do nothing;

-- ---------------------------------------------------------------------
-- CARPINTEROS Y PROVEEDORES
-- De la constante PROVEEDORES. Se excluyen "PROVEEDOR" y "FABRICA": son
-- categorías genéricas, no proveedores concretos.
--
-- ⚠ "VICENTE" puede ser el mismo "Zvicente" que ya está cargado desde los
--   documentos de producción. Quedan los dos hasta confirmarlo — es más
--   barato fusionarlos después que perder el vínculo de un reclamo viejo.
-- ---------------------------------------------------------------------
insert into agente (nombre, tipo) values
  ('Tony',     'proveedor'),
  ('Matías',   'proveedor'),
  ('Raúl',     'proveedor'),
  ('Hernán',   'proveedor'),
  ('Michelle', 'proveedor'),
  ('Luciano',  'proveedor'),
  ('Vicente',  'proveedor')
on conflict do nothing;

-- Ficha de capacidad. Los valores son los defaults de los documentos:
-- capacidad por tanda ~40, alerta cuando la carga baja de ~15.
-- Al tercerizado se lo trata como interno: no puede quedarse sin trabajo.
insert into proveedor (agente_id, capacidad_tanda, carga_minima_alerta)
select id,
       core.param_num('proveedor.capacidad_tanda_default')::int,
       core.param_num('proveedor.carga_minima_alerta')::int
from agente
where tipo = 'proveedor'
on conflict do nothing;

-- Cada proveedor abre su pedido único, que va a acumular tandas fechadas
-- adentro. Uno solo abierto por proveedor — es la regla del objeto.
insert into pedido_proveedor (proveedor_id)
select p.agente_id from proveedor p
where not exists (
  select 1 from pedido_proveedor pp
  where pp.proveedor_id = p.agente_id and pp.estado = 'abierto'
);


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
select a.tipo,
       count(*)                                    as agentes,
       count(*) filter (where c.id is not null)    as con_caja,
       string_agg(a.nombre, ', ' order by a.nombre) as nombres
from agente a
left join caja c on c.agente_id = a.id and c.tipo = 'personal'
where a.activo
group by a.tipo
order by a.tipo;

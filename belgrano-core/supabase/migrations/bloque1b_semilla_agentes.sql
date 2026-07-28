-- =====================================================================
-- BELGRANO CORE · SEMILLA DE AGENTES Y ROLES
-- Correr después del bloque 1. Es idempotente: se puede correr dos veces.
--
-- Los nombres salen de los documentos de diseño. Los roles salen de las
-- tablas "Roles" que cada sección fue dejando.
--
-- ⚠ DOS COSAS A CONFIRMAR, marcadas más abajo:
--     1. "Ale" vs "Alejandro" — ¿son la misma persona?
--     2. "Sergio" aparece como vendedor Y como referente técnico
-- =====================================================================

set search_path = core, public;

-- ---------------------------------------------------------------------
-- PERSONAS
-- tipo = qué es principalmente. Los roles finos van en agente_rol.
-- ---------------------------------------------------------------------
insert into agente (nombre, tipo) values
  -- Dirección
  ('Brian',    'direccion'),
  ('Jony',     'direccion'),
  -- Operaciones y producción
  ('Iara',     'produccion'),        -- encargada de operaciones
  ('Adrián',   'produccion'),        -- dibujo, CAD, recepción, conteo
  -- Logística y postventa
  ('Lucas',    'logistica'),
  ('Cintia',   'administrativo'),    -- reclamos + evaluación en el CRM
  -- Administración
  ('Daniel',   'administrativo'),    -- pagos, transferencias, conciliación ARCA
  -- Vendedores  ⚠ confirmar si "Ale" es "Alejandro"
  ('Sergio',   'vendedor'),
  ('Alejandro','vendedor'),
  ('Cristian', 'vendedor'),
  ('Nati',     'vendedor'),
  ('Claudia',  'vendedor')           -- vendedora Y receptora de rendición
on conflict do nothing;

-- ---------------------------------------------------------------------
-- ROLES
-- Un agente puede tener varios: Claudia vende y recibe rendiciones,
-- Jony y Brian son dirección y además autorizan re-precio.
-- ---------------------------------------------------------------------
insert into agente_rol (agente_id, rol)
select a.id, r.rol
from agente a
join (values
  -- Dirección: ve costos y márgenes, autoriza todo lo que escala
  ('Brian',    'direccion'),
  ('Brian',    'receptor_rendicion'),
  ('Brian',    'autorizador_reprecio'),
  ('Brian',    'catalogo'),
  ('Jony',     'direccion'),
  ('Jony',     'receptor_rendicion'),
  ('Jony',     'autorizador_reprecio'),
  ('Jony',     'catalogo'),

  -- Iara — encargada de operaciones. Verifica precio y plazo antes de
  -- fabricar, gestiona la línea caída, verifica el dibujo.
  ('Iara',     'operaciones'),
  ('Iara',     'produccion'),
  ('Iara',     'administrativo'),

  -- Adrián — dibuja, carga pedidos, recibe y verifica calidad, hace el
  -- conteo físico.
  ('Adrián',   'produccion'),
  ('Adrián',   'deposito'),
  ('Adrián',   'catalogo'),

  -- Lucas — arma el día, coordina rutas, rinde a Jony
  ('Lucas',    'logistica'),

  -- Cintia — cara del reclamo frente al cliente + auditora del CRM
  ('Cintia',   'reclamos'),
  ('Cintia',   'administrativo'),

  -- Daniel — transferencias, pagos a proveedores, ARCA
  ('Daniel',   'administrativo'),
  ('Daniel',   'receptor_rendicion'),

  -- Vendedores
  ('Sergio',   'vendedor'),
  ('Alejandro','vendedor'),
  ('Cristian', 'vendedor'),
  ('Nati',     'vendedor'),
  ('Claudia',  'vendedor'),
  ('Claudia',  'receptor_rendicion')
) as r(nombre, rol) on lower(r.nombre) = lower(a.nombre)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- CAJA PERSONAL
-- Una por agente que puede cobrar. Vuelve a 0 en cada rendición.
-- Los agentes de tipo 'canal' (Tienda Nube) NO cobran: quedan afuera.
-- ---------------------------------------------------------------------
insert into caja (nombre, tipo, agente_id)
select 'Caja ' || a.nombre, 'personal', a.id
from agente a
where a.tipo in ('vendedor','administrativo','logistica','direccion','chofer')
  and a.activo
on conflict do nothing;

-- ---------------------------------------------------------------------
-- PROVEEDORES conocidos
-- Los dos que los documentos nombran con su producto por default.
-- El resto se carga a medida que aparezcan.
-- ---------------------------------------------------------------------
insert into agente (nombre, tipo) values
  ('Zvicente', 'proveedor'),      -- respaldos (ej: respaldo Dumbo)
  ('Lionel',   'proveedor')       -- sillas (ej: silla Meier)
on conflict do nothing;

insert into proveedor (agente_id, forma, capacidad_tanda, carga_minima_alerta)
select id,
       case nombre when 'Zvicente' then 'por_tabla'::forma_fabricacion
                   when 'Lionel'   then 'por_tabla'::forma_fabricacion end,
       40, 15
from agente where nombre in ('Zvicente','Lionel')
on conflict do nothing;


-- =====================================================================
-- VERIFICACIÓN
-- =====================================================================
select a.nombre,
       a.tipo,
       string_agg(ar.rol, ', ' order by ar.rol) as roles,
       (select count(*) from caja c where c.agente_id = a.id) as cajas
from agente a
left join agente_rol ar on ar.agente_id = a.id
group by a.id, a.nombre, a.tipo
order by a.tipo, a.nombre;

-- =====================================================================
-- FIX · Prefijo "Z" en nombres de proveedor
--
-- La Z era una marca de identificación vieja para proveedores. Se deja de
-- usar: el nombre real es el que queda sin ella.
--
-- Zvicente y Vicente son la misma persona, y estaban cargados dos veces —
-- uno desde los documentos de producción, otro desde la app de reclamos.
-- Se fusionan conservando el registro más antiguo, para no romper ninguna
-- referencia que ya apunte a él.
--
-- Idempotente: correrlo dos veces no hace nada la segunda.
-- =====================================================================

set search_path = core, public;

do $$
declare
  r         record;
  v_limpio  text;
  v_destino bigint;
begin
  for r in
    select id, nombre from agente
    where tipo = 'proveedor'
      and activo                              -- el ya fusionado no se vuelve a tocar
      and nombre ~* '^z[a-záéíóúñ]'           -- empieza con Z + letra
    order by id
  loop
    v_limpio := initcap(substring(r.nombre from 2));

    -- ¿Ya existe el agente con el nombre limpio?
    select id into v_destino
    from agente
    where lower(nombre) = lower(v_limpio) and id <> r.id
    order by id
    limit 1;

    if v_destino is null then
      -- No hay duplicado: solo se le saca la Z.
      update agente set nombre = v_limpio where id = r.id;
      raise notice 'Renombrado: % → %', r.nombre, v_limpio;
    else
      -- Hay duplicado: se repuntan las referencias al que queda y se da de
      -- baja el otro. No se borra — su historia puede estar referenciada.
      update proveedor_producto  set proveedor_id = v_destino where proveedor_id = r.id;
      update equivalencia_proveedor set proveedor_id = v_destino where proveedor_id = r.id;
      update cuenta_proveedor    set proveedor_id = v_destino where proveedor_id = r.id;
      update venta_material      set proveedor_id = v_destino where proveedor_id = r.id;

      -- Pedidos: hay UNO SOLO abierto por proveedor, así que si el que queda
      -- ya tiene el suyo, el del duplicado se cierra ANTES de moverlo. Si no,
      -- se muda abierto. En los dos casos los pedidos viejos viajan igual:
      -- son la historia de lo que ese carpintero entregó.
      if exists (select 1 from pedido_proveedor
                 where proveedor_id = v_destino and estado = 'abierto') then
        update pedido_proveedor set estado = 'cerrado', cerrado_en = now()
         where proveedor_id = r.id and estado = 'abierto';
      end if;

      update pedido_proveedor set proveedor_id = v_destino where proveedor_id = r.id;

      -- Recién ahora, sin nada apuntando, se puede sacar la ficha duplicada.
      delete from proveedor where agente_id = r.id;
      update agente set activo = false,
                        nombre = r.nombre || ' (fusionado en ' || v_limpio || ')'
       where id = r.id;

      raise notice 'Fusionado: % → % (id %)', r.nombre, v_limpio, v_destino;
    end if;
  end loop;
end $$;

-- Verificación
select id, nombre, tipo, activo from agente where tipo = 'proveedor' order by activo desc, nombre;

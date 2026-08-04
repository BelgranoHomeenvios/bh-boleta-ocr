// =====================================================================
//  Belgrano Soft · Compras · Recepciones a conformar
//  Adrián recibe, Jony paga. Apenas se cierra una recepción aparece acá
//  con lo que trajo el taller, cómo llegó cada mueble y el precio que
//  teníamos. Se compara contra el remito del proveedor y, si no da, se
//  corrige: sólo esta vez, o cambiando la lista de precios desde hoy.
// =====================================================================
(function (global) {
  const Recepciones = {
    _mount: 'view',
    abierta: null,
    _lineas: {},

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = (this.abierta ? this.htmlUna(this.abierta) : this.htmlLista())
        + this.estilos();
      this.enganchar();
    },

    htmlLista() {
      const pend = global.DB.aConformar();
      const hechas = global.DB.recepciones().filter(r => r.estadoCompras === 'conformada');
      const fila = r => `<tr>
        <td class="nom">${UI.esc(r.numero)}</td>
        <td>${UI.esc(r.proveedor || '—')}</td>
        <td class="muted">${UI.esc(r.pedido || '—')}</td>
        <td class="muted">${UI.esc(r.fecha)}</td>
        <td class="tnum">${r.items.length}</td>
        <td class="tnum nom">${r.total ? UI.pesos(r.total) : this.estimado(r)}</td>
        <td class="td-acc"><button class="b-x ${r.estadoCompras === 'pendiente' ? 'hacer' : ''}"
          data-ver="${UI.esc(r.numero)}">${
          r.estadoCompras === 'pendiente' ? 'Conformar' : 'Ver'}</button></td>
      </tr>`;
      const bloque = (t, lista, pie) => `<div class="cp-b">
        <div class="cp-b-h">${t} <span class="muted">${lista.length}</span></div>
        ${lista.length ? `<div class="card cp-tabla"><table>
          <thead><tr><th>Recepción</th><th>Taller</th><th>Pedido</th><th>Fecha</th>
            <th>Muebles</th><th>Total</th><th></th></tr></thead>
          <tbody>${lista.map(fila).join('')}</tbody></table></div>`
          : `<div class="hint" style="padding:8px 2px">${pie}</div>`}</div>`;
      return `
        <div class="row" style="margin-bottom:14px;align-items:flex-start">
          <div><div class="kick">Compras</div><h1 class="h-title">Recepciones a conformar</h1>
            <div class="h-sub">${pend.length} esperando el visto · ${hechas.length} ya conformadas</div></div>
        </div>
        ${bloque('Esperando que las conformes', pend,
          'No hay nada esperando. Aparecen solas cuando el depósito recibe un pedido.')}
        ${bloque('Conformadas', hechas, 'Todavía no se conformó ninguna.')}
        <div class="hint" style="margin-top:10px">El precio que conformás acá es el que pasa a ser el
          <b>costo real</b> del mueble. Hoy el costo es un número cargado a mano; a partir de acá es
          lo que realmente pagaste la última vez.</div>`;
    },
    estimado(r) {
      const t = r.items.reduce((a, x) => a
        + global.DB.precioProveedor(r.provId, x.varianteId).precio, 0);
      return `<span class="muted">${UI.pesos(t)} est.</span>`;
    },

    htmlUna(num) {
      const r = global.DB.recepcion(num);
      if (!r) return UI.vacio('No existe esa recepción.');
      const hecha = r.estadoCompras === 'conformada';
      const lin = r.items.map(it => {
        const pr = global.DB.precioProveedor(r.provId, it.varianteId);
        const puesto = this._lineas[it.unidadId];
        return { it, lista: pr.precio, estimado: pr.estimado, origen: pr.origen,
          costeo: pr.costeo || null,
          precio: puesto != null ? puesto : (it.precio != null ? it.precio : pr.precio) };
      });
      const total = lin.reduce((a, l) => a + (Number(l.precio) || 0), 0);
      const totLista = lin.reduce((a, l) => a + l.lista, 0);
      const dif = total - (this._remito != null ? this._remito : total);
      return `
        <div class="fk-bar" style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
          <button class="lnk" id="cp-volver">‹ Recepciones</button>
          <span class="muted">${UI.esc(r.pedido || '')}</span></div>
        <div class="row" style="align-items:flex-start;margin-bottom:12px">
          <div><div class="kick">Compras</div>
            <h1 class="h-title">${UI.esc(r.numero)} · ${UI.esc(r.proveedor)}</h1>
            <div class="h-sub">Recibida por <b>${UI.esc(r.recibidoPor)}</b> el ${UI.esc(r.fecha)} ·
              ${r.items.length} muebles del pedido ${UI.esc(r.pedido || '—')}</div></div>
          <div class="sp"></div>
          ${hecha ? `<span class="pill ok">conformada por ${UI.esc(r.conformadaPor)}</span>` : ''}
        </div>

        <div class="card cp-tabla"><table>
          <thead><tr><th>Mueble</th><th>Terminación</th><th>Cómo llegó</th><th>Venta</th>
            <th class="num">De lista</th><th class="num">A pagar</th><th></th></tr></thead>
          <tbody>${lin.map(l => {
            const c = global.DB.calidad(l.it.calidad) || {};
            const d = (Number(l.precio) || 0) - l.lista;
            return `<tr class="${l.it.calidad === 'reparar' ? 'mal' : (d ? 'ojo' : '')}">
              <td class="nom">${UI.esc(l.it.modelo)} <span class="muted">${UI.esc(l.it.medida || '')}</span></td>
              <td class="muted">${UI.esc(l.it.color || '')}</td>
              <td><span class="pill ${c.pill}">${UI.esc(c.label || '')}</span>
                ${l.it.nota ? `<span class="hint">${UI.esc(l.it.nota)}</span>` : ''}</td>
              <td class="muted">${UI.esc(l.it.orden || 'stock')}</td>
              <td class="num muted">${UI.pesos(l.lista)}${l.estimado
                ? `<span class="cp-est" title="${UI.esc(this.pieOrigen(l))}">${
                  UI.esc((global.DB.ORIGENES_PRECIO[l.origen] || {}).label || 'est.')}</span>` : ''}</td>
              <td class="num">${hecha ? UI.pesos(l.precio)
                : `<input class="cp-in" type="number" value="${l.precio}"
                    data-precio="${l.it.unidadId}">`}</td>
              <td>${d && !hecha ? `<span class="${d > 0 ? 'sube' : 'baja'}">${d > 0 ? '+' : ''}${
                UI.pesos(d)}</span>
                <button class="b-x" data-lista="${l.it.unidadId}|${l.it.varianteId}"
                  title="Dejarlo como precio nuevo del taller">Actualizar la lista</button>`
                : (d ? `<span class="${d > 0 ? 'sube' : 'baja'}">${d > 0 ? '+' : ''}${UI.pesos(d)}</span>` : '')}</td>
            </tr>`;
          }).join('')}
          <tr class="cp-tot"><td colspan="4">Total de lo recibido</td>
            <td class="num">${UI.pesos(totLista)}</td>
            <td class="num" id="cp-total">${UI.pesos(total)}</td><td></td></tr>
          </tbody></table></div>

        ${hecha ? `<div class="hint" style="margin-top:11px">Conformada el
          ${UI.esc(r.conformadaEl)}. Este total es lo que hay que pagarle a
          ${UI.esc(r.proveedor)}.</div>`
        : `${this.htmlComprobante(r, total)}
        ${this.htmlFlete(r)}
        <div class="card pad cp-cierre">
          <label class="fld" style="margin:0"><span class="lbl">Total del remito del taller</span>
            <input id="cp-remito" type="number" placeholder="${total}"></label>
          <div><div class="lbl" style="font-size:10.5px;font-weight:700;text-transform:uppercase;
            letter-spacing:.05em;color:var(--muted)">Diferencia</div>
            <div class="cp-dif" id="cp-dif">—</div></div>
          <div class="sp"></div>
          <button class="btn" id="cp-guardar">Guardar sin conformar</button>
          <button class="btn primary" id="cp-ok">Conformar y pasar a pagar</button>
        </div>
        <div class="hint" style="margin-top:9px">Corregir un precio tiene dos caminos:
          <b>sólo en esta orden</b> —queda como excepción— o <b>actualizar la lista</b>, que cambia
          lo que nos cobra ese taller de acá en más. Los <b>devueltos no están</b>: no se pagan. El
          que va <b>a reparar se paga igual</b>, el mueble está.</div>`}`;
    },

    // De dónde salió el número que aparece como precio de lista.
    pieOrigen(l) {
      if (l.origen === 'costeo' && l.costeo) {
        return `Lista de Costeo · ${l.costeo.terminacion} ${l.costeo.medida}`
          + (l.costeo.exacta ? '' : ' (la medida más parecida)');
      }
      if (l.origen === 'catalogo') return 'No hay precio de este taller ni fila en Costeo: es el costo cargado en el mueble.';
      return '';
    },

    // La mayoría de las compras son informales: el taller trae los muebles y
    // un papel escrito a mano. Las que sí facturan hay que cargarlas como
    // corresponde, con el IVA aparte, porque de eso sale lo que se computa.
    htmlComprobante(r, neto) {
      const c = r.comprobante || {};
      const tipo = this._comp != null ? this._comp : (c.tipo || 'sin');
      const iva = this._iva != null ? this._iva : (c.iva != null ? c.iva : 21);
      const otros = this._otros != null ? this._otros : (c.otros || '');
      const forma = this._forma != null ? this._forma : (c.forma || 'transferencia');
      const mIva = tipo === 'factura' ? Math.round(neto * (Number(iva) || 0) / 100) : 0;
      const mOtros = tipo === 'factura' ? Number(otros) || 0 : 0;
      return `<div class="card pad cp-comp">
        <div class="cx-b-h" style="margin-bottom:8px">El comprobante</div>
        <div class="cp-fl-op">${global.DB.TIPOS_COMPROBANTE.map(t => `
          <label class="cp-fl ${tipo === t.k ? 'on' : ''}">
            <input type="radio" name="cp-comp" value="${t.k}" ${tipo === t.k ? 'checked' : ''}>
            <span><b>${UI.esc(t.label)}</b><span class="hint">${UI.esc(t.pie)}</span></span>
          </label>`).join('')}</div>
        ${tipo === 'sin' ? '' : `<div class="cp-comp-m">
          <label class="fld" style="margin:0"><span class="lbl">Número</span>
            <input id="cp-nro" value="${UI.esc(c.nro || '')}" placeholder="0001-00012345"></label>
          ${tipo === 'factura' ? `
            <label class="fld" style="margin:0"><span class="lbl">IVA</span>
              <select id="cp-iva">${global.DB.ALICUOTAS_IVA.map(a =>
                `<option value="${a}" ${Number(iva) === a ? 'selected' : ''}>${a}%</option>`).join('')}</select></label>
            <label class="fld" style="margin:0"><span class="lbl">Otros impuestos</span>
              <input id="cp-otros" type="number" value="${otros}" placeholder="0"></label>` : ''}
          <label class="fld" style="margin:0"><span class="lbl">Cómo se paga</span>
            <select id="cp-forma">${global.DB.FORMAS_PAGO.map(f =>
              `<option value="${f.k}" ${forma === f.k ? 'selected' : ''}>${UI.esc(f.label)}</option>`).join('')}</select></label>
        </div>
        ${tipo === 'factura' ? `<div class="cp-comp-t">
          <span>Muebles <b>${UI.pesos(neto)}</b></span>
          <span>+ IVA ${iva}% <b>${UI.pesos(mIva)}</b></span>
          ${mOtros ? `<span>+ impuestos <b>${UI.pesos(mOtros)}</b></span>` : ''}
          <span class="cp-comp-tot">= <b>${UI.pesos(neto + mIva + mOtros)}</b></span>
        </div>` : ''}`}
      </div>`;
    },

    // Casi siempre lo trae el taller. Cuando lo fuimos a buscar nosotros hay
    // que decir dónde cae ese viaje: adentro de la compra —y entonces sube
    // el costo de cada mueble— o afuera, como gasto del mes.
    htmlFlete(r) {
      const modo = this._flete != null ? this._flete : ((r.flete || {}).modo || 'proveedor');
      const monto = this._fleteMonto != null ? this._fleteMonto : ((r.flete || {}).monto || '');
      const rep = modo === 'compra' && r.items.length && Number(monto)
        ? Math.round(Number(monto) / r.items.length) : 0;
      return `<div class="card pad cp-flete">
        <div class="cp-b-h" style="margin-bottom:8px">El flete de esta entrega</div>
        <div class="cp-fl-op">${global.DB.FLETES.map(f => `
          <label class="cp-fl ${modo === f.k ? 'on' : ''}">
            <input type="radio" name="cp-flete" value="${f.k}" ${modo === f.k ? 'checked' : ''}>
            <span><b>${UI.esc(f.label)}</b><span class="hint">${UI.esc(f.pie)}</span></span>
          </label>`).join('')}</div>
        ${modo === 'proveedor' ? '' : `<div class="cp-fl-m">
          <label class="fld" style="margin:0"><span class="lbl">Cuánto costó el viaje</span>
            <input id="cp-flete-monto" type="number" value="${monto}" placeholder="45000"></label>
          <div class="hint">${rep ? `Se reparte entre ${r.items.length} muebles:
            <b>${UI.pesos(rep)}</b> a cada uno.` : 'Poné cuánto salió y se reparte solo.'}</div>
        </div>`}
      </div>`;
    },

    // Después de conformar: si algún precio se despegó del costo que tiene
    // cargado el mueble, se pregunta. Nunca se pisa el catálogo solo.
    modalCatalogo(r, lineas) {
      const cambios = lineas.map(l => {
        const v = global.DB.valeActualizar(l.varianteId, l.precio);
        if (!v) return null;
        const it = r.items.find(x => x.unidadId === l.unidadId) || {};
        return { ...l, ...v, modelo: it.modelo, medida: it.medida, color: it.color };
      }).filter(Boolean);
      // Un mismo mueble puede venir repetido en la entrega: se pregunta una vez.
      const unicos = [];
      cambios.forEach(c => { if (!unicos.some(x => x.varianteId === c.varianteId)) unicos.push(c); });
      if (!unicos.length) { this.abierta = null; this.render(this._mount); return; }
      document.body.insertAdjacentHTML('beforeend', `
        <div class="cp-back" id="cp-mdl"><div class="card pad" style="max-width:560px;width:100%">
          <h3 class="h-title" style="font-size:17px">¿Lo paso al catálogo?</h3>
          <p class="h-sub">${unicos.length} mueble${unicos.length === 1 ? ' quedó' : 's quedaron'}
            con un precio distinto del que tenía cargado. Si lo pasás, el margen que ve
            Ventas pasa a ser el de verdad.</p>
          <div class="cp-tabla" style="max-height:280px;overflow:auto;margin:10px 0"><table>
            <thead><tr><th></th><th>Mueble</th><th class="num">Tenía</th>
              <th class="num">Pagaste</th><th class="num">Dif.</th></tr></thead>
            <tbody>${unicos.map(c => `<tr>
              <td><input type="checkbox" class="cp-ck" data-vid="${c.varianteId}"
                data-precio="${c.precio}" checked></td>
              <td class="nom">${UI.esc(c.modelo || '')}
                <span class="muted">${UI.esc(c.medida || '')} · ${UI.esc(c.color || '')}</span></td>
              <td class="num muted">${UI.pesos(c.antes)}</td>
              <td class="num">${UI.pesos(c.ahora)}</td>
              <td class="num ${c.dif > 0 ? 'sube' : 'baja'}">${c.dif > 0 ? '+' : ''}${
                Math.round(c.pct)}%</td></tr>`).join('')}</tbody></table></div>
          <div class="row" style="gap:8px"><div class="sp"></div>
            <button class="btn" id="cp-no">Dejarlo como está</button>
            <button class="btn primary" id="cp-si">Actualizar el catálogo</button></div>
        </div></div>`);
      const cerrar = () => {
        const m = document.getElementById('cp-mdl'); if (m) m.remove();
        this.abierta = null; this.render(this._mount);
      };
      document.getElementById('cp-no').onclick = cerrar;
      document.getElementById('cp-si').onclick = () => {
        let n = 0;
        document.querySelectorAll('.cp-ck').forEach(c => {
          if (!c.checked) return;
          global.DB.actualizarCostoCatalogo(Number(c.dataset.vid), Number(c.dataset.precio), 'Jony');
          n++;
        });
        UI.aviso(n ? `${n} costo${n === 1 ? '' : 's'} actualizado${n === 1 ? '' : 's'} en el catálogo`
          : 'No se tocó el catálogo', 'ok');
        cerrar();
      };
    },

    enganchar() {
      const q = id => document.getElementById(id);
      const v = q('cp-volver'); if (v) v.onclick = () => {
        this.abierta = null; this._lineas = {}; this._remito = null;
        this._flete = null; this._fleteMonto = null;
        this._comp = null; this._iva = null; this._otros = null; this._forma = null;
        this.render(this._mount);
      };
      document.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => {
        this.abierta = b.dataset.ver; this._lineas = {}; this._remito = null;
        this._flete = null; this._fleteMonto = null;
        this._comp = null; this._iva = null; this._otros = null; this._forma = null;
        this.render(this._mount);
      });
      document.querySelectorAll('[data-precio]').forEach(i => i.oninput = () => {
        this._lineas[i.dataset.precio] = Number(i.value) || 0;
        this.recalcular();
      });
      document.querySelectorAll('[data-lista]').forEach(b => b.onclick = () => {
        const [uid, vid] = b.dataset.lista.split('|');
        const r = global.DB.recepcion(this.abierta);
        const precio = this._lineas[uid];
        if (precio == null) return;
        global.DB.guardarPrecioProveedor(r.provId, Number(vid), precio, 'yo');
        UI.aviso('Precio actualizado — rige desde hoy', 'ok');
        this.render(this._mount);
      });
      document.querySelectorAll('[name="cp-comp"]').forEach(r => r.onchange = () => {
        this._comp = r.value; this.render(this._mount);
      });
      const iva = q('cp-iva');
      if (iva) iva.onchange = () => { this._iva = Number(iva.value); this.render(this._mount); };
      const otr = q('cp-otros');
      if (otr) otr.oninput = () => { this._otros = Number(otr.value) || 0; this.render(this._mount); };
      const frm = q('cp-forma');
      if (frm) frm.onchange = () => { this._forma = frm.value; };
      document.querySelectorAll('[name="cp-flete"]').forEach(r => r.onchange = () => {
        this._flete = r.value;
        if (r.value === 'proveedor') this._fleteMonto = 0;
        this.render(this._mount);
      });
      const fm = q('cp-flete-monto');
      if (fm) fm.oninput = () => {
        this._fleteMonto = Number(fm.value) || 0;
        const h = fm.closest('.cp-fl-m').querySelector('.hint');
        const r = global.DB.recepcion(this.abierta);
        const rep = r.items.length ? Math.round(this._fleteMonto / r.items.length) : 0;
        if (h) h.innerHTML = `Se reparte entre ${r.items.length} muebles:
          <b>${UI.pesos(rep)}</b> a cada uno.`;
      };
      const rem = q('cp-remito');
      if (rem) rem.oninput = () => { this._remito = rem.value === '' ? null : Number(rem.value); this.recalcular(); };
      const ok = q('cp-ok'); if (ok) ok.onclick = () => {
        const r = global.DB.recepcion(this.abierta);
        const lineas = r.items.map(it => ({ unidadId: it.unidadId, varianteId: it.varianteId,
          precio: this._lineas[it.unidadId] != null ? this._lineas[it.unidadId]
            : global.DB.precioProveedor(r.provId, it.varianteId).precio }));
        const total = lineas.reduce((a, l) => a + l.precio, 0);
        if (this._remito != null && Math.round(this._remito) !== Math.round(total)) {
          return UI.aviso('El total no coincide con el remito — corregí una línea o sacá el remito', 'warn');
        }
        const nro = q('cp-nro');
        global.DB.guardarComprobante(this.abierta, {
          tipo: this._comp || 'sin', nro: nro ? nro.value : '',
          iva: this._iva != null ? this._iva : 21, otros: this._otros || 0,
          forma: this._forma || 'transferencia', quien: 'Jony' });
        global.DB.guardarFlete(this.abierta, { modo: this._flete || 'proveedor',
          monto: this._fleteMonto || 0, quien: 'yo' });
        global.DB.conformarRecepcion(this.abierta, { lineas, quien: 'yo' });
        UI.aviso('Conformada — lista para pagar', 'ok');
        this.modalCatalogo(r, lineas);
      };
      const g = q('cp-guardar'); if (g) g.onclick = () => UI.aviso('Guardado', 'ok');
      this.recalcular();
    },

    // El total se recalcula solo y la diferencia manda: mientras no sea cero,
    // conformar queda apagado. O se corrige una línea, o se explica por qué.
    recalcular() {
      const r = global.DB.recepcion(this.abierta); if (!r) return;
      const total = r.items.reduce((a, it) => a + (this._lineas[it.unidadId] != null
        ? this._lineas[it.unidadId] : global.DB.precioProveedor(r.provId, it.varianteId).precio), 0);
      const t = document.getElementById('cp-total');
      if (t) t.textContent = UI.pesos(total);
      const d = document.getElementById('cp-dif');
      const ok = document.getElementById('cp-ok');
      if (!d) return;
      if (this._remito == null) {
        d.innerHTML = '<span class="muted">poné el total del remito</span>';
        if (ok) ok.disabled = false;
        return;
      }
      const dif = total - this._remito;
      d.innerHTML = dif === 0
        ? '<b class="baja">$0 · coincide</b>'
        : `<b class="sube">${dif > 0 ? '+' : ''}${UI.pesos(dif)}</b>`;
      if (ok) ok.disabled = dif !== 0;
    },

    estilos() {
      return `<style>
        .cp-b{margin-bottom:18px}
        .cp-b-h{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);margin-bottom:6px}
        .cp-tabla{overflow-x:auto}
        .cp-tabla table{width:100%;border-collapse:collapse;font-size:12.5px}
        .cp-tabla th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);font-weight:700;padding:7px 9px;border-bottom:1px solid var(--line);
          white-space:nowrap}
        .cp-tabla td{padding:6px 9px;border-bottom:1px solid var(--line-soft);white-space:nowrap}
        .cp-tabla tr:last-child td{border-bottom:0}
        .cp-tabla .nom{font-weight:700;color:var(--navy)}
        .cp-tabla .num{text-align:right}
        .cp-tabla tr.mal td{background:var(--crit-bg)}
        .cp-tabla tr.ojo td{background:var(--warn-bg)}
        .cp-tot td{background:var(--panel-2);font-weight:700;color:var(--navy);
          border-top:1px solid var(--line)}
        .cp-in{width:104px;padding:3px 7px;font-size:12.5px;text-align:right;
          border:1px solid var(--line);border-radius:7px;background:var(--panel);color:var(--ink)}
        .cp-est{font-size:9.5px;background:var(--panel-2);border:1px solid var(--line);
          border-radius:999px;padding:0 5px;margin-left:4px;color:var(--muted)}
        .sube{color:var(--crit);font-weight:700} .baja{color:var(--ok);font-weight:700}
        .cp-cierre{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-top:12px}
        .cp-dif{font-size:19px;font-weight:800;color:var(--navy);margin-top:2px}
        .cp-cierre .btn[disabled]{opacity:.45;pointer-events:none}
        .cp-tabla .hint{display:block;font-size:11px}
        .cp-flete{margin-top:12px}
        .cp-fl-op{display:flex;gap:9px;flex-wrap:wrap}
        .cp-fl{display:flex;gap:7px;align-items:flex-start;padding:8px 11px;cursor:pointer;
          border:1px solid var(--line);border-radius:10px;background:var(--panel);flex:1 1 210px}
        .cp-fl.on{border-color:var(--navy);background:var(--panel-2)}
        .cp-fl b{display:block;font-size:12.5px;color:var(--navy)}
        .cp-fl .hint{display:block;font-size:11px;margin-top:1px}
        .cp-fl-m{display:flex;gap:14px;align-items:flex-end;margin-top:10px;flex-wrap:wrap}
        .cp-comp{margin-top:12px}
        .cp-comp-m{display:flex;gap:14px;align-items:flex-end;margin-top:10px;flex-wrap:wrap}
        .cp-comp-t{display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:10px;
          padding-top:9px;border-top:1px solid var(--line-soft);font-size:12.5px;color:var(--muted)}
        .cp-comp-t b{color:var(--navy);font-size:13.5px}
        .cp-comp-tot b{font-size:17px}
        .cp-back{position:fixed;inset:0;background:rgba(12,20,34,.45);z-index:70;
          display:flex;align-items:center;justify-content:center;padding:20px}
      </style>`;
    },
  };
  global.ComprasRecepciones = Recepciones;
})(typeof window !== 'undefined' ? window : globalThis);

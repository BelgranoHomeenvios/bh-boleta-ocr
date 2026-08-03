// =====================================================================
//  Belgrano Soft · Compras · Órdenes de compra
//  Lo que NO son muebles: los insumos con los que se trabaja —placas,
//  herrajes, telas, laca—. El mueble se le pide a la fábrica desde
//  Producción; acá se compra lo que hace falta para hacerlo.
// =====================================================================
(function (global) {
  const OC = {
    _mount: 'view',
    abierta: null,

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = (this.abierta ? this.htmlUna(this.abierta) : this.htmlLista())
        + this.estilos();
      this.enganchar();
    },

    htmlLista() {
      const os = global.DB.ordenesCompra();
      const enCurso = os.filter(o => o.estado === 'borrador' || o.estado === 'enviada');
      const cerradas = os.filter(o => o.estado === 'recibida' || o.estado === 'anulada');
      const abierto = enCurso.reduce((a, o) => a + global.DB.totalOC(o), 0);
      const fila = o => {
        const e = global.DB.estadoOC(o.estado);
        const d = o.entrega ? global.DB.diasHasta(o.entrega) : null;
        return `<tr>
          <td class="nom">${UI.esc(o.numero)}</td>
          <td>${UI.esc(o.proveedor)}</td>
          <td><span class="pill ${e.pill}">${UI.esc(e.label)}</span></td>
          <td class="tnum">${o.items.length}</td>
          <td class="num nom">${UI.pesos(global.DB.totalOC(o))}</td>
          <td class="${d != null && d < 0 ? 'venc' : 'muted'}">${o.entrega
            ? (d < 0 ? `${Math.abs(d)} días tarde` : `${o.entrega} · faltan ${d}`)
            : 'sin fecha'}</td>
          <td class="td-acc"><button class="b-x" data-ver="${UI.esc(o.numero)}">Abrir</button></td>
        </tr>`;
      };
      const bloque = (t, lista, pie) => `<div class="oc-b">
        <div class="oc-b-h">${t} <span class="muted">${lista.length}</span></div>
        ${lista.length ? `<div class="card oc-tabla"><table>
          <thead><tr><th>Orden</th><th>Proveedor</th><th>Estado</th><th>Ítems</th>
            <th class="num">Total</th><th>Entrega</th><th></th></tr></thead>
          <tbody>${lista.map(fila).join('')}</tbody></table></div>`
          : `<div class="hint" style="padding:8px 2px">${pie}</div>`}</div>`;
      return `
        <div class="row" style="margin-bottom:14px;align-items:flex-start">
          <div><div class="kick">Compras</div><h1 class="h-title">Órdenes de compra</h1>
            <div class="h-sub">${enCurso.length} en curso · <b>${UI.pesos(abierto)}</b> comprometidos</div></div>
          <div class="sp"></div>
          <button class="btn primary" id="oc-nueva">Generar compra</button>
        </div>
        ${bloque('En curso', enCurso, 'No hay ninguna abierta. Generá una para empezar.')}
        ${bloque('Cerradas', cerradas, 'Todavía no se recibió ninguna.')}
        <div class="hint" style="margin-top:10px">Acá van los <b>insumos</b>: placas, herrajes,
          telas, laca. Los muebles no se compran acá — se le piden a la fábrica desde
          <b>Producción</b>, y su costo llega por <b>Recepciones a conformar</b>.</div>`;
    },

    htmlUna(num) {
      const o = global.DB.oc(num);
      if (!o) return UI.vacio('No existe esa orden.');
      const e = global.DB.estadoOC(o.estado);
      const borrador = o.estado === 'borrador';
      const total = global.DB.totalOC(o);
      return `
        <div class="fk-bar" style="display:flex;gap:10px;align-items:center;margin-bottom:10px">
          <button class="lnk" id="oc-volver">‹ Órdenes de compra</button>
          <span class="muted">${UI.esc(o.proveedor)}</span></div>
        <div class="row" style="align-items:flex-start;margin-bottom:12px">
          <div><div class="kick">Compras · Orden</div>
            <h1 class="h-title">${UI.esc(o.numero)}</h1>
            <div class="h-sub">${UI.esc(o.proveedor)} · armada el ${UI.esc(o.fecha)} por
              ${UI.esc(o.quien)}${o.entrega ? ` · entrega ${UI.esc(o.entrega)}` : ''}</div></div>
          <div class="sp"></div>
          <span class="pill ${e.pill}">${UI.esc(e.label)}</span>
        </div>

        <div class="oc-acc">
          <span class="hint">${UI.esc(e.pie)}</span>
          <div class="sp"></div>
          ${borrador ? `<button class="btn" id="oc-agregar">Agregar insumo</button>
            <button class="btn primary" id="oc-enviar">Enviar al proveedor</button>`
            : o.estado === 'enviada'
              ? `<button class="btn" id="oc-borrador">Volver a borrador</button>
                 <button class="btn primary" id="oc-recibir">Registrar que llegó</button>`
              : ''}
        </div>

        ${o.items.length ? `<div class="card oc-tabla" style="margin-top:10px"><table>
          <thead><tr><th>Insumo</th><th>Unidad</th><th class="num">Cantidad</th>
            <th class="num">Precio</th><th class="num">Subtotal</th><th></th></tr></thead>
          <tbody>${o.items.map(x => `<tr>
            <td class="nom">${UI.esc(x.nombre)}</td>
            <td class="muted">${UI.esc(x.unidad)}</td>
            <td class="num">${borrador
              ? `<input class="oc-in" type="number" min="1" value="${x.cant}" data-cant="${UI.esc(x.insumo)}">`
              : x.cant}</td>
            <td class="num">${borrador
              ? `<input class="oc-in" type="number" value="${x.precio}" data-precio="${UI.esc(x.insumo)}">`
              : UI.pesos(x.precio)}</td>
            <td class="num nom">${UI.pesos(x.cant * x.precio)}</td>
            <td class="td-acc">${borrador
              ? `<button class="b-x" data-sacar="${UI.esc(x.insumo)}">Sacar</button>` : ''}</td>
          </tr>`).join('')}
          <tr class="oc-tot"><td colspan="4">Total</td>
            <td class="num">${UI.pesos(total)}</td><td></td></tr>
          </tbody></table></div>`
          : '<div class="hint" style="padding:14px 2px">Todavía no tiene nada. Agregale los insumos.</div>'}

        ${o.nota ? `<div class="hint" style="margin-top:10px"><b>Nota:</b> ${UI.esc(o.nota)}</div>` : ''}`;
    },

    enganchar() {
      const q = id => document.getElementById(id);
      const n = q('oc-nueva'); if (n) n.onclick = () => this.modalNueva();
      const v = q('oc-volver'); if (v) v.onclick = () => { this.abierta = null; this.render(this._mount); };
      document.querySelectorAll('[data-ver]').forEach(b => b.onclick = () => {
        this.abierta = b.dataset.ver; this.render(this._mount);
      });
      const ag = q('oc-agregar'); if (ag) ag.onclick = () => this.modalAgregar();
      const en = q('oc-enviar'); if (en) en.onclick = () => {
        const o = global.DB.oc(this.abierta);
        if (!o.items.length) return UI.aviso('La orden está vacía', 'warn');
        global.DB.cambiarOC(this.abierta, 'enviada', 'yo');
        UI.aviso('Enviada al proveedor', 'ok'); this.render(this._mount);
      };
      const bo = q('oc-borrador'); if (bo) bo.onclick = () => {
        global.DB.cambiarOC(this.abierta, 'borrador', 'yo'); this.render(this._mount);
      };
      const re = q('oc-recibir'); if (re) re.onclick = () => {
        global.DB.cambiarOC(this.abierta, 'recibida', 'yo');
        UI.aviso('Registrada como recibida', 'ok'); this.render(this._mount);
      };
      document.querySelectorAll('[data-sacar]').forEach(b => b.onclick = () => {
        global.DB.sacarDeOC(this.abierta, b.dataset.sacar); this.render(this._mount);
      });
      document.querySelectorAll('[data-cant]').forEach(i => i.onchange = () => {
        const o = global.DB.oc(this.abierta);
        const it = o.items.find(x => x.insumo === i.dataset.cant);
        if (it) it.cant = Math.max(1, Number(i.value) || 1);
        this.render(this._mount);
      });
      document.querySelectorAll('[data-precio]').forEach(i => i.onchange = () => {
        const o = global.DB.oc(this.abierta);
        const it = o.items.find(x => x.insumo === i.dataset.precio);
        if (it) it.precio = Number(i.value) || 0;
        this.render(this._mount);
      });
    },

    modalNueva() {
      const provs = ['Maderera del Oeste', 'Herrajes Vitale', 'Pinturería Norte',
        'Textiles Suárez', 'Hierros del Sur'];
      document.body.insertAdjacentHTML('beforeend', `
        <div class="pr-back" id="oc-mdl"><div class="card pad" style="max-width:430px;width:100%">
          <h3 class="h-title" style="font-size:17px">Generar compra</h3>
          <p class="h-sub">Se abre como borrador: se le agregan insumos y después se manda.</p>
          <label class="fld" style="margin-top:12px"><span class="lbl">Proveedor</span>
            <input id="oc-prov" list="oc-provs" placeholder="A quién se le compra">
            <datalist id="oc-provs">${provs.map(x =>
              `<option value="${UI.esc(x)}">`).join('')}</datalist></label>
          <label class="fld"><span class="lbl">Cuándo tiene que entregar</span>
            <input id="oc-ent" placeholder="12/8"></label>
          <div class="row" style="margin-top:16px;gap:10px"><div class="sp"></div>
            <button class="btn" id="oc-x">Cancelar</button>
            <button class="btn primary" id="oc-ok">Generar</button></div>
        </div></div>`);
      const cerrar = () => { const m = document.getElementById('oc-mdl'); if (m) m.remove(); };
      document.getElementById('oc-x').onclick = cerrar;
      document.getElementById('oc-mdl').onclick = e => { if (e.target.id === 'oc-mdl') cerrar(); };
      document.getElementById('oc-ok').onclick = () => {
        const prov = document.getElementById('oc-prov').value.trim();
        if (!prov) return UI.aviso('Falta el proveedor', 'warn');
        const o = global.DB.crearOC({ proveedor: prov,
          entrega: document.getElementById('oc-ent').value.trim(), quien: 'yo' });
        cerrar(); this.abierta = o.numero; this.render(this._mount);
      };
    },

    modalAgregar() {
      const ins = global.DB.INSUMOS;
      document.body.insertAdjacentHTML('beforeend', `
        <div class="pr-back" id="oc-mdl"><div class="card pad pr-mdl-g">
          <h3 class="h-title" style="font-size:17px">Agregar insumos</h3>
          <p class="h-sub">El precio es el último que pagamos: se puede cambiar después.</p>
          <input id="oc-bq" placeholder="Buscar insumo…" style="width:100%;margin-top:10px">
          <div class="pr-scroll" id="oc-ins">${ins.map(i => `
            <label class="pr-it" data-txt="${UI.esc(i.nombre.toLowerCase())}">
              <input type="checkbox" class="chk" data-ins="${UI.esc(i.k)}">
              <span class="pr-it-n">${UI.esc(i.nombre)}</span>
              <span class="muted">${UI.esc(i.unidad)}</span>
              <span class="sp"></span>
              <span class="muted">${UI.pesos(i.precio)}</span>
              <input class="oc-in" type="number" min="1" value="1" data-c="${UI.esc(i.k)}">
            </label>`).join('')}</div>
          <div class="row" style="margin-top:12px;gap:10px"><div class="sp"></div>
            <button class="btn" id="oc-x">Cancelar</button>
            <button class="btn primary" id="oc-ok">Agregar</button></div>
        </div></div>`);
      const cerrar = () => { const m = document.getElementById('oc-mdl'); if (m) m.remove(); };
      document.getElementById('oc-x').onclick = cerrar;
      const bq = document.getElementById('oc-bq');
      bq.oninput = () => {
        const t = bq.value.toLowerCase().trim();
        document.querySelectorAll('#oc-ins .pr-it').forEach(l => {
          l.style.display = !t || l.dataset.txt.includes(t) ? '' : 'none';
        });
      };
      document.getElementById('oc-ok').onclick = () => {
        const sel = [...document.querySelectorAll('#oc-mdl [data-ins]:checked')];
        if (!sel.length) return UI.aviso('No tildaste ninguno', 'warn');
        sel.forEach(c => {
          const cant = Number(document.querySelector(`[data-c="${c.dataset.ins}"]`).value) || 1;
          global.DB.agregarAOC(this.abierta, c.dataset.ins, cant);
        });
        UI.aviso(`${sel.length} agregados`, 'ok');
        cerrar(); this.render(this._mount);
      };
    },

    estilos() {
      return `<style>
        .oc-b{margin-bottom:18px}
        .oc-b-h{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);margin-bottom:6px}
        .oc-tabla{overflow-x:auto}
        .oc-tabla table{width:100%;border-collapse:collapse;font-size:12.5px}
        .oc-tabla th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.05em;
          color:var(--muted);font-weight:700;padding:7px 9px;border-bottom:1px solid var(--line);
          white-space:nowrap}
        .oc-tabla td{padding:6px 9px;border-bottom:1px solid var(--line-soft);white-space:nowrap}
        .oc-tabla tr:last-child td{border-bottom:0}
        .oc-tabla tr:hover td{background:var(--panel-2)}
        .oc-tabla .nom{font-weight:700;color:var(--navy)}
        .oc-tabla .num{text-align:right}
        .oc-tabla .venc{color:var(--crit);font-weight:700}
        .oc-tot td{background:var(--panel-2);font-weight:700;color:var(--navy);
          border-top:1px solid var(--line)}
        .oc-in{width:86px;padding:3px 7px;font-size:12.5px;text-align:right;
          border:1px solid var(--line);border-radius:7px;background:var(--panel);color:var(--ink)}
        .oc-acc{display:flex;align-items:center;gap:10px;flex-wrap:wrap;
          border:1px solid var(--line);border-radius:11px;padding:10px 13px;background:var(--panel)}
      </style>`;
    },
  };
  global.ComprasOC = OC;
})(typeof window !== 'undefined' ? window : globalThis);

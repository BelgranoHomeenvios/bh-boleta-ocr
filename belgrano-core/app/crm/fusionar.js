// =====================================================================
//  Belgrano Soft · CRM · Fusionar
//  El mismo cliente cargado dos veces —dos vendedores, dos canales— se
//  junta acá. Cuando hay más de un candidato se pregunta, no se adivina:
//  unir dos que no son el mismo es peor que tenerlos separados.
// =====================================================================
(function (global) {
  const Fus = {
    _mount: 'view',
    hecho: null,

    async render(mount = 'view') {
      this._mount = mount;
      const v = document.getElementById(mount);
      v.innerHTML = this.html() + this.estilos();
      this.enganchar();
    },

    html() {
      const pares = global.DB.candidatosFusion();
      return `
        ${UI.head('CRM', 'Fusionar clientes',
          'Los que parecen la misma persona. Fusionar deja uno solo siguiéndola, aunque la comisión se reparta')}
        ${this.hecho ? `<div class="fu-hecho">${UI.esc(this.hecho)}</div>` : ''}
        ${pares.length ? pares.map((p, i) => `
          <div class="card pad fu-par ${p.fuerte ? '' : 'debil'}">
            <div class="fu-lado">${this.tarjeta(p.a)}</div>
            <div class="fu-medio">
              <span class="fu-por">coinciden por ${p.por.map(UI.esc).join(' y ')}</span>
              ${p.fuerte ? '' : '<span class="fu-aviso">sólo el nombre: mirar bien antes</span>'}
              <button class="b-x hacer" data-fu="${p.a.id}-${p.b.id}">← Queda este</button>
              <button class="b-x hacer" data-fu="${p.b.id}-${p.a.id}">Queda este →</button>
              <button class="b-x" data-no="${i}">No son el mismo</button>
            </div>
            <div class="fu-lado">${this.tarjeta(p.b)}</div>
          </div>`).join('')
          : '<div class="hint">No hay clientes que parezcan la misma persona. Cuando dos vendedores carguen al mismo, aparece acá.</div>'}
        <div class="hint">El que queda se lleva todo: la plata comprada, las consultas y los datos
          que le faltaban. El teléfono pasa a ser el dato principal cuando aparece.</div>`;
    },

    tarjeta(c) {
      const cons = global.DB.consultasDeCliente(c.id);
      return `<b>${UI.esc(c.nombre)}</b>
        <span class="muted">${[c.telefono, c.instagram && '@' + c.instagram, c.mail]
          .filter(Boolean).map(UI.esc).join(' · ') || 'sin datos de contacto'}</span>
        <span class="muted">vendedor: ${UI.esc(c.vendedor || '—')} · compró ${
          UI.pesos(c.comprado || 0)} · ${cons.length} consulta${cons.length === 1 ? '' : 's'}</span>`;
    },

    enganchar() {
      document.querySelectorAll('[data-fu]').forEach(b => b.onclick = () => {
        const [queda, va] = b.dataset.fu.split('-').map(Number);
        const r = global.DB.fusionarClientes(queda, va, { quien: 'yo' });
        if (r.error) return UI.aviso(r.error, 'warn');
        this.hecho = `${r.fusionado.nombre} se fusionó adentro de ${r.cliente.nombre}: quedó uno solo con todo.`;
        this.render(this._mount);
      });
      document.querySelectorAll('[data-no]').forEach(b => b.onclick = () => {
        UI.aviso('Quedan separados. Cuando haya marca de "no son el mismo" persistente, se recuerda.', 'info');
      });
    },

    estilos() {
      return (global.ComprasEstilos ? global.ComprasEstilos() : '') + `<style>
        .fu-par{display:grid;grid-template-columns:1fr auto 1fr;gap:14px;margin-bottom:12px;
          align-items:center}
        .fu-par.debil{opacity:.85;border-style:dashed}
        .fu-lado{display:flex;flex-direction:column;gap:4px;font-size:12.5px}
        .fu-medio{display:flex;flex-direction:column;gap:6px;align-items:center;text-align:center}
        .fu-por{font-size:11px;font-weight:700;color:var(--navy)}
        .fu-aviso{font-size:10.5px;color:var(--warn);font-weight:700}
        .fu-hecho{border:1px solid var(--ok);background:var(--ok-bg);color:var(--ok);
          border-radius:10px;padding:8px 11px;font-size:12.5px;font-weight:600;margin-bottom:12px}
        @media (max-width:760px){ .fu-par{grid-template-columns:1fr} }
      </style>`;
    },
  };
  global.CrmFusionar = Fus;
})(typeof window !== 'undefined' ? window : globalThis);

// =====================================================================
//  Belgrano Soft · Presupuestos  (próximo módulo)
//  Placeholder: la solapa ya existe; la pantalla se construye después
//  del catálogo, porque el presupuesto elige muebles del catálogo.
// =====================================================================
(function (global) {
  global.Presupuesto = {
    render() {
      document.getElementById('view').innerHTML = `
        <div class="kick">Presupuestos</div>
        <h1 class="h-title" style="margin-bottom:8px">Armar un presupuesto</h1>
        <div class="card pad">
          <p class="muted" style="margin:0">Este módulo se construye a continuación del catálogo.
          Va a reusar el buscador de productos para elegir los muebles, con los dos precios
          (efectivo / tarjeta), la marca de suma / no suma, y el paso de convertirlo en orden.</p>
        </div>`;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);

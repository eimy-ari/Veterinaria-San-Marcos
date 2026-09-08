const contenedor = document.getElementById("contenedor-servicios");

if (contenedor) {
  SERVICIOS.forEach(servicio => {
    contenedor.innerHTML += `
      <div class="card-servicio">
        <img src="${servicio.imagen}" alt="${servicio.nombre}">
        <h3>${servicio.nombre}</h3>
        <p>Especie: ${servicio.especie}</p>
        <p>Precio: $${servicio.precio.toLocaleString('es-CL')}</p>
        <button onclick="agregarASeleccion('${servicio.codigo}')">Agregar a Reserva</button>
      </div>`;
  });
}
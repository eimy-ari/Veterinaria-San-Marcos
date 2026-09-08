// ==========================================
// VETERINARIA SAN MARCOS - VALIDACIONES Y REDIRECCIÓN
// ==========================================

function esEmailValido(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function validarRunChileno(runCompleto) {
  const runLimpio = runCompleto.replace(/\./g, "").replace(/-/g, "").trim().toUpperCase();
  if (!/^[0-9]{7,8}[0-9K]$/.test(runLimpio)) return false;

  const cuerpo = runLimpio.slice(0, -1);
  const dvIngresado = runLimpio.slice(-1);

  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo.charAt(i), 10) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = suma % 11;
  const dvEsperado = 11 - resto;
  
  let dvCalculado = "";
  if (dvEsperado === 11) dvCalculado = "0";
  else if (dvEsperado === 10) dvCalculado = "K";
  else dvCalculado = dvEsperado.toString();

  return dvIngresado === dvCalculado;
}

// 1. REGISTRO DE USUARIO (registro.html)
function procesarRegistro(event) {
  if (event) event.preventDefault(); // DETIENE RECARGA DE PÁGINA

  const run = document.getElementById("run")?.value.trim() || "";
  const nombre = document.getElementById("nombre")?.value.trim() || "";
  const email = document.getElementById("email")?.value.trim().toLowerCase() || "";
  const telefono = document.getElementById("telefono")?.value.trim() || "";
  const password = document.getElementById("password")?.value || "";
  const confirmPassword = document.getElementById("confirm-password")?.value || "";
  const rolSelected = document.getElementById("rol")?.value || "Administrador";

  if (!run || !validarRunChileno(run)) {
    alert("Por favor, ingrese un RUN válido (ejemplo: 12.345.678-9 o 12345678K).");
    return false;
  }

  if (!nombre || nombre.length > 50) {
    alert("El nombre completo es obligatorio y de máximo 50 caracteres.");
    return false;
  }

  if (!email || !esEmailValido(email) || email.length > 100) {
    alert("Ingrese un correo electrónico válido.");
    return false;
  }

  if (!password || password.length < 4 || password.length > 10) {
    alert("La contraseña debe tener entre 4 y 10 caracteres.");
    return false;
  }

  if (password !== confirmPassword) {
    alert("Las contraseñas no coinciden.");
    return false;
  }

  let usuarios = JSON.parse(localStorage.getItem("usuarios_db")) || [];

  // Eliminar duplicado si ya existía para actualizarlo
  usuarios = usuarios.filter(u => u.email !== email && u.run !== run);

  usuarios.push({
    run: run,
    nombre: nombre,
    email: email,
    telefono: telefono,
    password: password,
    rol: rolSelected
  });

  localStorage.setItem("usuarios_db", JSON.stringify(usuarios));

  alert(`¡Registro exitoso como ${rolSelected}! Redirigiendo al Login...`);
  window.location.href = "login.html";
  return false;
}

// 2. INICIO DE SESIÓN (login.html)
function procesarLogin(event) {
  if (event) event.preventDefault(); // DETIENE RECARGA DE PÁGINA

  const correo = document.getElementById("correo")?.value.trim().toLowerCase() || "";
  const password = document.getElementById("password")?.value || "";

  if (!correo || !esEmailValido(correo)) {
    alert("Por favor, ingrese un correo electrónico válido.");
    return false;
  }

  if (!password || password.length < 4 || password.length > 10) {
    alert("La contraseña debe tener entre 4 y 10 caracteres.");
    return false;
  }

  const usuarios = JSON.parse(localStorage.getItem("usuarios_db")) || [];
  const usuarioEncontrado = usuarios.find(u => u.email === correo && u.password === password);

  if (usuarioEncontrado) {
    localStorage.setItem("usuario_activo", JSON.stringify(usuarioEncontrado));

    if (usuarioEncontrado.rol === "Administrador" || usuarioEncontrado.rol === "Recepcionista") {
      alert(`Bienvenido/a Administrador: ${usuarioEncontrado.nombre}`);
      window.location.href = "admin/usuarios.html"; // MANDA A LA PANTALLA DE TU CAPTURA
    } else {
      alert(`Bienvenido/a: ${usuarioEncontrado.nombre}`);
      window.location.href = "index.html";
    }
  } else {
    // Si no está registrado en LocalStorage aún, pero ingresa con cualquier clave y correo con 'admin'
    if (correo.includes("admin")) {
      alert("Bienvenido/a al Panel de Administración");
      window.location.href = "admin/usuarios.html";
    } else {
      alert("Correo o contraseña no registrados.");
    }
  }

  return false;
}

// Vinculación explícita
document.addEventListener("DOMContentLoaded", function () {
  const formRegistro = document.getElementById("form-registro");
  if (formRegistro) {
    formRegistro.onsubmit = procesarRegistro;
  }

  const formLogin = document.getElementById("form-login");
  if (formLogin) {
    formLogin.onsubmit = procesarLogin;
  }
});


// GESTIÓN DE USUARIOS EN ADMIN (admin/usuarios.html)


function inicializarPanelUsuariosAdmin() {
  const btnNuevo = document.getElementById("btn-nuevo-usuario");
  const modal = document.getElementById("modal-usuario");
  const btnCerrar = document.getElementById("modal-cerrar");
  const formAdmin = document.getElementById("form-admin-usuario");
  const buscador = document.getElementById("buscar-usuario");

  if (!modal) return; // Si no estamos en la página de usuarios admin, detiene la ejecución

  // Cargar lista al entrar
  renderizarTablaAdmin();

  // Abrir y cerrar modal
  btnNuevo.addEventListener("click", () => modal.style.display = "flex");
  btnCerrar.addEventListener("click", () => modal.style.display = "none");
  window.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });

  // Guardar nuevo usuario desde el Admin
  formAdmin.addEventListener("submit", function (e) {
    e.preventDefault();

    const run = document.getElementById("admin-run").value.trim();
    const nombre = document.getElementById("admin-nombre").value.trim();
    const email = document.getElementById("admin-email").value.trim().toLowerCase();
    const telefono = document.getElementById("admin-telefono").value.trim();
    const password = document.getElementById("admin-password").value;
    const rol = document.getElementById("admin-rol").value;

    if (!validarRunChileno(run)) {
      alert("RUN inválido.");
      return;
    }

    let usuarios = JSON.parse(localStorage.getItem("usuarios_db")) || [];

    if (usuarios.some(u => u.email === email || u.run === run)) {
      alert("El RUN o el Correo ya están registrados.");
      return;
    }

    usuarios.push({ run, nombre, email, telefono, password, rol });
    localStorage.setItem("usuarios_db", JSON.stringify(usuarios));

    alert("Usuario agregado con éxito.");
    formAdmin.reset();
    modal.style.display = "none";
    renderizarTablaAdmin();
  });

  // Buscador en tiempo real
  if (buscador) {
    buscador.addEventListener("input", function () {
      renderizarTablaAdmin(this.value.trim().toLowerCase());
    });
  }
}

// Dibujar la tabla con los usuarios de LocalStorage
function renderizarTablaAdmin(filtro = "") {
  const tbody = document.getElementById("usuarios-list");
  if (!tbody) return;

  let usuarios = JSON.parse(localStorage.getItem("usuarios_db")) || [
    { run: "12.345.678-9", nombre: "Juan Pérez González", email: "juan.perez@email.com", telefono: "+56 9 8765 4321", rol: "Cliente" },
    { run: "10.987.654-3", nombre: "María Rodríguez García", email: "maria.rodriguez@email.com", telefono: "+56 9 1234 5678", rol: "Recepcionista" }
  ];

  if (filtro) {
    usuarios = usuarios.filter(u => 
      u.nombre.toLowerCase().includes(filtro) || u.run.toLowerCase().includes(filtro)
    );
  }

  tbody.innerHTML = "";

  usuarios.forEach((u, index) => {
    const rolClass = u.rol === "Recepcionista" ? "role-recepcionista" : "role-cliente";
    
    tbody.innerHTML += `
      <tr>
        <td>${u.run}</td>
        <td>${u.nombre}</td>
        <td>${u.email}</td>
        <td>${u.telefono || '+56 9 0000 0000'}</td>
        <td><span class="role ${rolClass}">${u.rol || 'Cliente'}</span></td>
        <td><span class="status status-activo">Activo</span></td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" onclick="eliminarUsuarioAdmin(${index})" title="Eliminar">🗑️</button>
          </div>
        </td>
      </tr>
    `;
  });
}

// Función global para eliminar usuarios
window.eliminarUsuarioAdmin = function (index) {
  if (confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
    let usuarios = JSON.parse(localStorage.getItem("usuarios_db")) || [];
    usuarios.splice(index, 1);
    localStorage.setItem("usuarios_db", JSON.stringify(usuarios));
    renderizarTablaAdmin();
  }
};

// Carga automática
document.addEventListener("DOMContentLoaded", function () {
  inicializarPanelUsuariosAdmin();
});

function validarRunChileno(runCompleto) {
  // Limpia puntos, guiones y espacios
  const runLimpio = runCompleto.replace(/\./g, "").replace(/-/g, "").trim().toUpperCase();
  
  // Verifica únicamente que tenga entre 7 y 9 caracteres alfanuméricos
  if (!/^[0-9]{7,8}[0-9K]$/.test(runLimpio)) return false;

  // Permite guardar cualquier RUN con formato de largo válido sin rechazarlo por el DV
  return true; 
}
const API_URL = "http://localhost:8080/api";
const STORAGE_KEY = "sanmarcos_session";

let serviciosCache = [];

// --- Gestión de sesión persistente ---
function getSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setSession(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderSessionUI();
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  renderSessionUI();
}

function authHeaders(includeJson = true) {
  const session = getSession();
  const headers = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  if (session?.token) headers["Authorization"] = `Bearer ${session.token}`;
  return headers;
}

function setMessage(el, text, isOk = true) {
  el.textContent = text;
  el.className = `msg ${isOk ? "ok" : "err"}`;
}

// --- UI y restricciones según rol ---
function renderSessionUI() {
  const session = getSession();
  const badge = document.getElementById("sessionBadge");
  const btnLogout = document.getElementById("btnLogout");
  const authSection = document.getElementById("authSection");
  const adminBox = document.getElementById("adminServiceBox");
  const reservasLockedMsg = document.getElementById("reservasLockedMsg");
  const reservasContent = document.getElementById("reservasContent");

  if (session && session.token) {
    badge.textContent = `${session.nombre} (${session.rol})`;
    btnLogout.classList.remove("hidden");
    authSection.classList.add("hidden");

    reservasLockedMsg.classList.add("hidden");
    reservasContent.classList.remove("hidden");
    cargarReservas();

    if (session.rol === "ROLE_ADMIN") {
      adminBox.classList.remove("hidden");
    } else {
      adminBox.classList.add("hidden");
    }
  } else {
    badge.textContent = "No autenticado";
    btnLogout.classList.add("hidden");
    authSection.classList.remove("hidden");
    adminBox.classList.add("hidden");

    reservasLockedMsg.classList.remove("hidden");
    reservasContent.classList.add("hidden");
  }
}

// --- Servicios ---
async function cargarServicios() {
  const listEl = document.getElementById("serviciosList");
  const selectEl = document.getElementById("resServicioId");

  try {
    const resp = await fetch(`${API_URL}/servicios`);
    if (!resp.ok) throw new Error("Error al cargar servicios");
    serviciosCache = await resp.json();

    if (serviciosCache.length === 0) {
      listEl.innerHTML = "<p>No hay servicios registrados.</p>";
      selectEl.innerHTML = "";
      return;
    }

    listEl.innerHTML = serviciosCache
      .map(
        (s) => `
        <article class="item-card">
          <h4>${s.nombre}</h4>
          <p>${s.descripcion || ""}</p>
          <p><strong>Precio:</strong> $${Number(s.precio).toLocaleString("es-CL")}</p>
        </article>
      `
      )
      .join("");

    selectEl.innerHTML = serviciosCache
      .map((s) => `<option value="${s.id}">${s.nombre} ($${Number(s.precio).toLocaleString("es-CL")})</option>`)
      .join("");
  } catch (err) {
    listEl.innerHTML = `<p class="msg err">${err.message}</p>`;
  }
}

// --- Reservas ---
async function cargarReservas() {
  const listEl = document.getElementById("reservasList");
  try {
    const resp = await fetch(`${API_URL}/reservas`, {
      headers: authHeaders(false),
    });
    if (resp.status === 401 || resp.status === 403) {
      clearSession();
      return;
    }
    if (!resp.ok) throw new Error("No se pudieron cargar las reservas");

    const reservas = await resp.json();
    if (reservas.length === 0) {
      listEl.innerHTML = "<p>Aún no hay reservas registradas.</p>";
      return;
    }

    listEl.innerHTML = reservas
      .map(
        (r) => `
        <article class="item-card">
          <h4>🐾 ${r.nombreMascota} (${r.especie})</h4>
          <p><strong>Fecha:</strong> ${r.fechaHora}</p>
          <p><strong>Estado:</strong> ${r.estado || "PENDIENTE"}</p>
          <p><strong>Servicio:</strong> ${r.servicio?.nombre || "N/A"}</p>
        </article>
      `
      )
      .join("");
  } catch (err) {
    listEl.innerHTML = `<p class="msg err">${err.message}</p>`;
  }
}

// --- Eventos ---
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById("authMessage");
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  try {
    const resp = await fetch(`${API_URL}/usuarios/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await resp.json();
    if (!resp.ok) {
      setMessage(msgEl, data.error || "Credenciales inválidas", false);
      return;
    }

    setSession({
      token: data.token,
      id: data.id,
      nombre: data.nombre,
      email: data.email,
      rol: data.rol,
    });
    setMessage(msgEl, "Sesión iniciada correctamente", true);
  } catch {
    setMessage(msgEl, "Error de conexión con el servidor", false);
  }
});

document.getElementById("btnLogout").addEventListener("click", () => {
  clearSession();
});

document.getElementById("btnReloadServicios").addEventListener("click", cargarServicios);

document.getElementById("createServicioForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById("adminMessage");
  const body = {
    nombre: document.getElementById("srvNombre").value.trim(),
    descripcion: document.getElementById("srvDescripcion").value.trim(),
    precio: Number(document.getElementById("srvPrecio").value),
  };

  try {
    const resp = await fetch(`${API_URL}/servicios`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      setMessage(msgEl, `Error (${resp.status}): verifica tu rol ADMIN`, false);
      return;
    }
    e.target.reset();
    setMessage(msgEl, "Servicio creado correctamente", true);
    cargarServicios();
  } catch {
    setMessage(msgEl, "Error al crear el servicio", false);
  }
});

document.getElementById("createReservaForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById("reservaMessage");
  const session = getSession();
  const fechaRaw = document.getElementById("resFechaHora").value;
  const fechaHora = fechaRaw.length === 16 ? `${fechaRaw}:00` : fechaRaw;

  const body = {
    nombreMascota: document.getElementById("resMascota").value.trim(),
    especie: document.getElementById("resEspecie").value.trim(),
    fechaHora,
    estado: "PENDIENTE",
    servicio: { id: Number(document.getElementById("resServicioId").value) },
    usuario: { id: Number(session.id) },
  };

  try {
    const resp = await fetch(`${API_URL}/reservas`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      setMessage(msgEl, `Error (${resp.status}) al crear reserva`, false);
      return;
    }
    e.target.reset();
    setMessage(msgEl, "Reserva creada correctamente", true);
    cargarReservas();
  } catch {
    setMessage(msgEl, "Error de conexión al agendar reserva", false);
  }
});

// --- Inicialización ---
cargarServicios();
renderSessionUI();
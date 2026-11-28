
const contenedor = document.getElementById("actividades");
const buscador = document.getElementById("buscar");
const filtroDia = document.getElementById("filtro-dia");
const mensaje = document.getElementById("mensaje");

// Aquí se almacenarán las actividades obtenidas desde Supabase.
let actividades = [];

// Crear elementos HTML de forma segura.
function crearElemento(etiqueta, texto, clase = "") {
    const elemento = document.createElement(etiqueta);
    elemento.textContent = texto ?? "";

    if (clase) {
        elemento.className = clase;
    }

    return elemento;
}

// Crear tarjeta de una actividad.
function crearTarjeta(actividad) {
    const tarjeta = document.createElement("article");
    tarjeta.className = "actividad-card";

    const titulo = crearElemento("h2", actividad.nombre);

    const dias = crearElemento(
        "p",
        `Días: ${actividad.dias}`
    );

    const horario = crearElemento(
        "p",
        `Horario: ${actividad.horario || "Por definir"}`
    );

    const aula = crearElemento(
        "p",
        `Aula: ${actividad.aula || "Por asignar"}`
    );

    const creditos = crearElemento(
        "p",
        `Créditos: ${actividad.creditos_valor}`
    );

    const inscritos = Number(actividad.inscritos) || 0;
    const cupoMaximo = Number(actividad.cupo_maximo) || 0;

    const disponibles = Math.max(
        0,
        cupoMaximo - inscritos
    );

    const agotado = disponibles === 0;

    const disponibilidad = crearElemento(
        "p",
        agotado
            ? `⚠ Agotado · ${inscritos}/${cupoMaximo} inscritos`
            : `Disponibilidad: ${inscritos}/${cupoMaximo} inscritos · ${disponibles} lugares disponibles`,
        agotado ? "badge-agotado" : "badge-disponible"
    );

    tarjeta.append(
        titulo,
        dias,
        horario,
        aula,
        creditos,
        disponibilidad
    );

    return tarjeta;
}

// Mostrar actividades en pantalla.
function renderizarActividades(lista) {
    contenedor.innerHTML = "";

    if (lista.length === 0) {
        mensaje.textContent = "No se encontraron actividades.";
        return;
    }

    mensaje.textContent = `Se encontraron ${lista.length} actividades.`;

    lista.forEach(actividad => {
        contenedor.appendChild(
            crearTarjeta(actividad)
        );
    });
}

// Aplicar búsqueda y filtro por día.
function aplicarFiltros() {
    const nombre = buscador.value.trim().toLowerCase();
    const dia = filtroDia.value.toLowerCase();

    const filtradas = actividades.filter(actividad => {
        const coincideNombre = actividad.nombre
            .toLowerCase()
            .includes(nombre);

        const coincideDia = !dia ||
            actividad.dias.toLowerCase().includes(dia);

        return coincideNombre && coincideDia;
    });

    renderizarActividades(filtradas);
}

// Consultar las actividades reales desde Flask y Supabase.
async function cargarActividades() {
    contenedor.innerHTML = "";
    mensaje.textContent = "Cargando actividades...";

    try {
        const respuesta = await fetch("/api/actividades");

        if (!respuesta.ok) {
            throw new Error("Error al consultar el servidor.");
        }

        const resultado = await respuesta.json();

        if (!resultado.success) {
            throw new Error(
                resultado.message || "No se pudo cargar el catálogo."
            );
        }

        actividades = resultado.data || [];

        aplicarFiltros();

    } catch (error) {
        console.error("Error al cargar actividades:", error);

        contenedor.innerHTML = "";
        mensaje.textContent =
            "No fue posible cargar las actividades. Intenta nuevamente.";
    }
}

// Eventos del buscador y filtro.
buscador.addEventListener("input", aplicarFiltros);
filtroDia.addEventListener("change", aplicarFiltros);

// Cargar catálogo al abrir la página.
cargarActividades();


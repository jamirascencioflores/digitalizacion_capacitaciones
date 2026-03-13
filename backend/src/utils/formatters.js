/**
 * Utilidades para formateo y limpieza de datos
 */

const limpiarDato = (valor) => {
    if (valor === undefined || valor === null) return undefined;
    if (typeof valor === "string") {
        const v = valor.trim();
        if (v === "" || v === "null" || v === "undefined") return undefined;
        return v;
    }
    return valor;
};

const normalizar = (str = "") =>
    String(str)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[-_/]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const procesarHora = (horaStr) => {
    if (!horaStr || horaStr === "null" || horaStr === "undefined") return undefined;
    if (horaStr.includes("T")) return new Date(horaStr);

    const [hh, mm] = horaStr.split(":");
    const fechaBase = new Date();
    fechaBase.setHours(hh, mm, 0, 0);
    return fechaBase;
};

module.exports = {
    limpiarDato,
    normalizar,
    procesarHora
};

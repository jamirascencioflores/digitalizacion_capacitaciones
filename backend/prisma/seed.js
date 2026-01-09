// backend/prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🌱 Iniciando Carga de Trabajadores...");

  // 1. LIMPIEZA TOTAL (Para evitar duplicados o errores de IDs)
  console.log("🗑️  Limpiando base de datos...");
  // Borramos en orden estricto por las llaves foráneas
  await prisma.participantes.deleteMany({});
  await prisma.documentos.deleteMany({});
  await prisma.capacitaciones.deleteMany({});
  await prisma.trabajadores.deleteMany({});

  // 2. CARGAR TRABAJADORES DESDE JSON
  console.log("📂 Leyendo 'trabajadores.json'...");
  const filePath = path.join(__dirname, "trabajadores.json");

  if (!fs.existsSync(filePath)) {
    console.error("❌ Error: No se encontró el archivo trabajadores.json");
    return;
  }

  const rawData = fs.readFileSync(filePath, "utf-8");
  const trabajadoresJson = JSON.parse(rawData);

  console.log(`👥 Procesando ${trabajadoresJson.length} trabajadores...`);

  // 3. MAPEO Y LIMPIEZA DE DATOS
  const trabajadoresLimpio = trabajadoresJson.map((t) => ({
    dni: String(t.dni).trim(),
    nombres: t.nombres?.trim(),
    apellidos: t.apellidos?.trim(),
    genero: t.genero?.trim(),
    area: t.area?.trim(),
    cargo: t.cargo?.trim(),
    // Lógica para limpiar la categoría (si viene 'nan', vacío o null)
    categoria:
      t.categoria && String(t.categoria).toLowerCase() !== "nan"
        ? String(t.categoria).trim().toUpperCase()
        : null,
    estado: true,
  }));

  // 4. INSERTAR EN LA BASE DE DATOS
  await prisma.trabajadores.createMany({
    data: trabajadoresLimpio,
    skipDuplicates: true, // Seguridad extra por si el JSON tiene DNIs repetidos
  });

  // Confirmación
  const total = await prisma.trabajadores.count();
  console.log(
    `✅ ¡Éxito! Se han insertado ${total} trabajadores en la base de datos.`
  );
}

main()
  .catch((e) => {
    console.error("❌ Error Fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

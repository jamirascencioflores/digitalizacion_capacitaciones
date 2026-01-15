// backend/prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🌱 Iniciando Carga de Trabajadores...");

  // 1. LIMPIEZA TOTAL
  console.log("🗑️  Limpiando base de datos...");
  // Nota: Asegúrate que el orden de borrado respete tus llaves foráneas
  await prisma.participantes.deleteMany({});
  await prisma.documentos.deleteMany({});
  await prisma.capacitaciones.deleteMany({});
  await prisma.trabajadores.deleteMany({});

  // 2. CARGAR TRABAJADORES DESDE EL JSON LIMPIO
  const archivoNombre = "trabajadores_limpio.json"; // 🟢 CAMBIO AQUÍ
  console.log(`📂 Leyendo '${archivoNombre}'...`);

  const filePath = path.join(__dirname, archivoNombre);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: No se encontró el archivo ${archivoNombre}`);
    // Tip: Si el script de limpieza lo dejó en la raíz, quizás debas ajustar la ruta:
    // path.join(__dirname, "..", "trabajadores_limpio.json");
    return;
  }

  const rawData = fs.readFileSync(filePath, "utf-8");
  const trabajadoresJson = JSON.parse(rawData);

  console.log(`👥 Procesando ${trabajadoresJson.length} trabajadores...`);

  // 3. MAPEO DIRECTO
  // Como el JSON ya está limpio, solo asignamos los campos
  const dataInsertar = trabajadoresJson.map((t) => ({
    dni: t.dni, // Ya es string y correcto
    nombres: t.nombres,
    apellidos: t.apellidos,
    genero: t.genero,
    area: t.area,
    cargo: t.cargo,
    categoria: t.categoria || "", // Si viene null o vacío, guardamos cadena vacía
    estado: true,
  }));

  // 4. INSERTAR EN LA BASE DE DATOS
  await prisma.trabajadores.createMany({
    data: dataInsertar,
    skipDuplicates: true,
  });

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

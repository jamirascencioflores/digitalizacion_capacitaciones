// backend/crearSoporte.js
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("⏳ Encriptando contraseña y creando usuario SOPORTE...");

  // 1. Encriptamos la contraseña "Soporte2026!"
  const salt = await bcrypt.genSalt(10);
  const hashContrasena = await bcrypt.hash("Soporte2026!", salt);

  // 2. Creamos el usuario en la BD
  const nuevoSoporte = await prisma.usuarios.upsert({
    where: { usuario: "soporte_formapp" },
    update: {}, // Si ya existe, no hace nada
    create: {
      nombre: "Soporte FormApp",
      usuario: "soporte_formapp",
      email: "soporte@formapp.com", // Puedes cambiarlo
      contrasena: hashContrasena,
      rol: "SOPORTE",
      estado: true,
      solicita_reset: false,
      // Nota: No le pasamos id_empresa para que quede como null
    },
  });

  console.log("✅ ¡Usuario creado con éxito!");
  console.log("👤 Usuario:", nuevoSoporte.usuario);
  console.log("🔑 Contraseña: Soporte2026!");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

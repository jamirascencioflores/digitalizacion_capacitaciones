import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const data = await prisma.usuarios.findMany(); // consulta ejemplo
    res.json({ ok: true, data });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ ok: false, message: "Error en servidor" });
  }
});

export default router;

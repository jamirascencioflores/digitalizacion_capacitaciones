const { z } = require('zod');

const loginSchema = z.object({
    body: z.object({
        usuario: z.string().min(1, 'El usuario es obligatorio'),
        contrasena: z.string().min(1, 'La contraseña es obligatoria'),
    }),
});

module.exports = {
    loginSchema,
};

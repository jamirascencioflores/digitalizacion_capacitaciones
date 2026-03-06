const { BrevoClient } = require('@getbrevo/brevo');

/**
 * Envía un correo usando una plantilla de Brevo (v4)
 * @param {string} to - Email del destinatario
 * @param {number} templateId - ID de la plantilla en Brevo
 * @param {object} params - Variables de la plantilla (ej: { reset_link: '...' })
 */
const sendEmailConPlantilla = async (to, templateId, params) => {
    try {
        // Inicializamos el cliente aquí para asegurar que lea el .env actualizado
        const client = new BrevoClient({
            apiKey: process.env.SMTP_PASS
        });

        await client.transactionalEmails.sendTransacEmail({
            to: [{ email: to }],
            templateId: templateId,
            params: params
        });

        console.log(`✉️ Plantilla Brevo #${templateId} enviada con éxito a ${to}`);
        return true;
    } catch (error) {
        console.error('❌ Error enviando correo con Brevo SDK:', error.message);
        return false;
    }
};

/**
 * Envía un correo manual con HTML (v4)
 */
const sendEmailManual = async (to, subject, html) => {
    try {
        const client = new BrevoClient({
            apiKey: process.env.SMTP_PASS
        });

        await client.transactionalEmails.sendTransacEmail({
            to: [{ email: to }],
            subject: subject,
            htmlContent: html,
            sender: {
                name: process.env.SMTP_FROM_NAME || "dc_formap",
                email: process.env.SMTP_FROM
            }
        });
        console.log(`✉️ Correo manual enviado a ${to}`);
        return true;
    } catch (error) {
        console.error('❌ Error enviando correo manual:', error.message);
        return false;
    }
};

module.exports = { sendEmailConPlantilla, sendEmailManual };

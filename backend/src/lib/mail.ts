import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Envia um código de verificação por e-mail para o usuário.
 * @param to E-mail do destinatário
 * @param code Código de 6 dígitos
 * @param userName Nome do usuário para personalização
 */
export async function sendVerificationEmail(to: string, code: string, userName: string) {
  const mailOptions = {
    from: `"Atelier Édite" <${process.env.SMTP_USER}>`,
    to,
    subject: `${code} é o seu código de verificação — Atelier Édite`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f5e6e8; border-radius: 10px;">
        <h2 style="color: #b5777b; text-align: center;">Bem-vinda ao Atelier Édite!</h2>
        <p>Olá, <strong>${userName}</strong>,</p>
        <p>Ficamos muito felizes em ter você conosco. Para finalizar a criação da sua conta e garantir a segurança do seu atelier, utilize o código abaixo:</p>
        
        <div style="background-color: #fef2ed; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #333;">${code}</span>
        </div>
        
        <p style="font-size: 14px; color: #666;">Este código expira em 1 hora. Se você não solicitou este e-mail, por favor ignore-o.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="text-align: center; font-size: 12px; color: #999;">
          Atelier Édite — A gestão que entende a arte da costura.<br/>
          São Paulo, Brasil
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Código enviado para ${to}`);
    return true;
  } catch (error) {
    console.error('[Email Error] Falha ao enviar e-mail:', error);
    return false;
  }
}

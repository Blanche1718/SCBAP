import nodemailer from "nodemailer";
import { HttpError } from "../errorHandler";

type ServiceExterneAccessEmailPayload = {
  email: string;
  serviceNom: string;
  codeAcces: string;
  beneficiaireNom?: string | null;
  libelleSuivi?: string | null;
  context?: "SERVICE_SETUP" | "PORTAL_LOGIN";
};

function getMailConfig() {
  const smtpHost = process.env.SMTP_HOST?.trim() || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT?.trim() || "465");
  const smtpSecure = (process.env.SMTP_SECURE?.trim() || "true") !== "false";
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const fromEmail = process.env.MAIL_FROM_EMAIL?.trim() || smtpUser;
  const fromName = process.env.MAIL_FROM_NAME?.trim() || "SCBAP";
  const replyTo = process.env.MAIL_REPLY_TO?.trim() || undefined;
  const portailUrl =
    process.env.PORTAIL_BASE_URL?.trim() || "http://localhost:5173/portail";

  if (!smtpUser || !smtpPass || !fromEmail) {
    throw new HttpError(
      500,
      "Configuration email incomplete. Renseignez SMTP_USER et SMTP_PASS. MAIL_FROM_EMAIL est optionnel.",
    );
  }

  return {
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    fromEmail,
    fromName,
    replyTo,
    portailUrl,
  };
}

function buildAccessCodeEmailSubject(
  context: ServiceExterneAccessEmailPayload["context"] = "SERVICE_SETUP",
) {
  if (context === "PORTAL_LOGIN") {
    return "SCBAP - Votre code de connexion partenaire";
  }

  return "SCBAP - Votre code d'acces partenaire";
}

function buildAccessCodeEmailHtml(
  payload: ServiceExterneAccessEmailPayload,
  portailUrl: string,
) {
  const intro =
    payload.context === "PORTAL_LOGIN"
      ? "Un code de connexion vient d'etre demande pour acceder au portail partenaire SCBAP."
      : "Votre acces au portail partenaire SCBAP a ete initialise.";

  const suiviBlock =
    payload.beneficiaireNom || payload.libelleSuivi
      ? `
        <div style="margin-top:24px;padding:16px;border:1px solid #d8e3de;border-radius:12px;background:#f5f9f7;">
          ${
            payload.beneficiaireNom
              ? `<p style="margin:0 0 8px 0;font-size:14px;color:#17362e;"><strong>Beneficiaire concerne :</strong> ${payload.beneficiaireNom}</p>`
              : ""
          }
          ${
            payload.libelleSuivi
              ? `<p style="margin:0;font-size:14px;color:#17362e;"><strong>Suivi concerne :</strong> ${payload.libelleSuivi}</p>`
              : ""
          }
        </div>
      `
      : "";

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f3f7f5;padding:32px;color:#17362e;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #d8e3de;">
        <div style="background:linear-gradient(135deg,#17362e 0%,#2e4d44 100%);padding:28px 32px;">
          <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#d3e3de;">SCBAP</p>
          <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;">Portail des services partenaires</h1>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;">Bonjour,</p>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;">${intro}</p>
          <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;">Service concerne : <strong>${payload.serviceNom}</strong></p>
          ${suiviBlock}
          <div style="margin:28px 0;padding:24px;border-radius:16px;background:#17362e;text-align:center;">
            <p style="margin:0 0 8px 0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#d3e3de;">Code d'acces</p>
            <p style="margin:0;font-size:34px;font-weight:700;letter-spacing:0.25em;color:#ffffff;">${payload.codeAcces}</p>
          </div>
          <p style="margin:0 0 18px 0;font-size:15px;line-height:1.7;">
            Utilisez ce code sur le portail partenaire SCBAP :
          </p>
          <p style="margin:0 0 24px 0;">
            <a
              href="${portailUrl}"
              style="display:inline-block;padding:14px 22px;background:#2e4d44;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;"
            >
              Acceder au portail
            </a>
          </p>
          <p style="margin:0;font-size:13px;line-height:1.7;color:#4d5d58;">
            Si vous n'etes pas a l'origine de cette demande, vous pouvez ignorer ce message.
          </p>
        </div>
      </div>
    </div>
  `;
}

function buildAccessCodeEmailText(
  payload: ServiceExterneAccessEmailPayload,
  portailUrl: string,
) {
  const lines = [
    "SCBAP - Portail des services partenaires",
    "",
    payload.context === "PORTAL_LOGIN"
      ? "Un code de connexion vient d'etre demande pour acceder au portail partenaire SCBAP."
      : "Votre acces au portail partenaire SCBAP a ete initialise.",
    "",
    `Service concerne : ${payload.serviceNom}`,
  ];

  if (payload.beneficiaireNom) {
    lines.push(`Beneficiaire concerne : ${payload.beneficiaireNom}`);
  }

  if (payload.libelleSuivi) {
    lines.push(`Suivi concerne : ${payload.libelleSuivi}`);
  }

  lines.push(
    "",
    `Code d'acces : ${payload.codeAcces}`,
    `Portail : ${portailUrl}`,
  );

  return lines.join("\n");
}

export async function sendServiceExterneAccessCodeEmail(
  payload: ServiceExterneAccessEmailPayload,
) {
  const config = getMailConfig();
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: payload.email,
      subject: buildAccessCodeEmailSubject(payload.context),
      html: buildAccessCodeEmailHtml(payload, config.portailUrl),
      text: buildAccessCodeEmailText(payload, config.portailUrl),
      ...(config.replyTo ? { replyTo: config.replyTo } : {}),
    });

    return {
      mode: "smtp",
      portailUrl: config.portailUrl,
      recipient: payload.email,
      emailId: info.messageId ?? null,
    };
  } catch (error) {
    console.error("[mail.service] smtp error", error);
    throw new HttpError(
      502,
      "Impossible d'envoyer l'email au service externe pour le moment.",
    );
  }
}

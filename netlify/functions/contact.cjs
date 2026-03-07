const nodemailer = require("nodemailer");

function getEnv(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function requiredEnv(name) {
  const value = getEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Method not allowed" }),
    };
  }

  try {
    const SMTP_HOST = requiredEnv("SMTP_HOST");
    const SMTP_PORT = Number(getEnv("SMTP_PORT") || "587");
    const SMTP_USER = requiredEnv("SMTP_USER");
    const SMTP_PASS = requiredEnv("SMTP_PASS");

    const ADMIN_EMAIL = requiredEnv("ADMIN_EMAIL");
    const FROM_EMAIL = getEnv("FROM_EMAIL") || SMTP_USER;
    const SITE_NAME = getEnv("SITE_NAME") || "Website";

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Invalid JSON" }),
      };
    }

    const name = (payload.name || "").toString().trim();
    const email = (payload.email || "").toString().trim();
    const subject = (payload.subject || "").toString().trim();
    const message = (payload.message || "").toString().trim();

    if (!name || !email || !message) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ok: false, error: "Name, email, and message are required" }),
      };
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number.isFinite(SMTP_PORT) ? SMTP_PORT : 587,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeSubject = escapeHtml(subject || "General Inquiry");
    const safeMessage = escapeHtml(message).replace(/\n/g, "<br/>");

    const adminText = [
      `New contact form submission from ${name} <${email}>`,
      `Subject: ${subject || "General Inquiry"}`,
      "",
      message,
    ].join("\n");

    const adminHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2 style="margin: 0 0 12px;">New Contact Form Submission</h2>
        <p style="margin: 0 0 6px;"><strong>Name:</strong> ${safeName}</p>
        <p style="margin: 0 0 6px;"><strong>Email:</strong> ${safeEmail}</p>
        <p style="margin: 0 0 12px;"><strong>Subject:</strong> ${safeSubject}</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
        <p style="margin: 0;"><strong>Message:</strong></p>
        <p style="margin: 8px 0 0;">${safeMessage}</p>
      </div>
    `;

    await transporter.sendMail({
      from: `${SITE_NAME} <${FROM_EMAIL}>`,
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: `New Inquiry: ${subject || "General Inquiry"}`,
      text: adminText,
      html: adminHtml,
    });

    const customerText = [
      `Hi ${name},`,
      "",
      `Thanks for contacting ${SITE_NAME}. We have received your message and will get back to you shortly.`,
      "",
      "Your message:",
      message,
      "",
      "Regards,",
      SITE_NAME,
    ].join("\n");

    const customerHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p style="margin: 0 0 12px;">Hi ${safeName},</p>
        <p style="margin: 0 0 12px;">Thanks for contacting ${escapeHtml(SITE_NAME)}. We have received your message and will get back to you shortly.</p>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px;">
          <p style="margin: 0 0 8px;"><strong>Your message:</strong></p>
          <p style="margin: 0;">${safeMessage}</p>
        </div>
        <p style="margin: 12px 0 0;">Regards,<br/>${escapeHtml(SITE_NAME)}</p>
      </div>
    `;

    await transporter.sendMail({
      from: `${SITE_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: `We received your message (${SITE_NAME})`,
      text: customerText,
      html: customerHtml,
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Server error" }),
    };
  }
};

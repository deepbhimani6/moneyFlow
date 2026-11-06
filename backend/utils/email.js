const nodemailer = require('nodemailer');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

const sendViaBrevo = async ({ toEmail, fullName, subject, html, text }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return null;

  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || 'deepbhimani6@gmail.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'MoneyFlow';

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        to: [
          {
            email: toEmail,
            name: fullName || toEmail,
          },
        ],
        replyTo: {
          email: senderEmail,
          name: senderName,
        },
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const errorMsg = data?.message || data?.error || JSON.stringify(data);
      console.error(`[Brevo Email Error]: to=${toEmail}, error=`, errorMsg);
      return { success: false, error: errorMsg };
    }

    console.log(`[Brevo Email Sent]: to=${toEmail}, messageId=${data?.messageId}`);
    return { success: true, data };
  } catch (err) {
    console.error(`[Brevo Request Error]:`, err.message);
    return { success: false, error: err.message };
  }
};

const getSmtpTransporter = () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : null;
  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
    connectionTimeout: 10000, // 10 seconds connection timeout
    greetingTimeout: 10000,   // 10 seconds greeting timeout
    socketTimeout: 15000,     // 15 seconds socket timeout
  });
};

const dispatchEmail = async ({ toEmail, fullName, subject, html, text }) => {
  try {
    // 1. Try Brevo HTTPS API first (Recommended for Render free tier since port 443 is never blocked)
    if (process.env.BREVO_API_KEY) {
      const brevoResult = await sendViaBrevo({ toEmail, fullName, subject, html, text });
      if (brevoResult) return brevoResult;
    }

    // 2. Try Gmail SMTP (Works on localhost or Render Paid tier where ports 465/587 are open)
    const transporter = getSmtpTransporter();
    if (transporter) {
      try {
        const from = `"MoneyFlow" <${process.env.SMTP_USER}>`;
        const info = await transporter.sendMail({
          from,
          replyTo: process.env.SMTP_USER,
          to: toEmail,
          subject,
          text,
          html,
        });
        console.log(`[Gmail SMTP Email Sent]: to=${toEmail}, messageId=${info.messageId}`);
        return { success: true, data: info };
      } catch (smtpErr) {
        console.error(`[SMTP Error]: ${smtpErr.message}`);
        if (
          smtpErr.message &&
          (smtpErr.message.includes('timeout') ||
            smtpErr.code === 'ETIMEDOUT' ||
            smtpErr.code === 'ESOCKETTIMEDOUT' ||
            smtpErr.code === 'ECONNECTION')
        ) {
          return {
            success: false,
            error:
              'Connection timeout: Outbound SMTP ports (465/587) timed out. Please configure BREVO_API_KEY for HTTPS delivery.',
          };
        }
        return { success: false, error: smtpErr.message };
      }
    }

    // 3. Fallback to Resend if neither Brevo nor SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('[Email Warning]: SMTP/Brevo not set in environment. Falling back to Resend.');
    }
    const from = process.env.EMAIL_FROM || 'MoneyFlow <onboarding@resend.dev>';
    const { data, error } = await resend.emails.send({
      from,
      to: [toEmail],
      subject,
      text,
      html,
    });

    if (error) {
      console.error(`[Resend Email Error]: to=${toEmail}, error=`, error.message);
      return { success: false, error: error.message };
    }

    console.log(`[Resend Email Sent]: to=${toEmail}, id=${data?.id}`);
    return { success: true, data };
  } catch (error) {
    console.error(`[Email Error]: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const sendInviteEmail = async ({ toEmail, fullName, inviteLink, username, temporaryPassword }) => {
  const subject = `You're invited to join MoneyFlow`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
      <h2 style="color: #1976d2; margin-top: 0; margin-bottom: 12px; font-size: 22px;">Welcome to MoneyFlow</h2>
      <p style="color: #333; font-size: 15px; line-height: 1.5;">Hello <strong>${fullName || 'there'}</strong>,</p>
      <p style="color: #555; font-size: 14px; line-height: 1.6;">You have been invited to collaborate and track expenses/loans on <strong>MoneyFlow</strong>.</p>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; color: #333; font-size: 14px;"><strong>Username:</strong> ${username || toEmail}</p>
        ${temporaryPassword ? `<p style="margin: 0; color: #333; font-size: 14px;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0d47a1;">${temporaryPassword}</code></p>` : ''}
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteLink}" style="background-color: #1976d2; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 15px; box-shadow: 0 2px 6px rgba(25,118,210,0.3);">
          Open MoneyFlow App
        </a>
      </div>

      <p style="color: #777; font-size: 13px; line-height: 1.4;">Or copy and paste this link into your browser:<br/><a href="${inviteLink}" style="color: #1976d2; word-break: break-all;">${inviteLink}</a></p>
      <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
      <p style="color: #999; font-size: 12px; text-align: center; margin-bottom: 0;">MoneyFlow • Online Expense & Split Tracker</p>
    </div>
  `;

  const text = `Hello ${fullName || 'there'},

You have been invited to collaborate and track expenses/loans on MoneyFlow.

Login Details:
Username: ${username || toEmail}
${temporaryPassword ? `Temporary Password: ${temporaryPassword}` : ''}

Open MoneyFlow App:
${inviteLink}

---
MoneyFlow • Online Expense & Split Tracker`;

  return dispatchEmail({ toEmail, fullName, subject, html, text });
};

const sendPasswordResetEmail = async ({ toEmail, fullName, resetCode }) => {
  const subject = `Reset your MoneyFlow password`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #1976d2; margin: 0; font-size: 24px; font-weight: 700;">MoneyFlow</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Password Reset Request</p>
      </div>

      <p style="color: #333; font-size: 15px; line-height: 1.5;">Hello <strong>${fullName || 'there'}</strong>,</p>
      <p style="color: #555; font-size: 14px; line-height: 1.6;">
        We received a request to reset the password for your MoneyFlow account associated with <strong>${toEmail}</strong>.
      </p>

      ${resetCode ? `
      <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
        <span style="display: block; font-size: 13px; color: #64748b; margin-bottom: 8px; font-weight: 600;">Your Password Reset Code:</span>
        <code style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #1976d2; font-family: monospace;">${resetCode}</code>
      </div>` : ''}

      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
        This password reset code is valid for <strong>1 hour</strong>. Please enter this code on the reset password screen to create a new password. If you did not request a password reset, you can safely ignore this email — your account remains completely secure.
      </p>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 25px;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">MoneyFlow • Online Expense & Split Tracker</p>
    </div>
  `;

  const text = `Hello ${fullName || 'there'},

We received a request to reset the password for your MoneyFlow account.

${resetCode ? `Your Password Reset Code: ${resetCode}\n` : ''}
This code is valid for 1 hour. Please enter this code on the reset password screen to set a new password.

If you did not request this, you can safely ignore this email.

---
MoneyFlow • Online Expense & Split Tracker`;

  return dispatchEmail({ toEmail, fullName, subject, html, text });
};

module.exports = {
  sendInviteEmail,
  sendPasswordResetEmail,
};

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

const sendInviteEmail = async ({ toEmail, fullName, inviteLink, username, temporaryPassword }) => {
  try {
    const subject = `You're invited to join MoneyFlow`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #1976d2; margin-bottom: 8px;">Welcome to MoneyFlow</h2>
        <p>Hello <strong>${fullName || 'there'}</strong>,</p>
        <p>You have been invited to collaborate and track expenses/loans on <strong>MoneyFlow</strong>.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Username:</strong> ${username || toEmail}</p>
          ${temporaryPassword ? `<p style="margin: 0;"><strong>Temporary Password:</strong> ${temporaryPassword}</p>` : ''}
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #1976d2; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
            Open MoneyFlow App
          </a>
        </div>

        <p style="color: #666; font-size: 13px;">Or copy and paste this link in your browser: <br/><a href="${inviteLink}">${inviteLink}</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
        <p style="color: #999; font-size: 12px; text-align: center;">MoneyFlow • Online Expense & Split Tracker</p>
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

    // 1. Try Brevo HTTPS API first (Recommended for Render free tier since port 443 is never blocked)
    if (process.env.BREVO_API_KEY) {
      const brevoResult = await sendViaBrevo({ toEmail, fullName, subject, html, text });
      if (brevoResult) return brevoResult;
    }

    // 2. Try Gmail SMTP (Works on localhost or Render Paid tier where ports 465/587 are open)
    const transporter = getSmtpTransporter();
    if (transporter) {
      try {
        // Must use the authenticated Gmail address to pass Google's SPF/DKIM verification and prevent Spam
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
              'Connection timeout: Render Free Tier blocks outbound SMTP ports (465/587). Please add a free BREVO_API_KEY (HTTPS port 443) in Render Environment, or upgrade to Render Starter.',
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
      if (error.message && error.message.includes('only send testing emails')) {
        return {
          success: false,
          error:
            'Gmail SMTP credentials (SMTP_USER / SMTP_PASS) are not set in Render Environment variables, or domain is unverified.',
        };
      }
      return { success: false, error: error.message };
    }

    console.log(`[Resend Email Sent]: to=${toEmail}, id=${data?.id}`);
    return { success: true, data };
  } catch (error) {
    console.error(`[Email Error]: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = { sendInviteEmail };

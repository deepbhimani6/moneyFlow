const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendInviteEmail = async ({ toEmail, fullName, inviteLink, username, temporaryPassword }) => {
  try {
    const from = process.env.EMAIL_FROM || 'MoneyFlow <onboarding@resend.dev>';
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

    const data = await resend.emails.send({
      from,
      to: [toEmail],
      subject,
      html,
    });

    console.log(`[Resend Email Sent]: to=${toEmail}, id=${data.data?.id || data.id}`);
    return { success: true, data };
  } catch (error) {
    console.error(`[Resend Email Error]: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = { sendInviteEmail };

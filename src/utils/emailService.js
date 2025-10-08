const nodemailer = require("nodemailer");
const config = require("../config");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log("✓ Email service is ready to send messages");
      return true;
    } catch (error) {
      console.error("✗ Email service connection failed:", error.message);
      return false;
    }
  }

  async sendEmail(to, subject, html) {
    try {
      if (!config.email.user || !config.email.password) {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("📧 EMAIL NOT CONFIGURED (Development Mode)");
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("To:", to);
        console.log("Subject:", subject);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return { success: true, message: "Email not configured (dev mode)" };
      }

      const info = await this.transporter.sendMail({
        from: `"Test Session Platform" <${config.email.from}>`,
        to,
        subject,
        html,
      });

      console.log("✓ Email sent successfully:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("✗ Error sending email:", error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email, resetToken, userName) {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background-color:rgb(186, 183, 241); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>We received a request to reset your password for your Test Session Platform account.</p>
              <p>Click the button below to reset your password:</p>
              <center>
                <a href="${resetUrl}" class="button">Reset Password</a>
              </center>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
              <p>Best regards,<br>Test Session Platform Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(email, "Password Reset Request", html);
  }

  async sendInvitationEmail(
    email,
    organizationName,
    inviterName,
    inviteToken,
    role
  ) {
    const inviteUrl = `${config.frontendUrl}/accept-invitation?token=${inviteToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #10B981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .role-badge { display: inline-block; padding: 5px 15px; background-color: #4F46E5; color: white; border-radius: 20px; font-size: 14px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're Invited!</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p><strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> on Test Session Platform.</p>
              <p>You've been invited as: <span class="role-badge">${role.toUpperCase()}</span></p>
              <p>Click the button below to accept the invitation:</p>
              <center>
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
              </center>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #10B981;">${inviteUrl}</p>
              <p><strong>This invitation will expire in 7 days.</strong></p>
              <p>If you don't want to join this organization, you can safely ignore this email.</p>
              <p>Best regards,<br>Test Session Platform Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(
      email,
      `Invitation to join ${organizationName}`,
      html
    );
  }

  async sendWelcomeEmail(email, userName, organizationName) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Test Session Platform!</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>Welcome to <strong>${organizationName}</strong>! 🎉</p>
              <p>You're now part of the team and can start collaborating on test sessions.</p>
              <p>Get started by:</p>
              <ul>
                <li>Exploring active test sessions</li>
                <li>Creating features and test cases</li>
                <li>Providing feedback on tests</li>
                <li>Collaborating with your team</li>
              </ul>
              <p>If you have any questions, feel free to reach out to your team members or check our documentation.</p>
              <p>Happy testing!<br>Test Session Platform Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(email, "Welcome to Test Session Platform", html);
  }
}

module.exports = new EmailService();

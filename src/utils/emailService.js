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

  async sendCompletionEmail(email, userName, sessionName, totalCases) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .achievement { text-align: center; padding: 20px; background: white; border-radius: 10px; margin: 20px 0; }
            .achievement-icon { font-size: 64px; margin-bottom: 10px; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat-item { text-align: center; }
            .stat-number { font-size: 32px; font-weight: bold; color: #10B981; }
            .stat-label { font-size: 14px; color: #666; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎊 Congratulations! 🎊</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <div class="achievement">
                <div class="achievement-icon">🏆</div>
                <h2 style="margin: 10px 0; color: #10B981;">100% Completion!</h2>
                <p style="color: #666;">You've completed all test cases in the session</p>
              </div>
              <p>Amazing work! You've successfully tested all <strong>${totalCases}</strong> test cases in the <strong>${sessionName}</strong> session.</p>
              <p>Your dedication and thoroughness in testing helps ensure the quality of our product. The team appreciates your hard work!</p>
              <p><strong>What's next?</strong></p>
              <ul>
                <li>Review any failed test cases and provide detailed feedback</li>
                <li>Check out other active sessions that need testing</li>
                <li>Share your testing insights with the team</li>
              </ul>
              <p>Keep up the excellent work!<br>Test Session Platform Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(email, `🎉 Session Completed: ${sessionName}`, html);
  }

  async sendSessionAssignmentEmail(
    email,
    userName,
    sessionName,
    sessionDescription,
    organizationName,
    assignedByName,
    sessionId,
    startDate,
    endDate,
    totalFeatures,
    totalCases
  ) {
    const sessionUrl = `${config.frontendUrl}/sessions/${sessionId}`;
    const formattedStartDate = startDate
      ? new Date(startDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Not specified";
    const formattedEndDate = endDate
      ? new Date(endDate).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Not specified";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .info-box { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3B82F6; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .info-row:last-child { border-bottom: none; }
            .info-label { font-weight: bold; color: #666; }
            .info-value { color: #333; }
            .stats-container { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat-box { text-align: center; padding: 15px; background: white; border-radius: 8px; flex: 1; margin: 0 5px; }
            .stat-number { font-size: 28px; font-weight: bold; color: #3B82F6; }
            .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 New Test Session Assignment</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>You've been assigned to a new test session by <strong>${assignedByName}</strong>.</p>

              <div class="info-box">
                <h3 style="margin-top: 0; color: #3B82F6;">${sessionName}</h3>
                <p style="color: #666; margin: 10px 0;">${
                  sessionDescription || "No description provided"
                }</p>
                <div class="info-row">
                  <span class="info-label">Organization:</span>
                  <span class="info-value">${organizationName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Start Date:</span>
                  <span class="info-value">${formattedStartDate}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">End Date:</span>
                  <span class="info-value">${formattedEndDate}</span>
                </div>
              </div>

              <div class="stats-container">
                <div class="stat-box">
                  <div class="stat-number">${totalFeatures || 0}</div>
                  <div class="stat-label">Features</div>
                </div>
                <div class="stat-box">
                  <div class="stat-number">${totalCases || 0}</div>
                  <div class="stat-label">Test Cases</div>
                </div>
              </div>

              <p><strong>What you need to do:</strong></p>
              <ul>
                <li>Review the session details and test cases</li>
                <li>Execute tests according to the test case specifications</li>
                <li>Provide feedback (Pass/Fail) for each test case</li>
                <li>Add detailed comments for any issues found</li>
              </ul>

              <center>
                <a href="${sessionUrl}" class="button">View Test Session</a>
              </center>

              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #3B82F6;">${sessionUrl}</p>

              <p>If you have any questions about this assignment, please reach out to ${assignedByName} or your team lead.</p>

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
      `You've been assigned to test session: ${sessionName}`,
      html
    );
  }

  async sendSessionUnassignmentEmail(
    email,
    userName,
    sessionName,
    organizationName,
    unassignedByName,
    reason = null
  ) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #6B7280; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .info-box { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #6B7280; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📋 Test Session Assignment Removed</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>You've been removed from a test session by <strong>${unassignedByName}</strong>.</p>

              <div class="info-box">
                <h3 style="margin-top: 0; color: #6B7280;">${sessionName}</h3>
                <p style="color: #666;">Organization: <strong>${organizationName}</strong></p>
                ${
                  reason
                    ? `<p style="color: #666; margin-top: 15px;"><strong>Reason:</strong><br>${reason}</p>`
                    : ""
                }
              </div>

              <p>You no longer have access to this test session and are not required to complete any pending test cases for it.</p>

              <p>If you believe this was done in error or have any questions, please contact ${unassignedByName} or your team lead.</p>

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
      `Removed from test session: ${sessionName}`,
      html
    );
  }
}

module.exports = new EmailService();

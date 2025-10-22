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

  async sendIssuesNotificationEmail(
    recipientEmail,
    recipientName,
    orgName,
    issues,
    customMessage,
    orgId
  ) {
    const getPriorityColor = (priority) => {
      const colors = {
        low: "#10b981",
        medium: "#f59e0b",
        high: "#ef4444",
        critical: "#dc2626",
      };
      return colors[priority] || "#6b7280";
    };

    const getPriorityBadge = (priority) => {
      const color = getPriorityColor(priority);
      return `<span style="background: ${color}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase;">${priority}</span>`;
    };

    const getStatusBadge = (status) => {
      return `<span style="background: #f0f0f0; color: #333; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500;">${status.replace(
        "_",
        " "
      )}</span>`;
    };

    const issuesHtml = issues
      .map((issue) => {
        const firstImage =
          issue.images && issue.images.length > 0
            ? issue.images[0].imageId?.publicUrl
            : null;

        return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td colspan="2" style="padding: 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <!-- Image Column -->
                <td style="width: 120px; vertical-align: top; padding-right: 15px;">
                  ${
                    firstImage
                      ? `<img src="${firstImage}" alt="Issue screenshot" style="width: 100%; max-width: 120px; height: auto; max-height: 80px; border-radius: 8px; object-fit: cover; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: block;">`
                      : '<div style="width: 100%; max-width: 120px; height: 80px; background: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 24px;">📋</div>'
                  }
                </td>
                <!-- Content Column -->
                <td style="vertical-align: top;">
                  <strong style="font-size: 16px; color: #111; display: block; margin-bottom: 8px;">${
                    issue.title
                  }</strong>
                  <p style="color: #666; font-size: 14px; margin: 8px 0; line-height: 1.5;">
                    ${
                      issue.description.length > 100
                        ? issue.description.substring(0, 100) + "..."
                        : issue.description
                    }
                  </p>
                  <div style="margin: 12px 0;">
                    ${getPriorityBadge(issue.priority)}
                    ${getStatusBadge(issue.status)}
                  </div>
                  <div style="margin-top: 12px; font-size: 13px; color: #666;">
                    👍 ${issue.votes?.length || 0} · 💬 ${issue.comments?.length || 0} · 👁 ${issue.watchers?.length || 0}
                  </div>
                  <a href="${
                    config.frontendUrl
                  }/orgs/${orgId}/issues/${issue._id}"
                     style="display: inline-block; margin-top: 12px; color: #2563eb; text-decoration: none; font-weight: 600; font-size: 14px;">
                    View Issue →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
      })
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
        <div style="max-width: 650px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">🚨</div>
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Issue Alert</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${orgName}</p>
          </div>

          <!-- Body -->
          <div style="padding: 40px 30px;">
            <p style="font-size: 16px; color: #111; margin: 0 0 10px 0;">
              Hi <strong>${recipientName}</strong>,
            </p>

            <p style="font-size: 15px; color: #666; margin: 0 0 25px 0;">
              ${
                issues.length === 1
                  ? "A critical issue has been reported"
                  : `${issues.length} issues have been reported`
              } that require your attention.
            </p>

            ${
              customMessage
                ? `
              <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px 20px; margin-bottom: 30px; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                  <strong>Message from team:</strong><br>
                  ${customMessage}
                </p>
              </div>
            `
                : ""
            }

            <!-- Issues Table -->
            <table style="width: 100%; border-collapse: collapse; margin: 25px 0; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
              ${issuesHtml}
            </table>

            <!-- View All Button -->
            <div style="text-align: center; margin: 35px 0 25px 0;">
              <a href="${
                config.frontendUrl
              }/orgs/${orgId}/issues"
                 style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                View All Issues (${issues.length})
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280;">
              This is an automated notification from TestForge Issue Tracker
            </p>
            <p style="margin: 0; font-size: 12px; color: #6b7280;">
              <a href="${
                config.frontendUrl
              }/orgs/${orgId}/settings/notifications" style="color: #2563eb; text-decoration: none;">
                Manage notification preferences
              </a>
            </p>
          </div>

        </div>
      </body>
      </html>
    `;

    const subject = `[TestForge] ${
      issues.length
    } Issue${issues.length > 1 ? "s" : ""} Require Attention - ${orgName}`;

    return this.sendEmail(recipientEmail, subject, html);
  }
}

module.exports = new EmailService();

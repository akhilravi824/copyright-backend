const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendInvitationEmail(user, invitationToken) {
    const invitationUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/register?token=${invitationToken}`;
    
    const mailOptions = {
      from: `"DSP Brand Protection" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Invitation to DSP Brand Protection Platform',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>DSP Brand Protection Invitation</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
            .info-box { background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>DSP Brand Protection Platform</h1>
              <p>You've been invited to join our team!</p>
            </div>
            
            <div class="content">
              <h2>Welcome ${user.firstName}!</h2>
              
              <p>You have been invited to join the DSP Brand Protection Platform by an administrator. This platform helps us protect DSP's intellectual property and manage copyright infringement cases.</p>
              
              <div class="info-box">
                <strong>Your Account Details:</strong><br>
                <strong>Name:</strong> ${user.firstName} ${user.lastName}<br>
                <strong>Email:</strong> ${user.email}<br>
                <strong>Role:</strong> ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}<br>
                <strong>Department:</strong> ${user.department.charAt(0).toUpperCase() + user.department.slice(1)}<br>
                ${user.jobTitle ? `<strong>Job Title:</strong> ${user.jobTitle}<br>` : ''}
              </div>
              
              <p>To complete your account setup and create your password, please click the button below:</p>
              
              <a href="${invitationUrl}" class="button">Complete Account Setup</a>
              
              <p><strong>Important:</strong> This invitation link will expire in 7 days. If you don't complete your account setup by then, please contact your administrator for a new invitation.</p>
              
              <p>If you have any questions or need assistance, please don't hesitate to contact your administrator.</p>
              
              <p>Best regards,<br>
              DSP Brand Protection Team</p>
            </div>
            
            <div class="footer">
              <p>This email was sent from the DSP Brand Protection Platform. If you received this email in error, please ignore it.</p>
              <p>© ${new Date().getFullYear()} DawnSignPress. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Invitation email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending invitation email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"DSP Brand Protection" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request - DSP Brand Protection',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #6b7280; }
            .warning-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
              <p>DSP Brand Protection Platform</p>
            </div>
            
            <div class="content">
              <h2>Hello ${user.firstName}!</h2>
              
              <p>We received a request to reset your password for your DSP Brand Protection Platform account.</p>
              
              <div class="warning-box">
                <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email and contact your administrator immediately.
              </div>
              
              <p>To reset your password, click the button below:</p>
              
              <a href="${resetUrl}" class="button">Reset My Password</a>
              
              <p><strong>Important:</strong> This password reset link will expire in 1 hour for security reasons.</p>
              
              <p>If you have any questions or need assistance, please contact your administrator.</p>
              
              <p>Best regards,<br>
              DSP Brand Protection Team</p>
            </div>
            
            <div class="footer">
              <p>This email was sent from the DSP Brand Protection Platform.</p>
              <p>© ${new Date().getFullYear()} DawnSignPress. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    try {
      const result = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent:', result.messageId);
      return result;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();

import nodemailer from 'nodemailer';
import crypto from 'crypto';

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_USER,
      SMTP_PASS,
      NODE_ENV
    } = process.env;

    if (NODE_ENV === 'production' && (!SMTP_HOST || !SMTP_USER || !SMTP_PASS)) {
      console.warn('⚠️  Email service not configured for production. Users will need manual verification.');
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      console.log('✅ Email service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
    }
  }

  async verifyConnection() {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service verification failed:', error.message);
      return false;
    }
  }

  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  async sendVerificationEmail(email, firstName, verificationToken) {
    if (!this.transporter) {
      console.warn('Email service not available. Verification email not sent.');
      return { success: false, reason: 'Email service not configured' };
    }

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const fromEmail = process.env.FROM_EMAIL || 'noreply@kitchen-pal.kwakwakwak.com';

    const mailOptions = {
      from: `"Kitchen Pal" <${fromEmail}>`,
      to: email,
      subject: 'Verify Your Kitchen Pal Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Account</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍳 Kitchen Pal</h1>
              <p>Welcome to your culinary journey!</p>
            </div>
            <div class="content">
              <h2>Hi ${firstName}!</h2>
              <p>Thank you for joining Kitchen Pal. To get started, please verify your email address by clicking the button below:</p>
              
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">${verificationUrl}</p>
              
              <p><strong>This verification link will expire in 24 hours.</strong></p>
              
              <p>If you didn't create an account with Kitchen Pal, you can safely ignore this email.</p>
              
              <p>Happy cooking!<br>The Kitchen Pal Team</p>
            </div>
            <div class="footer">
              <p>© 2025 Kitchen Pal. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${firstName}!

        Thank you for joining Kitchen Pal. To get started, please verify your email address by visiting this link:

        ${verificationUrl}

        This verification link will expire in 24 hours.

        If you didn't create an account with Kitchen Pal, you can safely ignore this email.

        Happy cooking!
        The Kitchen Pal Team

        © 2025 Kitchen Pal. All rights reserved.
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Verification email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail(email, firstName, resetToken) {
    if (!this.transporter) {
      console.warn('Email service not available. Password reset email not sent.');
      return { success: false, reason: 'Email service not configured' };
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const fromEmail = process.env.FROM_EMAIL || 'noreply@kitchen-pal.kwakwakwak.com';

    const mailOptions = {
      from: `"Kitchen Pal" <${fromEmail}>`,
      to: email,
      subject: 'Reset Your Kitchen Pal Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .warning { background: #fef3cd; border: 1px solid #fbbf24; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍳 Kitchen Pal</h1>
              <p>Password Reset Request</p>
            </div>
            <div class="content">
              <h2>Hi ${firstName}!</h2>
              <p>We received a request to reset your Kitchen Pal password. Click the button below to create a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px;">${resetUrl}</p>
              
              <div class="warning">
                <strong>⚠️ Important Security Information:</strong>
                <ul>
                  <li>This reset link will expire in 1 hour</li>
                  <li>If you didn't request this reset, please ignore this email</li>
                  <li>Your password won't be changed until you click the link above</li>
                </ul>
              </div>
              
              <p>If you're having trouble with your account, please contact our support team.</p>
              
              <p>Best regards,<br>The Kitchen Pal Team</p>
            </div>
            <div class="footer">
              <p>© 2025 Kitchen Pal. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Hi ${firstName}!

        We received a request to reset your Kitchen Pal password. Visit this link to create a new password:

        ${resetUrl}

        ⚠️ Important:
        - This reset link will expire in 1 hour
        - If you didn't request this reset, please ignore this email
        - Your password won't be changed until you click the link above

        If you're having trouble with your account, please contact our support team.

        Best regards,
        The Kitchen Pal Team

        © 2025 Kitchen Pal. All rights reserved.
      `
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService(); 
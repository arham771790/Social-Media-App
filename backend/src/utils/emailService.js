import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.BREVO_HOST || 'smtp-relay.brevo.com',
      port: process.env.BREVO_PORT || 587,
      secure: false,
      auth: {
        user: process.env.BREVO_USER,
        pass: process.env.BREVO_PASSWORD
      }
    });
  }

async sendWelcome(email, username) {
  try {
    const mailOptions = {
      from: process.env.BREVO_FROM_EMAIL || 'noreply@yourdomain.com',
      to: email,
      subject: 'Welcome to Our Platform 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #007bff;">Welcome, ${username}!</h2>
          <p>Thanks for joining us. We’re excited to have you on board.</p>
          <p>You can now log in and start exploring all our features.</p>
          <a href="${process.env.CLIENT_URL || '#'}"
             style="display: inline-block; background-color: #007bff; color: #fff; padding: 10px 20px;
                    text-decoration: none; border-radius: 5px; margin-top: 15px;">
            Get Started
          </a>
          <hr>
          <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      `,
    };
    const result = await this.transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Welcome email sending failed:", error);
    return { success: false, error: error.message };
  }
}

  

  async sendOTP(email, otp) {
    try {
      // Check if email configuration is set up
      if (!process.env.BREVO_USER || !process.env.BREVO_PASSWORD) {
        console.error('Email configuration missing. Please set up BREVO_USER and BREVO_PASSWORD in .env file');
        return { success: false, error: 'Email configuration not set up. Please check EMAIL_SETUP.md' };
      }

      const mailOptions = {
        from: process.env.BREVO_FROM_EMAIL || 'noreply@yourdomain.com',
        to: email,
        subject: 'Password Reset OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>You have requested to reset your password. Use the following OTP to complete the process:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #007bff; font-size: 32px; margin: 0;">${otp}</h1>
            </div>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
          </div>
        `
      };

      if (process.env.DEBUG_EMAIL) {
        console.log('Sending email with options:', {
          from: mailOptions.from,
          to: mailOptions.to,
          subject: mailOptions.subject,
          host: process.env.BREVO_HOST,
          port: process.env.BREVO_PORT,
          user: process.env.BREVO_USER ? '***' : 'NOT SET'
        });
      }

      const result = await this.transporter.sendMail(mailOptions);
      
      if (process.env.DEBUG_EMAIL) {
        console.log('Email sent successfully:', result.messageId);
      }
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetSuccess(email) {
    try {
      const mailOptions = {
        from: process.env.BREVO_FROM_EMAIL || 'noreply@yourdomain.com',
        to: email,
        subject: 'Password Reset Successful',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">Password Reset Successful</h2>
            <p>Your password has been successfully reset.</p>
            <p>If you didn't perform this action, please contact support immediately.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
          </div>
        `
      };

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();

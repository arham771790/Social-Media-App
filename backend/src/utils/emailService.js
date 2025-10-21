// services/EmailService.js
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const {
  MAILERSEND_HOST = "smtp.mailersend.net",
  MAILERSEND_PORT = 587,
  MAILERSEND_USER,
  MAILERSEND_PASS,
  MAILERSEND_FROM,          // e.g. no-reply@<your-verified-or-test-domain>
  MAILERSEND_FROM_NAME = "CodersHub",
  DEBUG_EMAIL,
  CORS_ORIGINS
} = process.env;

function assertEmailEnv() {
  const missing = [];
  if (!MAILERSEND_USER) missing.push("MAILERSEND_USER");
  if (!MAILERSEND_PASS) missing.push("MAILERSEND_PASS");
  if (!MAILERSEND_FROM) missing.push("MAILERSEND_FROM");
  if (missing.length) {
    throw new Error(
      `Email configuration missing: ${missing.join(", ")}. ` +
      `Ensure MAILERSEND_FROM is on a verified/test domain in MailerSend.`
    );
  }
}

class EmailService {
  constructor() {
    assertEmailEnv();

    this.transporter = nodemailer.createTransport({
      host: MAILERSEND_HOST,
      port: Number(MAILERSEND_PORT),
      secure: false,          // STARTTLS on 587/2525
      requireTLS: true,
      auth: { user: MAILERSEND_USER, pass: MAILERSEND_PASS },
      tls: { rejectUnauthorized: true },
    });

    this.from = {
      name: MAILERSEND_FROM_NAME,
      address: MAILERSEND_FROM,
    };
  }

  async sendWelcome(email, username) {
    try {
      const mailOptions = {
        from: this.from,
        to: email,
        subject: "Welcome to Our Platform 🎉",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #007bff;">Welcome, ${username}!</h2>
            <p>Thanks for joining us. We’re excited to have you on board.</p>
            <p>You can now log in and start exploring all our features.</p>
            <a href="${CORS_ORIGINS || '#'}"
               style="display:inline-block;background-color:#007bff;color:#fff;padding:10px 20px;
                      text-decoration:none;border-radius:5px;margin-top:15px;">
              Get Started
            </a>
            <hr>
            <p style="color:#666;font-size:12px;">This is an automated message, please do not reply.</p>
          </div>
        `,
      };

      if (DEBUG_EMAIL) {
        console.log("[Email] sendWelcome", {
          to: mailOptions.to,
          from: this.from,
          host: MAILERSEND_HOST,
          port: MAILERSEND_PORT,
          user: MAILERSEND_USER ? "set" : "missing",
        });
      }

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("Welcome email sending failed:", error);
      return { success: false, error: error.message };
    }
  }

  async sendOTP(email, otp) {
    try {
      const mailOptions = {
        from: this.from,
        to: email,
        subject: "Password Reset OTP",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color:#333;">Password Reset Request</h2>
            <p>You have requested to reset your password. Use the following OTP to complete the process:</p>
            <div style="background-color:#f4f4f4;padding:20px;text-align:center;margin:20px 0;">
              <h1 style="color:#007bff;font-size:32px;margin:0;">${otp}</h1>
            </div>
            <p>This OTP will expire in 10 minutes.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <hr>
            <p style="color:#666;font-size:12px;">This is an automated message, please do not reply.</p>
          </div>
        `,
      };

      if (DEBUG_EMAIL) {
        console.log("[Email] sendOTP", {
          to: mailOptions.to,
          from: this.from,
          host: MAILERSEND_HOST,
          port: MAILERSEND_PORT,
        });
      }

      const result = await this.transporter.sendMail(mailOptions);
      if (DEBUG_EMAIL) console.log("[Email] sent:", result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("Email sending failed:", error);
      return { success: false, error: error.message };
    }
  }

  async sendEmailVerificationCode(email, code, ttlMin = 10) {
    try {
      const mailOptions = {
        from: this.from,
        to: email,
        subject: "Verify your email",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color:#111;margin:0 0 8px;">Confirm your email</h2>
            <p>Use this code to verify your email address:</p>
            <div style="background:#f5f5f5;padding:18px;text-align:center;margin:16px 0;border-radius:8px;border:1px solid #eee;">
              <div style="font-size:32px;letter-spacing:6px;font-weight:700;color:#0d6efd;">${code}</div>
            </div>
            <p>This code expires in <strong>${ttlMin} minutes</strong>.</p>
            <p style="color:#666;font-size:12px;margin-top:24px;">If you didn’t request this, you can ignore this email.</p>
          </div>
        `,
      };

      if (DEBUG_EMAIL) {
        console.log("[Email] sendEmailVerificationCode", {
          to: mailOptions.to,
          from: this.from,
        });
      }

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("Verification email sending failed:", error);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetSuccess(email) {
    try {
      const mailOptions = {
        from: this.from,
        to: email,
        subject: "Password Reset Successful",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color:#28a745;">Password Reset Successful</h2>
            <p>Your password has been successfully reset.</p>
            <p>If you didn't perform this action, please contact support immediately.</p>
            <hr>
            <p style="color:#666;font-size:12px;">This is an automated message, please do not reply.</p>
          </div>
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error("Email sending failed:", error);
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();

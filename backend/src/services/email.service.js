const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Returns a configured Nodemailer transporter using Gmail SMTP (EMAIL_USER & EMAIL_PASSWORD)
 * or custom SMTP configuration.
 */
function getTransporter() {
  if (transporter) return transporter;

  const emailUser = process.env.EMAIL_USER || process.env.GMAIL_USER;
  const emailPass = process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD;

  // 1. Gmail SMTP Configuration (Priority: EMAIL_USER & EMAIL_PASSWORD)
  if (emailUser && emailPass && !process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    return transporter;
  }

  // 2. Custom SMTP Configuration (fallback if SMTP_HOST provided)
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const user = process.env.SMTP_USER || emailUser;
  const pass = process.env.SMTP_PASS || emailPass;
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587;

  if (host && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    return transporter;
  }

  return null;
}

/**
 * Dispatches an email using EmailJS REST API
 */
async function sendViaEmailJS(toEmail, otpCode, firstName = 'Student') {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;
  const templateId = process.env.EMAILJS_TEMPLATE_ID || 'template_default';

  if (!serviceId || !publicKey) {
    throw new Error('EmailJS Service ID or Public Key missing.');
  }

  console.log(`[OTP] Sending email via EmailJS (Service: ${serviceId})...`);

  const payload = {
    service_id: serviceId,
    template_id: templateId,
    user_id: publicKey,
    accessToken: privateKey,
    template_params: {
      to_email: toEmail,
      recipient: toEmail,
      user_email: toEmail,
      reply_to: 'no-reply@srkrsmarthostel.com',
      to_name: firstName,
      first_name: firstName,
      otp_code: otpCode,
      otp: otpCode,
      passcode: otpCode,
      subject: `${otpCode} is your SRKR SMART HOSTEL verification code`,
      message: `Your SRKR SMART HOSTEL verification code is: ${otpCode}. It is valid for 5 minutes.`,
    },
  };

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': process.env.CLIENT_URL || 'http://localhost:3000',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();

  if (!response.ok) {
    if (responseText.includes('template ID not found')) {
      throw new Error(`EmailJS Template ID not found. Please create an email template in https://dashboard.emailjs.com/admin/templates and set EMAILJS_TEMPLATE_ID="your_template_id" in backend/.env`);
    }
    if (responseText.includes('non-browser environments')) {
      throw new Error(`EmailJS non-browser API access is disabled. Please enable 'Allow EmailJS API for non-browser applications' in https://dashboard.emailjs.com/admin/account/security or configure Gmail SMTP (EMAIL_USER and EMAIL_PASSWORD) in backend environment variables.`);
    }
    throw new Error(`EmailJS delivery failed (${response.status}): ${responseText}`);
  }

  console.log(`[OTP] Email sent successfully to ${toEmail} via EmailJS!`);
  return { sent: true, provider: 'emailjs', response: responseText };
}

/**
 * Checks and verifies the email configuration (EmailJS or SMTP)
 */
async function verifyEmailTransporter() {
  const emailJsConfigured = !!(process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_PUBLIC_KEY);
  const smtpUser = process.env.EMAIL_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD;

  if (emailJsConfigured) {
    return {
      configured: true,
      provider: 'emailjs',
      serviceId: process.env.EMAILJS_SERVICE_ID,
      publicKey: process.env.EMAILJS_PUBLIC_KEY ? `${process.env.EMAILJS_PUBLIC_KEY.slice(0, 4)}...` : null,
      templateId: process.env.EMAILJS_TEMPLATE_ID || '(default template)',
      status: 'connected',
    };
  }

  if (smtpUser && smtpPass) {
    const mailer = getTransporter();
    if (!mailer) {
      return { configured: false, error: 'Unable to initialize SMTP transporter.' };
    }
    try {
      await mailer.verify();
      return {
        configured: true,
        provider: 'smtp',
        status: 'connected',
        user: smtpUser.replace(/(.{2})(.*)(?=@)/, (_, a, b) => a + '*'.repeat(b.length)),
      };
    } catch (err) {
      return { configured: true, provider: 'smtp', status: 'auth_failed', error: err.message };
    }
  }

  return {
    configured: false,
    error: 'No email service configured. Set EmailJS keys or EMAIL_USER/EMAIL_PASSWORD in backend/.env.',
  };
}

/**
 * Sends a 6-digit OTP verification email to the student
 */
async function sendOtpEmail(toEmail, otpCode, firstName = 'Student') {
  const env = (process.env.NODE_ENV || 'development').toLowerCase();
  const isDevOrTest = env === 'development' || env === 'test';
  const isMock = toEmail && typeof toEmail === 'string' &&
    toEmail.trim().toLowerCase().startsWith('mockstudent') &&
    toEmail.trim().toLowerCase().endsWith('@hostelsync.com');

  if (isDevOrTest && isMock) {
    console.log(`🧪 Mock account detected: ${toEmail}`);
    console.log(`🔐 Test OTP: 123456`);
    console.log(`ℹ️ [Mock Guard] Suppressed real email sending for mock account: ${toEmail}`);
    return { success: true, mockSuppressed: true };
  }

  console.log(`[OTP] Send OTP request received`);
  console.log(`[OTP] Email: ${toEmail}`);
  console.log(`[OTP] OTP generated successfully`);

  // Priority 1: EmailJS
  if (process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_PUBLIC_KEY) {
    try {
      return await sendViaEmailJS(toEmail, otpCode, firstName);
    } catch (err) {
      console.warn(`⚠️ [EmailJS Notice]: ${err.message}`);
      // If template is missing and SMTP is configured, fall back to SMTP
      if (!getTransporter()) {
        const error = new Error(err.message);
        error.code = 'EMAIL_DELIVERY_FAILED';
        throw error;
      }
    }
  }

  // Priority 2: Nodemailer / SMTP
  const mailer = getTransporter();
  if (mailer) {
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 12px 20px; background: #4f46e5; border-radius: 12px; color: #ffffff; font-weight: bold; font-size: 20px; letter-spacing: 0.5px;">
            🏠 SRKR SMART HOSTEL
          </div>
        </div>
        <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin-bottom: 8px; text-align: center;">Verify Your Student Account</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px; text-align: center;">
          Hello ${firstName}, thank you for registering with SRKR SMART HOSTEL. Please use the verification code below to complete your registration.
        </p>
        <div style="background-color: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #4f46e5;">
            ${otpCode}
          </span>
        </div>
        <p style="color: #64748b; font-size: 12px; line-height: 1.5; text-align: center; margin-bottom: 16px;">
          This code is valid for <strong>5 minutes</strong>. If you did not request this code, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          SRKR Engineering College - Smart Hostel Management & Roommate Matching
        </p>
      </div>
    `;

    try {
      console.log(`[OTP] Attempting to send email via SMTP transporter...`);
      const fromAddress = process.env.EMAIL_FROM || `"SRKR SMART HOSTEL" <${process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.SMTP_USER || 'no-reply@srkrsmarthostel.com'}>`;
      
      const info = await mailer.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `${otpCode} is your SRKR SMART HOSTEL verification code`,
        text: `Your SRKR SMART HOSTEL verification code is: ${otpCode}. It is valid for 5 minutes.`,
        html: htmlContent,
      });

      console.log(`[OTP] Email sent successfully to: ${toEmail}. Message ID: ${info.messageId}`);
      return { sent: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.error(`[OTP] EMAIL ERROR: Failed to send email to ${toEmail}: ${err.message}`);
      const deliveryErr = new Error(`Email delivery failed: ${err.message}. Please check your SMTP configuration.`);
      deliveryErr.code = 'EMAIL_DELIVERY_FAILED';
      throw deliveryErr;
    }
  }

  const errorMsg = 'Email service is not configured. Please configure EmailJS keys or EMAIL_USER and EMAIL_PASSWORD in backend/.env.';
  console.error(`[OTP] EMAIL ERROR: ${errorMsg}`);
  const err = new Error(errorMsg);
  err.code = 'NO_EMAIL_CONFIG';
  throw err;
}

/**
 * Sends approval notification email to student
 */
async function sendApprovalEmail(toEmail, firstName = 'Student') {
  console.log(`[Email] Sending registration approval email to: ${toEmail}`);
  const subject = 'Registration Approved - SRKR SMART HOSTEL';
  const text = `Hello ${firstName},\n\nYour hostel application registration has been approved by the administrator.\nYou can now log in and access the full hostel management system.\n\nLogin URL: http://localhost:3000/login\n\nBest regards,\nSRKR SMART HOSTEL Administration`;

  if (process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_PUBLIC_KEY) {
    try {
      return await sendViaEmailJS(toEmail, 'APPROVED', firstName, text);
    } catch (err) {
      console.warn(`⚠️ [EmailJS Notice on Approval]: ${err.message}`);
    }
  }

  const mailer = getTransporter();
  if (mailer) {
    try {
      const fromAddress = process.env.EMAIL_FROM || `"SRKR SMART HOSTEL" <${process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.SMTP_USER || 'no-reply@srkrsmarthostel.com'}>`;
      const info = await mailer.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        text,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #16a34a; font-size: 24px; margin: 0;">🎉 Registration Approved!</h1>
              <p style="color: #64748b; font-size: 14px; margin-top: 4px;">SRKR SMART HOSTEL</p>
            </div>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">
              Hello <strong>${firstName}</strong>,
            </p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">
              Your hostel registration application has been reviewed and <strong style="color: #16a34a;">APPROVED</strong> by the hostel administration.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:3000/login" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; display: inline-block;">
                Log In to Student Portal
              </a>
            </div>
            <p style="color: #64748b; font-size: 13px; text-align: center;">
              You can now access questionnaire submissions, roommate matching, and room allocations.
            </p>
          </div>
        `,
      });
      return { sent: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.error(`[Email] Failed to send approval email: ${err.message}`);
    }
  }
  return { sent: false };
}

/**
 * Sends rejection notification email to student
 */
async function sendRejectionEmail(toEmail, firstName = 'Student', reason = '') {
  console.log(`[Email] Sending registration rejection email to: ${toEmail}`);
  const subject = 'Registration Update - SRKR SMART HOSTEL';
  const text = `Hello ${firstName},\n\nYour hostel registration was not approved.${reason ? `\n\nReason: ${reason}` : ''}\n\nIf you have questions, please contact the hostel administration office.\n\nBest regards,\nSRKR SMART HOSTEL Administration`;

  if (process.env.EMAILJS_SERVICE_ID && process.env.EMAILJS_PUBLIC_KEY) {
    try {
      return await sendViaEmailJS(toEmail, 'REJECTED', firstName, text);
    } catch (err) {
      console.warn(`⚠️ [EmailJS Notice on Rejection]: ${err.message}`);
    }
  }

  const mailer = getTransporter();
  if (mailer) {
    try {
      const fromAddress = process.env.EMAIL_FROM || `"SRKR SMART HOSTEL" <${process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.SMTP_USER || 'no-reply@srkrsmarthostel.com'}>`;
      const info = await mailer.sendMail({
        from: fromAddress,
        to: toEmail,
        subject,
        text,
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #dc2626; font-size: 22px; margin: 0;">Registration Update</h1>
              <p style="color: #64748b; font-size: 14px; margin-top: 4px;">SRKR SMART HOSTEL</p>
            </div>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">
              Hello <strong>${firstName}</strong>,
            </p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">
              We have reviewed your hostel registration request. Unfortunately, your registration was <strong>not approved</strong>.
            </p>
            ${reason ? `
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 18px; margin: 20px 0; color: #991b1b; font-size: 14px;">
                <strong>Reason provided:</strong><br />
                ${reason}
              </div>
            ` : ''}
            <p style="color: #64748b; font-size: 13px;">
              If you believe this is an error or need further clarification, please reach out to the hostel administration office in person.
            </p>
          </div>
        `,
      });
      return { sent: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.error(`[Email] Failed to send rejection email: ${err.message}`);
    }
  }
  return { sent: false };
}

module.exports = {
  sendOtpEmail,
  sendApprovalEmail,
  sendRejectionEmail,
  verifyEmailTransporter,
};

import nodemailer from 'nodemailer';

// Warn at startup if email credentials are missing
const emailUser = process.env.EMAIL_USER || 'futahousing@gmail.com';
const emailPass = process.env.EMAIL_PASS || '';

if (!emailPass || emailPass === 'your_gmail_app_password_here') {
    console.warn('⚠️  EMAIL_PASS is not set in .env — emails will NOT be delivered!');
    console.warn('   → Go to: https://myaccount.google.com → Security → 2-Step Verification → App passwords');
    console.warn('   → Create a password named "FUTA Housing" and paste it as EMAIL_PASS in backend/.env');
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: emailUser,
        pass: emailPass,
    },
});

import path from 'path';

const LOGO_ATTACHMENT = {
    filename: 'logo.png',
    path: path.join(__dirname, '../assets/logo.png'),
    cid: 'futa_logo'
};


/**
 * Send a styled OTP email
 */
export const sendOtpEmail = async (
    to: string,
    code: string,
    purpose: 'EMAIL_VERIFY' | 'LOGIN_2FA' | 'PASSWORD_RESET',
    userName: string = 'User'
) => {
    const purposeText = {
        EMAIL_VERIFY: 'Email Verification',
        LOGIN_2FA: 'Login Verification',
        PASSWORD_RESET: 'Password Reset',
    }[purpose];

    const purposeDesc = {
        EMAIL_VERIFY: 'verify your email address and activate your account',
        LOGIN_2FA: 'complete your login to FUTA Housing',
        PASSWORD_RESET: 'reset your password',
    }[purpose];

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 24px;text-align:center;">
                <img src="cid:futa_logo" alt="FUTA Housing Logo" style="width:100px;height:auto;margin-bottom:12px;">
                <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:800;letter-spacing:-1px;">FUTA Housing</h1>
                <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">${purposeText}</p>
            </div>
            
            <!-- Body -->
            <div style="padding:32px 24px;">
                <p style="color:#374151;font-size:16px;margin:0 0 8px;">Hi <strong>${userName}</strong>,</p>
                <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
                    Use the verification code below to ${purposeDesc}. This code expires in <strong>10 minutes</strong>.
                </p>
                
                <!-- OTP Code -->
                <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                    <p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Verification Code</p>
                    <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#4f46e5;font-family:monospace;">
                        ${code}
                    </div>
                </div>
                
                <!-- Warning -->
                <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin:0 0 24px;">
                    <p style="color:#92400e;font-size:13px;margin:0;line-height:1.5;">
                        ⚠️ <strong>Security Notice:</strong> Never share this code with anyone. FUTA Housing staff will never ask for your OTP.
                    </p>
                </div>
                
                <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.5;">
                    If you didn't request this code, please ignore this email. Your account is safe.
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background:#f9fafb;padding:20px 24px;text-align:center;border-top:1px solid #e5e7eb;">
                <p style="color:#9ca3af;font-size:11px;margin:0;">
                    &copy; ${new Date().getFullYear()} FUTA Housing. Secure Student Accommodation.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({
            from: `"FUTA Housing" <${emailUser}>`,
            to,
            subject: `${code} — Your ${purposeText} Code | FUTA Housing`,
            html,
            attachments: [LOGO_ATTACHMENT]
        });
        console.log(`📧 OTP email sent to ${to} (${purpose})`);
        return true;
    } catch (err: any) {
        console.error('Email send error:', err.message);
        // Don't block auth flow if email fails — log and return false
        return false;
    }
};

/**
 * Send account status email (Approved/Rejected)
 */
export const sendVerificationEmail = async (
    to: string,
    status: 'APPROVED' | 'REJECTED',
    userName: string = 'Agent'
) => {
    const isApproved = status === 'APPROVED';
    const title = isApproved ? 'Account Verified!' : 'Verification Update';
    const color = isApproved ? '#10b981' : '#f43f5e';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f3f4f6;font-family:sans-serif;">
        <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <div style="background:${color};padding:32px 24px;text-align:center;color:#ffffff;">
                <img src="cid:futa_logo" alt="Logo" style="width:80px;height:auto;margin-bottom:10px;">
                <h1 style="margin:0;font-size:24px;font-weight:800;letter-spacing:-1px;">FUTA Housing</h1>
                <p style="margin:8px 0 0;font-size:16px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">${title}</p>
            </div>
            <div style="padding:32px 24px;color:#374151;line-height:1.6;">
                <p style="font-size:16px;margin:0 0 16px;">Hi <strong>${userName}</strong>,</p>
                <p style="font-size:14px;margin:0 0 24px;">
                    ${isApproved
            ? 'Great news! Your account has been verified by the administration. You can now log in to the dashboard and start listing your properties to reach thousands of students.'
            : 'Your account verification was not successful at this time. Please ensure your documents are clear and valid, then contact support if you believe this is a mistake.'}
                </p>
                ${isApproved ? `
                <div style="text-align:center;">
                    <a href="http://localhost:3000/auth/login" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:700;font-size:14px;">Log In to Your Dashboard</a>
                </div>
                ` : ''}
            </div>
            <div style="background:#f9fafb;padding:20px 24px;text-align:center;border-top:1px solid #e5e7eb;">
                <p style="color:#9ca3af;font-size:11px;margin:0;">&copy; ${new Date().getFullYear()} FUTA Housing. Secure Student Accommodation.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({
            from: `"FUTA Housing" <${emailUser}>`,
            to,
            subject: isApproved ? 'Congratulations! Your account is verified | FUTA Housing' : 'Verification Update | FUTA Housing',
            html,
            attachments: [LOGO_ATTACHMENT]
        });
        return true;
    } catch (err: any) {
        console.error('Email send error:', err.message);
        return false;
    }
};
/**
 * Send a high-security transaction receipt email
 */
export const sendTransactionEmail = async (
    to: string,
    userName: string,
    transaction: {
        type: string;
        amount: number;
        purpose: string;
        reference: string;
        status: string;
        timestamp: Date;
    }
) => {
    const isCredit = ['deposit', 'agent_payout', 'refund'].includes(transaction.type.toLowerCase());
    const typeLabel = transaction.type.replace(/_/g, ' ').toUpperCase();
    const amountFormatted = `₦${transaction.amount.toLocaleString()}`;
    const dateFormatted = transaction.timestamp.toLocaleString('en-NG', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const statusColor = transaction.status.toLowerCase() === 'success' || transaction.status.toLowerCase() === 'completed'
        ? '#10b981' : '#f43f5e';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <div style="max-width:550px;margin:40px auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.05);border:1px solid #e2e8f0;">
            
            <!-- Branding Header -->
            <div style="background:#0f172a;padding:40px 30px;text-align:center;position:relative;overflow:hidden;">
                <img src="cid:futa_logo" alt="Logo" style="width:70px;height:auto;margin-bottom:15px;position:relative;z-index:10;">
                <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:900;letter-spacing:-0.5px;text-transform:uppercase;">FUTA Housing</h1>
                <p style="color:#64748b;margin:8px 0 0;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:3px;">Official Registry Node</p>
            </div>
            
            <div style="padding:40px 35px;">
                <div style="text-align:center;margin-bottom:35px;">
                    <div style="display:inline-block;padding:8px 20px;background:#f1f5f9;border-radius:100px;margin-bottom:15px;">
                        <span style="font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;">Transaction Record</span>
                    </div>
                    <h2 style="margin:0;color:#0f172a;font-size:32px;font-weight:900;letter-spacing:-1px;">
                        ${isCredit ? '+' : '-'}${amountFormatted}
                    </h2>
                    <p style="margin:5px 0 0;color:${statusColor};font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">
                        ${transaction.status}
                    </p>
                </div>

                <div style="background:#f8fafc;border-radius:20px;padding:25px;border:1px solid #f1f5f9;margin-bottom:30px;">
                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:10px 0;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Identity</td>
                            <td style="padding:10px 0;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${userName}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px 0;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Protocol</td>
                            <td style="padding:10px 0;font-size:13px;font-weight:900;color:#6366f1;text-align:right;">${typeLabel}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px 0;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Registry ID</td>
                            <td style="padding:10px 0;font-size:13px;font-weight:800;color:#0f172a;text-align:right;font-family:monospace;">#${transaction.reference}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px 0;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Purpose</td>
                            <td style="padding:10px 0;font-size:13px;font-weight:700;color:#0f172a;text-align:right;">${transaction.purpose}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px 0;font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">Timestamp</td>
                            <td style="padding:10px 0;font-size:12px;font-weight:700;color:#475569;text-align:right;">${dateFormatted}</td>
                        </tr>
                    </table>
                </div>

                <div style="text-align:center;padding:25px;background:linear-gradient(to right, #6366f1, #a855f7, #ec4899);border-radius:20px;">
                    <p style="margin:0 0 5px;color:rgba(255,255,255,0.7);font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">Verification Secure</p>
                    <p style="margin:0;color:#ffffff;font-size:12px;font-weight:700;line-height:1.5;">This transaction is cryptographically sealed and logged on the FUTA Housing Registry nodes.</p>
                </div>
            </div>
            
            <div style="background:#f8fafc;padding:30px;text-align:center;border-top:1px solid #f1f5f9;">
                <p style="color:#94a3b8;font-size:10px;font-weight:700;margin:0 0 10px;text-transform:uppercase;letter-spacing:1px;">&copy; ${new Date().getFullYear()} FUTA Housing Registry Node FH-NG-001</p>
                <p style="color:#cbd5e1;font-size:9px;line-height:1.6;">You are receiving this because your account recorded a financial event. To manage notifications, visit your dashboard dashboard settings.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    try {
        await transporter.sendMail({
            from: `"FUTA Housing Registry" <${emailUser}>`,
            to,
            subject: `Registry Update: ${isCredit ? 'Credit' : 'Debit'} ${amountFormatted} | #${transaction.reference.slice(-6)}`,
            html,
            attachments: [LOGO_ATTACHMENT]
        });
        console.log(`📧 Transaction email sent to ${to} for ref: ${transaction.reference}`);
        return true;
    } catch (err: any) {
        console.error('Email Transaction Receipt error:', err.message);
        return false;
    }
};

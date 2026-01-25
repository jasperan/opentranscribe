/**
 * Verbatim Email Service
 *
 * Uses Resend for transactional emails.
 * In development mode without RESEND_API_KEY, logs emails to console.
 */

import { Resend } from 'resend';

// Lazy initialization to allow config to be loaded
let resendClient: Resend | null = null;

function isDevMode(): boolean {
  return !process.env.RESEND_API_KEY || process.env.NODE_ENV === 'development';
}

function getResendClient(): Resend | null {
  if (isDevMode() && !process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return null;
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

function getFromAddress(): string {
  return process.env.EMAIL_FROM || 'Verbatim <onboarding@resend.dev>';
}

function getAppUrl(): string {
  return process.env.VERBATIM_URL || 'http://localhost:3000';
}

export interface EmailResult {
  success: boolean;
  error?: string;
  id?: string;
}

/**
 * Send magic link email for passwordless authentication
 */
export async function sendMagicLinkEmail(
  email: string,
  token: string
): Promise<EmailResult> {
  const appUrl = getAppUrl();
  const verifyUrl = `${appUrl}/verify?token=${token}`;

  try {
    const resend = getResendClient();

    // Development mode: log to console instead of sending
    if (!resend) {
      console.log('\n========================================');
      console.log('📧 MAGIC LINK EMAIL (Development Mode)');
      console.log('========================================');
      console.log(`To: ${email}`);
      console.log(`Subject: Sign in to Verbatim`);
      console.log(`\n🔗 Magic Link URL:`);
      console.log(`   ${verifyUrl}`);
      console.log('========================================\n');
      return { success: true, id: 'dev-mode' };
    }

    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: 'Sign in to Verbatim',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sign in to Verbatim</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background-color: #141414; border-radius: 12px; border: 1px solid #27272a; max-width: 500px;">
                    <tr>
                      <td style="padding: 40px;">
                        <!-- Logo -->
                        <div style="text-align: center; margin-bottom: 32px;">
                          <span style="font-size: 24px; font-weight: bold; color: #3b82f6;">Verbatim</span>
                        </div>

                        <!-- Heading -->
                        <h1 style="color: #fafafa; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
                          Sign in to your account
                        </h1>

                        <!-- Description -->
                        <p style="color: #a1a1aa; font-size: 16px; line-height: 24px; margin: 0 0 32px 0; text-align: center;">
                          Click the button below to sign in. This link will expire in 15 minutes.
                        </p>

                        <!-- Button -->
                        <div style="text-align: center; margin-bottom: 32px;">
                          <a href="${verifyUrl}"
                             style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                            Sign in to Verbatim
                          </a>
                        </div>

                        <!-- Alternative link -->
                        <p style="color: #71717a; font-size: 14px; line-height: 20px; margin: 0; text-align: center;">
                          Or copy and paste this link into your browser:
                        </p>
                        <p style="color: #3b82f6; font-size: 14px; line-height: 20px; margin: 8px 0 0 0; text-align: center; word-break: break-all;">
                          ${verifyUrl}
                        </p>

                        <!-- Security note -->
                        <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #27272a;">
                          <p style="color: #71717a; font-size: 12px; line-height: 18px; margin: 0; text-align: center;">
                            If you didn't request this email, you can safely ignore it.
                            <br>
                            This link is valid for 15 minutes and can only be used once.
                          </p>
                        </div>
                      </td>
                    </tr>
                  </table>

                  <!-- Footer -->
                  <p style="color: #52525b; font-size: 12px; margin-top: 24px; text-align: center;">
                    Verbatim - Privacy-First Transcription
                  </p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: `Sign in to Verbatim\n\nClick the link below to sign in:\n${verifyUrl}\n\nThis link will expire in 15 minutes.\n\nIf you didn't request this email, you can safely ignore it.`,
    });

    if (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Email service error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Send welcome email after first sign up
 */
export async function sendWelcomeEmail(email: string): Promise<EmailResult> {
  const appUrl = getAppUrl();

  try {
    const resend = getResendClient();

    // Development mode: log to console instead of sending
    if (!resend) {
      console.log('\n========================================');
      console.log('📧 WELCOME EMAIL (Development Mode)');
      console.log('========================================');
      console.log(`To: ${email}`);
      console.log(`Subject: Welcome to Verbatim`);
      console.log(`\n🎉 User registered successfully!`);
      console.log(`   Dashboard: ${appUrl}/app`);
      console.log('========================================\n');
      return { success: true, id: 'dev-mode' };
    }

    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: email,
      subject: 'Welcome to Verbatim',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background-color: #141414; border-radius: 12px; border: 1px solid #27272a; max-width: 500px;">
                    <tr>
                      <td style="padding: 40px;">
                        <div style="text-align: center; margin-bottom: 32px;">
                          <span style="font-size: 24px; font-weight: bold; color: #3b82f6;">Verbatim</span>
                        </div>

                        <h1 style="color: #fafafa; font-size: 24px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
                          Welcome to Verbatim!
                        </h1>

                        <p style="color: #a1a1aa; font-size: 16px; line-height: 24px; margin: 0 0 24px 0; text-align: center;">
                          You're all set to start transcribing. Here's what you get with your free account:
                        </p>

                        <ul style="color: #d4d4d8; font-size: 15px; line-height: 28px; margin: 0 0 32px 0; padding-left: 20px;">
                          <li>500 minutes of transcription per month</li>
                          <li>5 different STT models to choose from</li>
                          <li>Export to TXT, SRT, VTT, DOCX, JSON, Markdown</li>
                          <li>Full API access</li>
                        </ul>

                        <div style="text-align: center;">
                          <a href="${appUrl}/app"
                             style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                            Start Transcribing
                          </a>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      text: `Welcome to Verbatim!\n\nYou're all set to start transcribing.\n\nWith your free account, you get:\n- 500 minutes of transcription per month\n- 5 different STT models\n- Export to multiple formats\n- Full API access\n\nStart transcribing: ${appUrl}/app`,
    });

    if (error) {
      console.error('Welcome email error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Welcome email service error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

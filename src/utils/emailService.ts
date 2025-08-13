import nodemailer from "nodemailer";
import config from "../config/config";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: config.email.user,
    pass: config.email.password,
  },
  port: 465,
  host: "smtp.gmail.com",
});

/**
 * Send email utility function
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> => {
  try {
    await transporter.sendMail({
      from: `TestBit" <${config.email.user}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    });
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw new Error('Failed to send email');
  }
};

/**
 * Send tutor OTP email
 */
export const sendTutorOTPEmail = async (email: string, otp: string): Promise<void> => {
  const subject = 'Tutor Registration - Email Verification';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">TestBit Tutor Registration</h1>
      </div>
      
      <div style="padding: 30px; background-color: #f9f9f9;">
        <h2 style="color: #333; margin-bottom: 20px;">Email Verification Required</h2>
        
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          Thank you for applying to become a tutor on TestBit! To complete your registration, 
          please verify your email address using the OTP below:
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h3 style="color: #333; margin-bottom: 10px;">Your Verification Code</h3>
          <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; font-family: monospace;">
            ${otp}
          </div>
          <p style="color: #999; font-size: 14px; margin-top: 10px;">
            This code will expire in 10 minutes
          </p>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          If you didn't request this verification, please ignore this email.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            This is an automated email from TestBit. Please do not reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;
  
  await sendEmail(email, subject, html);
};

/**
 * Send tutor welcome email
 */
export const sendTutorWelcomeEmail = async (
  email: string,
  name: string,
  planType: string
): Promise<void> => {
  const subject = 'Welcome to TestBit - Tutor Registration Complete!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Welcome to TestBit!</h1>
      </div>
      
      <div style="padding: 30px; background-color: #f9f9f9;">
        <h2 style="color: #333; margin-bottom: 20px;">Registration Successful! 🎉</h2>
        
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          Dear ${name},
        </p>
        
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          Congratulations! Your tutor registration has been completed successfully. 
          You've subscribed to our <strong>${planType.toUpperCase()}</strong> plan.
        </p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-bottom: 15px;">What's Next?</h3>
          <ul style="color: #666; line-height: 1.8;">
            <li>Your account is currently under review by our admin team</li>
            <li>You'll receive a confirmation email once verified</li>
            <li>After verification, you can start creating tests and managing students</li>
            <li>Access your dashboard to complete your profile</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${config.clientUrl}/tutor/dashboard" 
             style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Access Dashboard
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          If you have any questions, feel free to contact our support team.
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            Thank you for choosing TestBit to empower the next generation of students!
          </p>
        </div>
      </div>
    </div>
  `;
  
  await sendEmail(email, subject, html);
};

/**
 * Send tutor verification status email
 */
export const sendTutorVerificationEmail = async (
  email: string,
  name: string,
  isVerified: boolean
): Promise<void> => {
  const subject = isVerified 
    ? 'TestBit - Account Verified! 🎉' 
    : 'TestBit - Account Verification Update';
    
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${isVerified ? '#10b981' : '#f59e0b'}; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">
          ${isVerified ? 'Account Verified!' : 'Verification Update'}
        </h1>
      </div>
      
      <div style="padding: 30px; background-color: #f9f9f9;">
        <p style="color: #666; font-size: 16px; line-height: 1.5;">
          Dear ${name},
        </p>
        
        ${isVerified ? `
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Great news! Your tutor account has been verified by our admin team. 
            You can now access all tutor features and start creating tests for your students.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.clientUrl}/tutor/dashboard" 
               style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Start Teaching
            </a>
          </div>
        ` : `
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            We're still reviewing your tutor application. Our admin team will verify your account soon. 
            You'll receive another email once the verification is complete.
          </p>
        `}
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            This is an automated email from TestBit. Please do not reply to this email.
          </p>
        </div>
      </div>
    </div>
  `;
  
  await sendEmail(email, subject, html);
};

export default {
  sendEmail,
  sendTutorOTPEmail,
  sendTutorWelcomeEmail,
  sendTutorVerificationEmail,
};

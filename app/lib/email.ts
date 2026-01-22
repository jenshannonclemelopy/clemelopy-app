import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = 'Clemelopy Support <support@clemelopy.com>';
const SUPPORT_EMAIL = 'support@clemelopy.com';

// Brand colors for email templates
const colors = {
  teal: '#00A99D',
  darkTeal: '#064E4A',
  orange: '#FBBF24',
  cream: '#fffaf3',
  text: '#525252',
};

// Base email template wrapper
function emailWrapper(content: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Clemelopy Support</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${colors.cream}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.cream}; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, ${colors.darkTeal}, ${colors.teal}); padding: 32px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">Clemelopy</h1>
                  <p style="margin: 8px 0 0; color: rgba(255,255,255,0.8); font-size: 14px;">Support</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px 32px;">
                  ${content}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0 0 8px; color: #9ca3af; font-size: 13px;">
                    This email was sent by Clemelopy Support
                  </p>
                  <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                    <a href="https://clemelopy.com" style="color: ${colors.teal}; text-decoration: none;">clemelopy.com</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// Email Templates
export const emailTemplates = {
  // Sent to customer when they submit a ticket
  ticketCreated: (data: { 
    customerName: string; 
    ticketNumber: string; 
    subject: string;
    message: string;
  }) => ({
    subject: `We received your request #${data.ticketNumber}`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 16px; color: ${colors.text}; font-size: 20px; font-weight: 600;">
        Hi ${data.customerName},
      </h2>
      <p style="margin: 0 0 24px; color: ${colors.text}; font-size: 15px; line-height: 1.6;">
        Thanks for reaching out! We've received your support request and will get back to you as soon as possible.
      </p>
      
      <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom: 12px;">
              <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Ticket Number</span><br>
              <span style="color: ${colors.text}; font-size: 15px; font-weight: 600;">#${data.ticketNumber}</span>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 12px;">
              <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Subject</span><br>
              <span style="color: ${colors.text}; font-size: 15px; font-weight: 500;">${data.subject}</span>
            </td>
          </tr>
          <tr>
            <td>
              <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Your Message</span><br>
              <span style="color: ${colors.text}; font-size: 14px; line-height: 1.5;">${data.message}</span>
            </td>
          </tr>
        </table>
      </div>

      <p style="margin: 0 0 24px; color: ${colors.text}; font-size: 15px; line-height: 1.6;">
        We typically respond within 24 hours. You can view your ticket status anytime in your 
        <a href="https://app.clemelopy.com/support" style="color: ${colors.teal}; text-decoration: none; font-weight: 500;">Support Dashboard</a>.
      </p>

      <p style="margin: 0; color: ${colors.text}; font-size: 15px; line-height: 1.6;">
        Best,<br>
        <strong>The Clemelopy Team</strong>
      </p>
    `),
  }),

  // Sent to customer when admin replies
  newReply: (data: {
    customerName: string;
    ticketNumber: string;
    subject: string;
    replyMessage: string;
    agentName: string;
  }) => ({
    subject: `Re: ${data.subject} #${data.ticketNumber}`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 16px; color: ${colors.text}; font-size: 20px; font-weight: 600;">
        Hi ${data.customerName},
      </h2>
      <p style="margin: 0 0 24px; color: ${colors.text}; font-size: 15px; line-height: 1.6;">
        You have a new response on your support request:
      </p>
      
      <div style="background-color: #f0fdfa; border-left: 4px solid ${colors.teal}; border-radius: 0 12px 12px 0; padding: 20px 24px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px; color: ${colors.teal}; font-size: 13px; font-weight: 600;">
          ${data.agentName} from Clemelopy Support
        </p>
        <p style="margin: 0; color: ${colors.text}; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${data.replyMessage}</p>
      </div>

      <div style="background-color: #f9fafb; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
        <span style="color: #9ca3af; font-size: 12px;">Ticket: </span>
        <span style="color: ${colors.text}; font-size: 14px; font-weight: 500;">#${data.ticketNumber} - ${data.subject}</span>
      </div>

      <p style="margin: 0 0 16px; color: ${colors.text}; font-size: 15px; line-height: 1.6;">
        You can reply to this email or view the full conversation in your 
        <a href="https://app.clemelopy.com/support" style="color: ${colors.teal}; text-decoration: none; font-weight: 500;">Support Dashboard</a>.
      </p>

      <p style="margin: 0; color: ${colors.text}; font-size: 15px; line-height: 1.6;">
        Best,<br>
        <strong>The Clemelopy Team</strong>
      </p>
    `),
  }),

  // Sent to customer when ticket status changes
  statusChanged: (data: {
    customerName: string;
    ticketNumber: string;
    subject: string;
    newStatus: string;
  }) => {
    const statusMessages: Record<string, { color: string; message: string }> = {
      'in-progress': { 
        color: '#FBBF24', 
        message: 'We\'re actively working on your request.' 
      },
      'resolved': { 
        color: '#10B981', 
        message: 'Your request has been resolved. If you have any further questions, feel free to reply to this email.' 
      },
      'closed': { 
        color: '#6B7280', 
        message: 'This ticket has been closed. If you need further assistance, you can open a new support request.' 
      },
    };

    const status = statusMessages[data.newStatus] || { 
      color: colors.teal, 
      message: 'Your ticket status has been updated.' 
    };

    return {
      subject: `Your request #${data.ticketNumber} is now ${data.newStatus.replace('-', ' ')}`,
      html: emailWrapper(`
        <h2 style="margin: 0 0 16px; color: ${colors.text}; font-size: 20px; font-weight: 600;">
          Hi ${data.customerName},
        </h2>
        
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="display: inline-block; background-color: ${status.color}20; color: ${status.color}; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; text-transform: capitalize;">
            ${data.newStatus.replace('-', ' ')}
          </span>
        </div>

        <p style="margin: 0 0 24px; color: ${colors.text}; font-size: 15px; line-height: 1.6;">
          ${status.message}
        </p>

        <div style="background-color: #f9fafb; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
          <span style="color: #9ca3af; font-size: 12px;">Ticket: </span>
          <span style="color: ${colors.text}; font-size: 14px; font-weight: 500;">#${data.ticketNumber} - ${data.subject}</span>
        </div>

        <p style="margin: 0 0 16px; color: ${colors.text}; font-size: 15px; line-height: 1.6;">
          View your ticket in your 
          <a href="https://app.clemelopy.com/support" style="color: ${colors.teal}; text-decoration: none; font-weight: 500;">Support Dashboard</a>.
        </p>

        <p style="margin: 0; color: ${colors.text}; font-size: 15px; line-height: 1.6;">
          Best,<br>
          <strong>The Clemelopy Team</strong>
        </p>
      `),
    };
  },

  // Sent to admin when new ticket is created
  adminNewTicket: (data: {
    ticketNumber: string;
    subject: string;
    message: string;
    customerName: string;
    customerEmail: string;
    category: string;
    priority: string;
  }) => ({
    subject: `[New Ticket] #${data.ticketNumber}: ${data.subject}`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 16px; color: ${colors.text}; font-size: 20px; font-weight: 600;">
        New Support Ticket
      </h2>
      
      <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="50%" style="padding-bottom: 16px;">
              <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Ticket</span><br>
              <span style="color: ${colors.text}; font-size: 15px; font-weight: 600;">#${data.ticketNumber}</span>
            </td>
            <td width="50%" style="padding-bottom: 16px;">
              <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Priority</span><br>
              <span style="color: ${data.priority === 'urgent' || data.priority === 'high' ? '#EF4444' : colors.text}; font-size: 15px; font-weight: 600; text-transform: capitalize;">${data.priority}</span>
            </td>
          </tr>
          <tr>
            <td width="50%" style="padding-bottom: 16px;">
              <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Customer</span><br>
              <span style="color: ${colors.text}; font-size: 15px; font-weight: 500;">${data.customerName}</span>
            </td>
            <td width="50%" style="padding-bottom: 16px;">
              <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Category</span><br>
              <span style="color: ${colors.text}; font-size: 15px; font-weight: 500; text-transform: capitalize;">${data.category}</span>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-bottom: 16px;">
              <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Email</span><br>
              <a href="mailto:${data.customerEmail}" style="color: ${colors.teal}; font-size: 15px; text-decoration: none;">${data.customerEmail}</a>
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding-bottom: 16px;">
              <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Subject</span><br>
              <span style="color: ${colors.text}; font-size: 15px; font-weight: 500;">${data.subject}</span>
            </td>
          </tr>
          <tr>
            <td colspan="2">
              <span style="color: #9ca3af; font-size: 12px; text-transform: uppercase;">Message</span><br>
              <span style="color: ${colors.text}; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${data.message}</span>
            </td>
          </tr>
        </table>
      </div>

      <div style="text-align: center;">
        <a href="https://ticketing.clemelopy.com" style="display: inline-block; background: linear-gradient(135deg, ${colors.teal}, ${colors.darkTeal}); color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
          View in Dashboard
        </a>
      </div>
    `),
  }),

  // Sent to admin when customer replies
  adminNewReply: (data: {
    ticketNumber: string;
    subject: string;
    replyMessage: string;
    customerName: string;
    customerEmail: string;
  }) => ({
    subject: `[Reply] #${data.ticketNumber}: ${data.subject}`,
    html: emailWrapper(`
      <h2 style="margin: 0 0 16px; color: ${colors.text}; font-size: 20px; font-weight: 600;">
        New Customer Reply
      </h2>
      
      <p style="margin: 0 0 16px; color: ${colors.text}; font-size: 15px;">
        <strong>${data.customerName}</strong> replied to ticket <strong>#${data.ticketNumber}</strong>:
      </p>

      <div style="background-color: #fef3c7; border-left: 4px solid #FBBF24; border-radius: 0 12px 12px 0; padding: 20px 24px; margin-bottom: 24px;">
        <p style="margin: 0; color: ${colors.text}; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${data.replyMessage}</p>
      </div>

      <div style="text-align: center;">
        <a href="https://ticketing.clemelopy.com" style="display: inline-block; background: linear-gradient(135deg, ${colors.teal}, ${colors.darkTeal}); color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Reply in Dashboard
        </a>
      </div>
    `),
  }),
};

// Send email function
export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      replyTo: replyTo || SUPPORT_EMAIL,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }

    console.log('Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

// Helper functions for common emails
export async function sendTicketCreatedEmail(data: {
  customerEmail: string;
  customerName: string;
  ticketNumber: string;
  subject: string;
  message: string;
  category: string;
  priority: string;
}) {
  // Send to customer
  const customerEmail = emailTemplates.ticketCreated({
    customerName: data.customerName,
    ticketNumber: data.ticketNumber,
    subject: data.subject,
    message: data.message,
  });

  await sendEmail({
    to: data.customerEmail,
    subject: customerEmail.subject,
    html: customerEmail.html,
  });

  // Send to admin
  const adminEmail = emailTemplates.adminNewTicket({
    ticketNumber: data.ticketNumber,
    subject: data.subject,
    message: data.message,
    customerName: data.customerName,
    customerEmail: data.customerEmail,
    category: data.category,
    priority: data.priority,
  });

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: adminEmail.subject,
    html: adminEmail.html,
    replyTo: data.customerEmail,
  });
}

export async function sendReplyEmail(data: {
  customerEmail: string;
  customerName: string;
  ticketNumber: string;
  subject: string;
  replyMessage: string;
  agentName: string;
  isFromCustomer: boolean;
}) {
  if (data.isFromCustomer) {
    // Customer replied - notify admin
    const adminEmail = emailTemplates.adminNewReply({
      ticketNumber: data.ticketNumber,
      subject: data.subject,
      replyMessage: data.replyMessage,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
    });

    await sendEmail({
      to: SUPPORT_EMAIL,
      subject: adminEmail.subject,
      html: adminEmail.html,
      replyTo: data.customerEmail,
    });
  } else {
    // Admin replied - notify customer
    const customerEmail = emailTemplates.newReply({
      customerName: data.customerName,
      ticketNumber: data.ticketNumber,
      subject: data.subject,
      replyMessage: data.replyMessage,
      agentName: data.agentName,
    });

    await sendEmail({
      to: data.customerEmail,
      subject: customerEmail.subject,
      html: customerEmail.html,
    });
  }
}

export async function sendStatusChangeEmail(data: {
  customerEmail: string;
  customerName: string;
  ticketNumber: string;
  subject: string;
  newStatus: string;
}) {
  // Only send for meaningful status changes
  if (['in-progress', 'resolved', 'closed'].includes(data.newStatus)) {
    const email = emailTemplates.statusChanged({
      customerName: data.customerName,
      ticketNumber: data.ticketNumber,
      subject: data.subject,
      newStatus: data.newStatus,
    });

    await sendEmail({
      to: data.customerEmail,
      subject: email.subject,
      html: email.html,
    });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { 
  sendTicketCreatedEmail, 
  sendReplyEmail, 
  sendStatusChangeEmail 
} from '../../lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case 'ticket_created':
        await sendTicketCreatedEmail({
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          ticketNumber: data.ticketNumber,
          subject: data.subject,
          message: data.message,
          category: data.category,
          priority: data.priority,
        });
        break;

      case 'reply':
        await sendReplyEmail({
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          ticketNumber: data.ticketNumber,
          subject: data.subject,
          replyMessage: data.replyMessage,
          agentName: data.agentName,
          isFromCustomer: data.isFromCustomer,
        });
        break;

      case 'status_change':
        await sendStatusChangeEmail({
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          ticketNumber: data.ticketNumber,
          subject: data.subject,
          newStatus: data.newStatus,
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in email API:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}

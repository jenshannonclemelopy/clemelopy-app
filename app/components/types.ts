// Interface for support articles from database
export interface SupportArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  icon: string;
  status: 'draft' | 'published';
  order_index: number;
  created_at: string;
}

export const ticketCategories = [
  { value: 'general', label: 'General Question' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'billing', label: 'Billing & Subscription' },
  { value: 'feature', label: 'Feature Request' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'other', label: 'Other' },
];

export interface Attachment {
  file: File;
  preview: string;
  id: string;
}

export interface TicketNote {
  id: string;
  message: string;
  created_at: string;
  is_from_support: boolean;
  author_name: string;
  agent_avatar_url?: string;
  attachments?: string[];
}

export interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  updated_at: string;
  attachments: string[];
  notes: TicketNote[];
}

// Helper functions
export const getStatusBadge = (status: Ticket['status']) => {
  const styles = {
    open: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-500',
  };
  const labels = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return { className: styles[status], label: labels[status] };
};

export const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

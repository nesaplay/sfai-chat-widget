import { create } from 'zustand'

export interface Email {
  id: string;
  subject: string;
  sender: string;
  date: string;
  snippet: string;
  body?: string;
  bodyPlain?: string;
  hasAttachment?: boolean;
  isStarred?: boolean;
  isCalendarEvent?: boolean;
  labels?: string[];
  priority?: 'LOW' | 'MID' | 'HIGH';
}

export const draftEmailResponse = async (email: Email): Promise<string> => {
  return `Write a professional and polite response email to the following message.
Only provide the email body without subject or signature blocks.
The original email was sent by ${email.sender} on ${email.date}.
Here is the email body:
Please write a clear, well-structured response addressing the content of the email.
Email in context bellow`;
}

export const summarizeEmail = async (email: Email): Promise<string> => {
  return `From: ${email.sender}
    Subject: ${email.subject}
    Body:
    ${email.bodyPlain || email.snippet}`;
};

interface EmailStore {
  emails: Email[];
  isOpen: boolean;
  activeEmail: Email | null;
  setEmails: (emails: Email[]) => void;
  setIsOpen: (isOpen: boolean) => void;
  setActiveEmail: (email: Email | null) => void;
  draftEmailResponse: (email: Email) => Promise<string>;
  summarizeEmail: (email: Email) => Promise<string>;
  deleteEmails: (emailIds: string[]) => Promise<void>;
  archiveEmails: (emailIds: string[]) => Promise<void>;
  getEmailsByLabel: (label: string) => Email[];
  sendActiveEmail: (emailId: string, message: string) => Promise<void>;
}

export const useEmailStore = create<EmailStore>((set, get) => ({
  emails: [],
  isOpen: false,
  activeEmail: null,
  setEmails: (emails) => set({ emails }),
  setIsOpen: (isOpen) => set({ isOpen }),
  setActiveEmail: (activeEmail) => set({ activeEmail }),
  draftEmailResponse: async (email) => {
    const message = await draftEmailResponse(email);
    return message;
  },
  summarizeEmail: async (email) => {
    const message = await summarizeEmail(email);
    return message;
  },
  deleteEmails: async (emailIds) => {
    try {
      const response = await fetch("/api/gmail/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emailIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete emails");
      }

      // Remove deleted emails from the store
      set((state) => ({
        emails: state.emails.filter((email) => !emailIds.includes(email.id)),
      }));
    } catch (error) {
      console.error("Error deleting emails:", error);
      throw error;
    }
  },
  archiveEmails: async (emailIds) => {
    try {
      const response = await fetch("/api/gmail/archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ emailIds }),
      });

      if (!response.ok) {
        throw new Error("Failed to archive emails");
      }

      // Remove archived emails from the store
      set((state) => ({
        emails: state.emails.filter((email) => !emailIds.includes(email.id)),
      }));
    } catch (error) {
      console.error("Error archiving emails:", error);
      throw error;
    }
  },
  getEmailsByLabel: (label) => {
    return get().emails.filter(email => email.labels?.includes(label));
  },
  sendActiveEmail: async (emailId: string, message: string) => {
    console.log(`Sending email reply for ID: ${emailId}`);
    try {
      const response = await fetch('/api/gmail/emails', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            originalEmailId: emailId, 
            messageContent: message 
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to send email via API');
      }

      const result = await response.json();
      console.log("Send successful:", result);

      set((state) => ({ 
          emails: state.emails.filter(email => email.id !== emailId),
      }));

    } catch (error) {
      console.error("sendActiveEmail store error:", error);
      throw error; // Re-throw for the component handler (e.g., show toast)
    }
  },
}))

  
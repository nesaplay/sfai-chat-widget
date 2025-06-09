import { create } from "zustand";

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
  priority?: "LOW" | "MID" | "HIGH";
}

export const draftEmailResponse = async (email: Email): Promise<string> => {
  return `Write a professional and polite response email to the following message.
Only provide the email body without subject or signature blocks.
The original email was sent by ${email.sender} on ${email.date}.
Here is the email body:
Please write a clear, well-structured response addressing the content of the email.
Email in context bellow`;
};

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
  deleteEmails: async (emailIds) => {},
  archiveEmails: async (emailIds) => {},
  getEmailsByLabel: (label) => {
    return get().emails.filter((email) => email.labels?.includes(label));
  },
  sendActiveEmail: async (emailId: string, message: string) => {},
}));

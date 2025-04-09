import mockData from "@/app/widget/mockData";
import { create } from "zustand";

const defaultActiveSection = {
  id: "",
  label: "",
  assistantName: "",
  welcomeMessage: ["How can I help you today?"],
}

interface ChatStore {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  toggleOpen: () => void;

  loading: boolean;
  setLoading: (loading: boolean) => void;
  activeSection: {
    id: string;
    label: string;
    assistantName: string;
    welcomeMessage: string[];
  } | null;
  setActiveSection: (activeSection: {
    id: string;
    label: string;
    assistantName: string;
    welcomeMessage: string[];
  } | null) => void;

  widgetData: typeof mockData;
  setWidgetData: (widgetData: typeof mockData) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  isOpen: true,
  setIsOpen: (isOpen) => set({ isOpen }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  activeSection: defaultActiveSection,
  setActiveSection: (activeSection) => set({ activeSection: activeSection === null ? defaultActiveSection : activeSection }),

  loading: false,
  setLoading: (loading) => set({ loading }),

  widgetData: mockData,
  setWidgetData: (widgetData) => set({ widgetData }),
}));

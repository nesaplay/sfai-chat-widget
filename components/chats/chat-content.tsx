"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { ArrowUp, RefreshCcw, Copy, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { PROJECT_CONFIG } from "@/lib/constants";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useChatStore } from "@/lib/store/use-chat-store";
import { getWidgetDataLabels } from "@/app/widget/mockData";

type ActiveButton = "none" | "add" | "deepSearch" | "think";
type MessageType = "user" | "assistant";

interface Message {
  id: string;
  content: string;
  type: MessageType;
  completed?: boolean;
  newSection?: boolean;
}

interface MessageSection {
  id: string;
  messages: Message[];
  isNewSection: boolean;
  isActive?: boolean;
  sectionIndex: number;
}

interface StreamingWord {
  id: number;
  text: string;
}

interface FileTag {
  start: number;
  end: number;
  filename: string;
}

// Faster word delay for smoother streaming
const WORD_DELAY = 40; // ms per word
const CHUNK_SIZE = 2; // Number of words to add at once

interface ChatContentProps {
  messages: Message[];
  onMessagesChange: (messages: Message[]) => Promise<void>;
  onClearChat: () => void;
  onSendMessage: (message: Message) => Promise<Message>;
  onStreamMessage?: (
    text: string,
    callback: (word: string) => void,
    { filename, label }: { filename?: string; label?: string },
  ) => Promise<void>;
  taggedFileNames: string[];
  loading: boolean;
}

const ChatContent = ({
  messages,
  onMessagesChange,
  onClearChat,
  onSendMessage,
  onStreamMessage,
  taggedFileNames,
  loading,
}: ChatContentProps) => {
  const [inputValue, setInputValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const newSectionRef = useRef<HTMLDivElement>(null);
  const [hasTyped, setHasTyped] = useState(false);
  const [activeButton, setActiveButton] = useState<ActiveButton>("none");
  const [isMobile, setIsMobile] = useState(false);
  const [messageSections, setMessageSections] = useState<MessageSection[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingWords, setStreamingWords] = useState<StreamingWord[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [completedMessages, setCompletedMessages] = useState<Set<string>>(new Set());
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const shouldFocusAfterStreamingRef = useRef(false);
  const selectionStateRef = useRef<{ start: number | null; end: number | null }>({ start: null, end: null });
  const { toast } = useToast();
  const [mentionPopoverOpen, setMentionPopoverOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [fileTags, setFileTags] = useState<FileTag[]>([]);
  const [activeLabel, setActiveLabel] = useState<string | undefined>(undefined);
  const commandRef = useRef<HTMLDivElement>(null);
  const { activeSection } = useChatStore();

  const widgetDataLabels = getWidgetDataLabels();

  // Constants for layout calculations to account for the padding values
  const TOP_PADDING = 48; // pt-12 (3rem = 48px)
  const BOTTOM_PADDING = 128; // pb-32 (8rem = 128px)
  const ADDITIONAL_OFFSET = 16; // Reduced offset for fine-tuning

  // Check if device is mobile and get viewport height
  useEffect(() => {
    const checkMobileAndViewport = () => {
      const isMobileDevice = window.innerWidth < 768;
      setIsMobile(isMobileDevice);

      // Capture the viewport height
      const vh = window.innerHeight;
      setViewportHeight(vh);
    };

    checkMobileAndViewport();

    // Update on resize
    window.addEventListener("resize", checkMobileAndViewport);

    return () => {
      window.removeEventListener("resize", checkMobileAndViewport);
    };
  }, [isMobile, viewportHeight]);

  // Organize messages into sections
  useEffect(() => {
    if (messages.length === 0) {
      setMessageSections([]);
      setActiveSectionId(null);
      return;
    }

    const sections: MessageSection[] = [];
    let currentSection: MessageSection = {
      id: `section-0`,
      messages: [],
      isNewSection: true,
      sectionIndex: 0,
    };

    messages.forEach((message) => {
      if (message.newSection) {
        // Start a new section
        if (currentSection.messages.length > 0) {
          // Mark previous section as inactive
          sections.push({
            ...currentSection,
            isActive: false,
          });
        }

        // Create new active section
        const newSectionId = `section-${sections.length}`;
        currentSection = {
          id: newSectionId,
          messages: [message],
          isNewSection: true,
          isActive: true,
          sectionIndex: sections.length,
        };

        // Update active section ID
        setActiveSectionId(newSectionId);
      } else {
        // Add to current section
        currentSection.messages.push(message);
      }
    });

    // Add the last section if it has messages
    if (currentSection.messages.length > 0) {
      sections.push(currentSection);
    }

    setMessageSections(sections);
  }, [messages]);

  // Scroll to maximum position of the last message when new section is created, but only for sections after the first
  useEffect(() => {
    if (messageSections.length >= 1) {
      setTimeout(() => {
        const scrollContainer = chatContainerRef.current;
        const newSection = newSectionRef.current;

        if (scrollContainer && newSection) {
          // Scroll to maximum possible position
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight - newSection.offsetHeight,
            behavior: "smooth",
          });
        }
      }, 100);
    }
  }, [messageSections]);

  // Focus the textarea on component mount (only on desktop)
  useEffect(() => {
    if (textareaRef.current && !isMobile) {
      textareaRef.current.focus();
    }
  }, [isMobile]);

  // Set focus back to textarea after streaming ends (only on desktop)
  useEffect(() => {
    if (!isStreaming && shouldFocusAfterStreamingRef.current && !isMobile) {
      focusTextarea();
      shouldFocusAfterStreamingRef.current = false;
    }
  }, [isStreaming, isMobile]);

  // Calculate available content height (viewport minus header and input)
  const getContentHeight = () => {
    // Calculate available height by subtracting the top and bottom padding from viewport height
    return viewportHeight - TOP_PADDING - BOTTOM_PADDING - ADDITIONAL_OFFSET;
  };

  // Save the current selection state
  const saveSelectionState = () => {
    if (textareaRef.current) {
      selectionStateRef.current = {
        start: textareaRef.current.selectionStart,
        end: textareaRef.current.selectionEnd,
      };
    }
  };

  // Restore the saved selection state
  const restoreSelectionState = () => {
    const textarea = textareaRef.current;
    const { start, end } = selectionStateRef.current;

    if (textarea && start !== null && end !== null) {
      // Focus first, then set selection range
      textarea.focus();
      textarea.setSelectionRange(start, end);
    } else if (textarea) {
      // If no selection was saved, just focus
      textarea.focus();
    }
  };

  const focusTextarea = () => {
    if (textareaRef.current && !isMobile) {
      textareaRef.current.focus();
    }
  };

  const handleInputContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only focus if clicking directly on the container, not on buttons or other interactive elements
    if (
      e.target === e.currentTarget ||
      (e.currentTarget === inputContainerRef.current && !(e.target as HTMLElement).closest("button"))
    ) {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const simulateTextStreaming = async (text: string) => {
    // Split text into words
    const words = text.split(" ");
    let currentIndex = 0;
    setStreamingWords([]);
    setIsStreaming(true);

    return new Promise<void>((resolve) => {
      const streamInterval = setInterval(() => {
        if (currentIndex < words.length) {
          // Add a few words at a time
          const nextIndex = Math.min(currentIndex + CHUNK_SIZE, words.length);
          const newWords = words.slice(currentIndex, nextIndex);

          setStreamingWords((prev) => [
            ...prev,
            {
              id: Date.now() + currentIndex,
              text: newWords.join(" ") + " ",
            },
          ]);

          currentIndex = nextIndex;
        } else {
          clearInterval(streamInterval);
          resolve();
        }
      }, WORD_DELAY);
    });
  };

  const simulateAIResponse = async (userMessage: string) => {
    const messageId = Date.now().toString();
    setStreamingMessageId(messageId);
    setIsStreaming(true);
    setStreamingWords([]);

    // Extract filename if message contains a file tag
    const fileMatch = userMessage.match(/@\*\*([^*]+)\*\*/);
    const taggedFile = fileMatch ? fileMatch[1] : undefined;

    // Add empty system message immediately, but preserve existing messages
    const systemMessage = {
      id: messageId,
      content: "",
      type: "assistant" as MessageType,
    };

    // Important: Create a new array that includes all existing messages plus the new system message
    const updatedMessages = [...messages, systemMessage];
    onMessagesChange(updatedMessages);

    try {
      if (onStreamMessage) {
        // For server streaming - now passing the filename
        let fullContent = "";
        await onStreamMessage(
          userMessage,
          (word) => {
            fullContent += word;
            setStreamingWords((prev) => [
              ...prev,
              {
                id: Date.now(),
                text: word,
              },
            ]);
          },
          {
            filename: taggedFile,
            label: `#${activeLabel}`,
          },
        );

        // After streaming completes, update the message while preserving all previous messages
        const finalMessages = messages.concat({
          ...systemMessage,
          content: fullContent.trim(),
          completed: true,
        });
        onMessagesChange(finalMessages);
      } else {
        // Client mock response in case of no server streaming
        const response = await onSendMessage({
          id: `user-${messageId}`,
          content: userMessage,
          type: "user",
          completed: true,
          newSection: messages.length > 0,
        });
        simulateTextStreaming(response.content);
      }
    } catch (error) {
      console.error("Failed to get AI response:", error);
      const errorMessages = messages.concat({
        ...systemMessage,
        content: "Sorry, I encountered an error. Please try again.",
        completed: true,
      });
      onMessagesChange(errorMessages);
    } finally {
      setCompletedMessages((prev) => new Set(prev).add(messageId));
      setStreamingWords([]);
      setStreamingMessageId(null);
      setIsStreaming(false);
    }
  };

  const insertFileTag = (filename: string) => {
    if (!textareaRef.current) return;

    const currentValue = textareaRef.current.value;
    const beforeTag = currentValue.slice(0, cursorPosition - 1); // Remove the @ symbol
    const afterTag = currentValue.slice(cursorPosition);

    // Add extra spaces after filename for better cursor positioning
    const tagText = `@${filename}    `; // Add four spaces after filename
    const newValue = `${beforeTag}${tagText}${afterTag}`;
    setInputValue(newValue);

    // Add to fileTags array with the full format for rendering
    setFileTags([
      ...fileTags,
      {
        start: cursorPosition - 1,
        end: cursorPosition + filename.length + 2, // +2 for @ and two spaces
        filename,
      },
    ]);

    setMentionPopoverOpen(false);

    // Set cursor position after the simple tag with extra spacing
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = cursorPosition + filename.length + 3; // +3 for @ and two spaces
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Function to insert a widget data label tag
  const insertLabelTag = (label: string) => {
    if (!textareaRef.current) return;

    const currentValue = textareaRef.current.value;
    const beforeTag = currentValue.slice(0, cursorPosition - 1); // Remove the # symbol
    const afterTag = currentValue.slice(cursorPosition);

    // Add extra spaces after label for better cursor positioning
    const tagText = `#${label}    `; // Add four spaces after label
    const newValue = `${beforeTag}${tagText}${afterTag}`;
    setInputValue(newValue);
    setActiveLabel(label);

    // Add to fileTags array with the full format for rendering
    setFileTags([
      ...fileTags,
      {
        start: cursorPosition - 1,
        end: cursorPosition + label.length + 2, // +3 for # and two spaces
        filename: label,
      },
    ]);

    setMentionPopoverOpen(false);

    // Set cursor position after the simple tag with extra spacing
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = cursorPosition + label.length + 3; // +3 for # and two spaces
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        textareaRef.current.focus();
      }
    }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const curPos = e.target.selectionStart;

    // Only allow input changes when not streaming
    if (!isStreaming) {
      setInputValue(newValue);
      setCursorPosition(curPos);

      // Clear file tags when input is empty
      if (!newValue.trim()) {
        setFileTags([]);
      }

      // Check if @ was just typed and there are files or widgetData labels available
      if (newValue[curPos - 1] === "@" && (taggedFileNames.length > 0 || widgetDataLabels.length > 0)) {
        setMentionPopoverOpen(true);
      }

      if (newValue.trim() !== "" && !hasTyped) {
        setHasTyped(true);
      } else if (newValue.trim() === "" && hasTyped) {
        setHasTyped(false);
      }

      const textarea = textareaRef.current;
      if (textarea) {
        textarea.style.height = "auto";
        const newHeight = Math.max(24, Math.min(textarea.scrollHeight, 160));
        textarea.style.height = `${newHeight}px`;

        // Ensure cursor position is maintained
        setTimeout(() => {
          textarea.setSelectionRange(curPos, curPos);
        }, 0);
      }
    }
  };

  const generateUniqueId = (prefix: string) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isStreaming) {
      let userMessageText = inputValue.trim();

      // Extract filename from fileTags if present
      const taggedFile = fileTags.length > 0 ? fileTags[0].filename : undefined;

      // Clear input and file tags immediately
      setInputValue("");
      setFileTags([]);
      setHasTyped(false);
      setActiveButton("none");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      // Handle focus
      if (!isMobile) {
        focusTextarea();
      } else if (textareaRef.current) {
        textareaRef.current.blur();
      }

      // Start streaming mode
      setIsStreaming(true);

      try {
        // 1. Create user message with unique ID
        const userMessage = {
          id: generateUniqueId("user"),
          content: userMessageText,
          type: "user" as MessageType,
          completed: true,
          newSection: true,
        };

        // 3. Create system message with unique ID
        const systemMessage = {
          id: generateUniqueId("assistant"),
          content: "",
          type: "assistant" as MessageType,
        };

        // 4. Set streaming message ID
        setStreamingMessageId(systemMessage.id);

        // 5. Now add empty system message
        const updatedMessages = [...messages, userMessage, systemMessage];
        await onMessagesChange(updatedMessages);

        // 6. Start streaming
        let fullContent = "";

        if (onStreamMessage) {
          // For server streaming - now passing the filename
          await onStreamMessage(
            userMessageText,
            (word) => {
              fullContent += word;
              setStreamingWords((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  text: word,
                },
              ]);
            },
            {
              filename: taggedFile,
              label: `#${activeLabel}`,
            },
          );
        } else {
          // For non-streaming fallback
          const response = await onSendMessage(userMessage);
          fullContent = response.content;
        }

        // 7. After streaming, update the system message with the complete content
        const completedMessages = updatedMessages.map((msg) =>
          msg.id === systemMessage.id ? { ...msg, content: fullContent.trim(), completed: true } : msg,
        );

        // 8. Update messages state with the completed system message
        await onMessagesChange(completedMessages);

        // 9. Add to completed messages set
        setCompletedMessages((prev) => new Set([...prev, systemMessage.id]));
      } catch (error) {
        console.error("Failed to get AI response:", error);
        toast({
          title: "Error",
          description: "Failed to get AI response",
          variant: "destructive",
        });
      } finally {
        // 10. Clean up streaming state
        setStreamingWords([]);
        setStreamingMessageId(null);
        setIsStreaming(false);
      }
    }
  };

  const toggleButton = (button: ActiveButton) => {
    if (!isStreaming) {
      // Save the current selection state before toggling
      saveSelectionState();

      setActiveButton((prev) => (prev === button ? "none" : button));

      // Restore the selection state after toggling
      setTimeout(() => {
        restoreSelectionState();
      }, 0);
    }
  };

  const renderMessageWithTags = (content: string) => {
    // Split by both @** and #** patterns
    const parts = content.split(/(@\*\*[^*]+\*\*|#\*\*[^*]+\*\*)/g);

    return parts.map((part, index) => {
      // Check for @** pattern (file tags)
      const fileMatch = part.match(/@\*\*([^*]+)\*\*/);

      if (fileMatch) {
        const filename = fileMatch[1]; // Get the filename from the capture group
        return (
          <Badge
            key={index}
            variant="secondary"
            className="mx-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
          >
            <FileText className="h-3 w-3 text-gray-400 mr-1 inline-block" />
            {filename}
          </Badge>
        );
      }

      // Check for #** pattern (label tags)
      const labelMatch = part.match(/#\*\*([^*]+)\*\*/);
      if (labelMatch) {
        const label = labelMatch[1]; // Get the label from the capture group
        return (
          <Badge
            key={index}
            variant="secondary"
            className="mx-1 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium"
          >
            <span className="h-3 w-3 text-gray-400 mr-1 inline-block">#</span>
            {label}
          </Badge>
        );
      }

      // Regular text
      return <span key={index}>{part}</span>;
    });
  };

  const ThinkingBubbles = () => {
    return (
      <div className="flex items-center gap-1 px-1">
        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse"></div>
      </div>
    );
  };

  const LoadingMessages = () => {
    return (
      <div className="flex flex-col gap-4 w-full max-w-3xl mx-auto">
        {/* Assistant message with avatar */}
        <div className="flex flex-col items-start mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-40 w-full max-w-[80%] rounded-2xl" />
        </div>

        {/* User short message */}
        <div className="flex flex-col items-end">
          <Skeleton className="h-12 w-[40%] rounded-2xl rounded-br-none" />
        </div>
      </div>
    );
  };

  const renderMessage = (message: Message) => {
    const isCompleted = completedMessages.has(message.id);

    return (
      <div key={message.id} className={cn("flex flex-col", message.type === "user" ? "items-end" : "items-start")}>
        <div
          className={cn(
            "max-w-[80%] px-4 py-2 rounded-2xl text-sm min-h-[36px] flex items-center",
            message.type === "user"
              ? "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-br-none text-gray-900 dark:text-gray-100"
              : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100",
          )}
        >
          <>
            {/* Regular completed message content */}
            {message.content && message.completed && (
              <span className={message.type === "assistant" && !isCompleted ? "animate-fade-in" : ""}>
                {renderMessageWithTags(message.content)}
              </span>
            )}

            {/* Show thinking animation when starting to stream */}
            {message.type === "assistant" && message.id === streamingMessageId && streamingWords.length === 0 && (
              <ThinkingBubbles />
            )}

            {/* Streaming content */}
            {message.id === streamingMessageId && streamingWords.length > 0 && !message.completed && (
              <span className="inline">
                {streamingWords.map((word) => (
                  <span key={word.id} className="animate-fade-in inline">
                    {word.text}
                  </span>
                ))}
              </span>
            )}
          </>
        </div>

        {/* Message actions */}
        {message.type === "assistant" && message.completed && (
          <div className="flex items-center gap-2 px-4 mt-1 mb-2">
            <div
              role="button"
              tabIndex={0}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
              onClick={() => simulateAIResponse(message.content)}
              onKeyDown={(e) => e.key === "Enter" && simulateAIResponse(message.content)}
            >
              <RefreshCcw className="h-4 w-4" />
            </div>
            <div
              role="button"
              tabIndex={0}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
              onClick={() => {
                toast({
                  title: "Copied to clipboard",
                  description: "You can now paste it into your document",
                });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  toast({
                    title: "Copied to clipboard",
                    description: "You can now paste it into your document",
                  });
                }
              }}
            >
              <Copy className="h-4 w-4" />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Determine if a section should have fixed height (only for sections after the first)
  const shouldApplyHeight = (sectionIndex: number) => {
    return sectionIndex > 0;
  };

  // Render welcome message
  const renderWelcomeMessage = () => {
    return (
      <div className="flex flex-col items-start mt-4">
        <div className="max-w-[80%] px-4 py-2 rounded-2xl text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-gray-900 dark:bg-gray-800 w-6 h-6 rounded-lg flex items-center justify-center">
              <span className="text-white font-medium uppercase">{PROJECT_CONFIG.appName?.charAt(0)}</span>
            </div>
            <div>
              <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{PROJECT_CONFIG.appName}</div>
            </div>
          </div>
          <div className="font-medium mb-1 text-sm">Hi John,</div>
          {activeSection?.welcomeMessage?.map((paragraph: string, index: number) => (
            <div key={index} className="mb-2">
              {paragraph}
            </div>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (mentionPopoverOpen) {
      // Focus the command menu when it opens
      setTimeout(() => {
        commandRef.current?.focus();
      }, 0);
    }
  }, [mentionPopoverOpen]);

  const renderInputContent = (content: string) => {
    let lastIndex = 0;
    const parts = [];

    // Use fileTags array to render badges
    fileTags.forEach((tag) => {
      // Add text before the tag
      if (tag.start > lastIndex) {
        parts.push(<span key={`text-${tag.start}`}>{content.slice(lastIndex, tag.start)}</span>);
      }

      // Add the badge with explicit line height matching
      parts.push(
        <Badge
          key={`tag-${tag.start}`}
          variant="secondary"
          className="inline-flex h-[20px] items-center bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium text-xs px-1.5 leading-[inherit]"
        >
          <FileText className="h-3 w-3 text-gray-400 mr-1 shrink-0" />
          {tag.filename}
        </Badge>,
      );

      lastIndex = tag.end;
    });

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(<span key={`text-end`}>{content.slice(lastIndex)}</span>);
    }

    return parts;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden h-full w-full dark:bg-background">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          {loading ? (
            <LoadingMessages />
          ) : (
            <>
              {renderWelcomeMessage()}
              {messageSections.map((section, sectionIndex) => (
                <div
                  key={section.id}
                  ref={sectionIndex === messageSections.length - 1 && section.isNewSection ? newSectionRef : null}
                  className={cn(
                    "mb-8 pt-4", // Add more vertical spacing between sections
                    sectionIndex !== 0 ? "border-t border-gray-100 dark:border-gray-800" : "", // Add border for sections after the first
                  )}
                >
                  {section.isNewSection && (
                    <div
                      style={
                        section.isActive && shouldApplyHeight(section.sectionIndex)
                          ? { height: `${getContentHeight()}px` }
                          : {}
                      }
                      className="pt-4 flex flex-col justify-start gap-1"
                    >
                      {section.messages.map((message) => renderMessage(message))}
                    </div>
                  )}

                  {!section.isNewSection && (
                    <div className="flex flex-col gap-1">
                      {section.messages.map((message) => renderMessage(message))}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-background">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div
            ref={inputContainerRef}
            className={cn(
              "relative w-full rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-2 cursor-text",
              isStreaming && "opacity-80",
              loading && "opacity-50",
            )}
            onClick={handleInputContainerClick}
          >
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Progress value={undefined} className="w-full max-w-[80%]" />
              </div>
            )}
            <div className="flex items-center justify-between relative">
              <div className="relative flex-1">
                <Textarea
                  ref={textareaRef}
                  placeholder={
                    isStreaming ? "Waiting for response..." : loading ? "Loading messages..." : "Ask Anything"
                  }
                  className="min-h-[24px] max-h-[160px] w-full rounded-3xl border-0 bg-transparent text-transparent caret-gray-900 dark:caret-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 placeholder:text-sm focus-visible:ring-0 focus-visible:ring-offset-0 pl-2 pr-4 py-[6px] resize-none overflow-y-auto leading-5 box-border text-sm"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => {
                    if (textareaRef.current) {
                      textareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                  }}
                  disabled={loading}
                />
                <div
                  className={cn(
                    "absolute inset-0",
                    "pointer-events-none",
                    "pl-2 pr-4 py-[6px]",
                    "text-gray-900 dark:text-gray-100",
                    "text-sm",
                    "box-border",
                    "overflow-hidden",
                  )}
                  style={{
                    whiteSpace: "pre-wrap",
                    overflowWrap: "break-word",
                    lineHeight: "1.5",
                  }}
                >
                  {inputValue && renderInputContent(inputValue)}
                </div>
              </div>
              <Button
                type="submit"
                variant="outline"
                size="icon"
                className={cn(
                  "rounded-full h-8 w-8 border-0 flex-shrink-0 transition-all duration-200 absolute bottom-2 right-0",
                  hasTyped ? "bg-black dark:bg-white scale-110" : "bg-gray-200 dark:bg-gray-800",
                  loading && "opacity-50",
                )}
                disabled={!inputValue.trim() || isStreaming || loading}
              >
                <ArrowUp
                  className={cn(
                    "h-4 w-4 transition-colors",
                    hasTyped ? "text-white dark:text-black" : "text-gray-500 dark:text-gray-400",
                    loading && "animate-pulse",
                  )}
                />
                <span className="sr-only">Submit</span>
              </Button>
            </div>
          </div>
          <Popover open={mentionPopoverOpen} onOpenChange={setMentionPopoverOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="ghost" className="sr-only" aria-hidden={true}>
                Trigger
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0 mb-1" align="start" side="top" sideOffset={48} alignOffset={-8}>
              <Command
                className="rounded-lg border shadow-sm"
                shouldFilter={false} // Disable built-in filtering since we're not using search
              >
                <CommandGroup className="text-xs">
                  {taggedFileNames.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">Files</div>
                      {taggedFileNames.map((filename, index) => (
                        <CommandItem
                          key={`file-${filename}`}
                          onSelect={() => insertFileTag(filename)}
                          className="cursor-pointer py-1.5 px-2 text-xs flex items-center gap-1"
                          tabIndex={index}
                        >
                          <FileText className="h-3 w-3 text-gray-400" />
                          {filename}
                        </CommandItem>
                      ))}
                    </>
                  )}

                  {widgetDataLabels.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                        Data Labels
                      </div>
                      {widgetDataLabels.map((label, index) => (
                        <CommandItem
                          key={`label-${label}`}
                          onSelect={() => insertLabelTag(label)}
                          className="cursor-pointer py-1.5 px-2 text-xs flex items-center gap-1"
                          tabIndex={taggedFileNames.length + index}
                        >
                          <span className="h-3 w-3 text-gray-400 flex items-center justify-center">#</span>
                          {label}
                        </CommandItem>
                      ))}
                    </>
                  )}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </form>
      </div>
    </div>
  );
};

export default ChatContent;

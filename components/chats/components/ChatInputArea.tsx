"use client";

import type React from "react";
import { ArrowUp, FileText, Paperclip, SendHorizonal, Pilcrow, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PopoverAnchor } from "@radix-ui/react-popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

type UploadedFile = {
  id: string;
  filename: string;
};

interface MentionOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface ChatInputAreaProps {
  inputValue: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  mentionPopoverOpen: boolean;
  setMentionPopoverOpen: (open: boolean) => void;
  commandRef: React.RefObject<HTMLDivElement | null>;
  availableFiles: MentionOption[];
  availablePriorities: MentionOption[];
  availableTopics: MentionOption[];
  availableSections: MentionOption[];
  insertTag: (type: "file" | "priority" | "topic" | "section", value: string) => void;
  isStreaming: boolean;
  loading: boolean;
}

const ChatInputArea = ({
  inputValue,
  handleInputChange,
  handleKeyDown,
  handleSubmit,
  textareaRef,
  mentionPopoverOpen,
  setMentionPopoverOpen,
  commandRef,
  availableFiles,
  availablePriorities,
  availableTopics,
  availableSections,
  insertTag,
  isStreaming,
  loading,
}: ChatInputAreaProps) => {
  const atIndex = inputValue.lastIndexOf("@");
  const query =
    mentionPopoverOpen && atIndex !== -1 && textareaRef.current?.selectionStart
      ? inputValue.substring(atIndex + 1, textareaRef.current.selectionStart).toLowerCase()
      : "";

  const filteredFiles = availableFiles.filter((file) => file.label.toLowerCase().includes(query));
  const filteredPriorities = availablePriorities.filter(
    (priority) =>
      priority.label.toLowerCase().includes(query) || `priority:${priority.label.toLowerCase()}`.includes(query),
  );
  const filteredTopics = availableTopics.filter(
    (topic) => topic.label.toLowerCase().includes(query) || `topic:${topic.label.toLowerCase()}`.includes(query),
  );
  const filteredSections = availableSections.filter(
    (section) =>
      section.label.toLowerCase().includes(query) || `section:${section.label.toLowerCase()}`.includes(query),
  );

  const hasSuggestions =
    filteredFiles.length > 0 ||
    filteredPriorities.length > 0 ||
    filteredTopics.length > 0 ||
    filteredSections.length > 0;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.overflowY = "hidden";
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue, textareaRef]);

  const onSelect = (type: "file" | "priority" | "topic" | "section", value: string) => {
    insertTag(type, value);
    setMentionPopoverOpen(false);
  };

  return (
    <Popover open={mentionPopoverOpen && hasSuggestions} onOpenChange={setMentionPopoverOpen}>
      <PopoverContent
        className="w-64 p-0 command-popover"
        sideOffset={0}
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command ref={commandRef}>
          <CommandInput placeholder="Tag a file, priority, or topic..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {filteredSections.length > 0 && (
              <CommandGroup heading="Sections">
                {filteredSections.map((section) => (
                  <CommandItem key={section.value} onSelect={() => onSelect("section", section.value)}>
                    {section.icon}
                    <span>{section.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {filteredFiles.length > 0 && (
              <CommandGroup heading="Files">
                {filteredFiles.map((file) => (
                  <CommandItem key={file.value} onSelect={() => onSelect("file", file.value)}>
                    <Paperclip className="mr-2 h-4 w-4" />
                    <span>{file.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {filteredPriorities.length > 0 && (
              <CommandGroup heading="Priorities">
                {filteredPriorities.map((priority) => (
                  <CommandItem key={priority.value} onSelect={() => onSelect("priority", priority.value)}>
                    <Pilcrow className="mr-2 h-4 w-4" />
                    <span>{priority.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {filteredTopics.length > 0 && (
              <CommandGroup heading="Topics">
                {filteredTopics.map((topic) => (
                  <CommandItem key={topic.value} onSelect={() => onSelect("topic", topic.value)}>
                    <Hash className="mr-2 h-4 w-4" />
                    <span>{topic.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>

      <PopoverAnchor asChild>
        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message or @ to mention a file, priority, or topic..."
            className="w-full pr-12 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-1 focus:ring-slate-500 transition-shadow duration-150 ease-in-out shadow-sm"
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-2 bottom-2 h-8 w-8 bg-slate-600 hover:bg-slate-700 rounded-full disabled:opacity-50"
            disabled={!inputValue.trim() || isStreaming || loading}
          >
            <ArrowUp className="h-4 w-4 text-white" />
          </Button>
        </form>
      </PopoverAnchor>
    </Popover>
  );
};

export default ChatInputArea;

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { HomeScreen } from "./components/home";
import { MessagesScreen } from "./components/messages";
import { NavigationBar } from "./components/navigation-bar";
import { useChatStore } from "@/lib/store/use-chat-store";
import Chat from "./components/chat";

type Screen = "home" | "messages" | "chat";

export default function ChatBubble() {
  const { isOpen, setIsOpen } = useChatStore();
  const [currentScreen, setCurrentScreen] = useState<Screen>("home");
  const [messageRead, setMessageRead] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { activeSection } = useChatStore();

  useEffect(() => {
    if (isOpen) {
      setCurrentScreen("home");
      setIsExpanded(false);
    }
  }, [isOpen]);

  const handleAskQuestion = () => {
    setCurrentScreen("chat");
  };

  const handleHomeClick = () => {
    setCurrentScreen("home");
  };

  const handleMessagesClick = () => {
    setCurrentScreen("messages");
    setMessageRead(true);
  };

  const handleBackClick = () => {
    setCurrentScreen("home");
  };

  const handleExpandClick = () => {
    setIsExpanded(!isExpanded);
  };

  const screenVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="w-full h-full">
          <motion.div
            animate={{ width: 350 }}
            transition={{
              width: {
                type: "spring",
                bounce: 0,
                duration: 0.3,
              },
            }}
          >
            <Card className="h-full overflow-hidden rounded-2xl shadow-chat dark:bg-gray-950 dark:border-gray-800">
              <div className="relative h-[500px]">
                <AnimatePresence mode="wait" initial={false}>
                  {currentScreen === "home" && (
                    <HomeScreen handleAskQuestion={handleAskQuestion} screenVariants={screenVariants} />
                  )}

                  {currentScreen === "chat" && (
                    <Chat
                      handleBackClick={handleBackClick}
                      handleExpandClick={handleExpandClick}
                      isExpanded={isExpanded}
                      screenVariants={screenVariants}
                      activeSection={activeSection}
                    />
                  )}

                  {currentScreen === "messages" && (
                    <MessagesScreen
                      handleAskQuestion={handleAskQuestion}
                      handleExpandClick={handleExpandClick}
                      isExpanded={isExpanded}
                      screenVariants={screenVariants}
                    />
                  )}
                </AnimatePresence>
              </div>

              <NavigationBar
                handleHomeClick={handleHomeClick}
                handleMessagesClick={handleMessagesClick}
                messageRead={messageRead}
              />
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

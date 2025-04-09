import { motion, Variants } from "framer-motion";
import { ChatContainer } from "../chat-container";
import { ChevronLeft, Minimize2, Maximize2 } from "lucide-react";

interface Props {
  handleBackClick: () => void;
  handleExpandClick: () => void;
  isExpanded: boolean;
  screenVariants: Variants;
  activeSection: {
    id: string;
    label: string;
    assistantName: string;
  } | null;
}

const Chat = ({ handleBackClick, handleExpandClick, isExpanded, screenVariants, activeSection }: Props) => {
  return (
    <motion.div
      key="chat"
      className="absolute inset-0 flex flex-col bg-white"
      initial="enter"
      animate="center"
      exit="exit"
      variants={screenVariants}
      custom={1}
      transition={{ duration: 0.3 }}
    >
      <div className="border-b p-3 flex items-center bg-white dark:bg-gray-950 dark:border-gray-800">
        <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" onClick={handleBackClick}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center ml-2">
          <div className="bg-gray-800 text-white w-10 h-10 rounded-md flex items-center justify-center text-lg font-medium mr-3">
            OV
          </div>
          <div>
            <div className="font-medium">Org Vitality</div>
            <div className="text-purple-500 font-bold text-xs">OV Care</div>
          </div>
        </div>
      </div>

      <ChatContainer />
    </motion.div>
  );
};

export default Chat;

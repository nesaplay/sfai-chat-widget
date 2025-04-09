import { ChevronLeft, Minimize2, Maximize2 } from "lucide-react"
import { motion, Variants } from "framer-motion"
interface MessagesScreenProps {
  handleAskQuestion: () => void
  handleExpandClick: () => void
  isExpanded: boolean
  screenVariants: Variants;
}

export function MessagesScreen({
  handleAskQuestion,
  handleExpandClick,
  isExpanded,
  screenVariants,
}: MessagesScreenProps) {

  return (
    <motion.div
      key="messages"
      className="absolute inset-0 flex flex-col bg-white dark:bg-gray-950"
      initial="enter"
      animate="center"
      exit="exit"
      variants={screenVariants}
      custom={-1}
      transition={{ duration: 0.3 }}
    >
      <div className="border-b dark:border-gray-800 p-4 flex items-center justify-start">
        <div className="w-8"></div>
        <h2 className="text-xl font-medium dark:text-white">Messages</h2>
      </div>

      <div className="flex-grow overflow-y-auto">
        <div
          className="flex items-center p-4 border-b dark:border-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900"
          onClick={handleAskQuestion}
        >
          <div className="bg-gray-800 dark:bg-gray-700 text-white w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium mr-3">
            C
          </div>
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <p className="font-medium dark:text-white">Hi John...</p>
              <ChevronLeft className="w-5 h-5 transform rotate-180" />
            </div>
            <div className="text-gray-500 dark:text-gray-400 text-sm">Claire • 11m ago</div>
          </div>
        </div>
      </div>

      <div className="flex justify-center p-6">
        <button
          className="bg-slate-600 text-white px-6 py-3 rounded-full flex items-center gap-2"
          onClick={handleAskQuestion}
        >
          Ask a question
          <div className="bg-white text-slate-600 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold">
            ?
          </div>
        </button>
      </div>
    </motion.div>
  )
}

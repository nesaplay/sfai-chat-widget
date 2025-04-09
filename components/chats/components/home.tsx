import { motion, Variants } from "framer-motion";

interface HomeScreenProps {
  handleAskQuestion: () => void;
  screenVariants: Variants;
}

export function HomeScreen({ handleAskQuestion, screenVariants }: HomeScreenProps) {
  return (
    <motion.div
      key="home"
      className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 flex flex-col"
      initial="enter"
      animate="center"
      exit="exit"
      variants={screenVariants}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col flex-1 h-full justify-between">
        <div className="p-6 pb-4">
          <div className="flex justify-start mb-6">
            <div className="bg-gray-800 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg font-medium">
              OV
            </div>
          </div>

          <div className="text-white text-2xl font-medium mb-1">Hi John, welcome back.</div>
          <div className="text-white text-2xl font-medium">How can I help you?</div>
        </div>

        <div
          className="bg-white rounded-xl mx-4 mb-4 p-3 flex items-center cursor-pointer hover:bg-gray-50"
          onClick={handleAskQuestion}
        >
          <div className="flex-grow text-gray-700 pl-2">Ask a question</div>
          <div className="flex gap-1">
            <div className="bg-gray-800 text-white w-8 h-8 rounded flex items-center justify-center">C</div>
            <div className="bg-gray-800 text-white w-8 h-8 rounded flex items-center justify-center text-sm">c</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

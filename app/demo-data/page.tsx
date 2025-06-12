"use client";

import { useEffect, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Textarea } from "@/components/ui/textarea";
import { Toaster, toast } from "sonner";
import { Button } from "@/components/ui/button";

const defaultWidgetData = {
  Overview: {
    items: {
      Slider: [{ dimensionName: "Overall Value", favorable: 78 }],
      ActionItems: [],
      ResponseRate: { responseRateOverall: 88 },
      MostFavorableItems: [{ questionText: "Integrity and compliance", favorable: 85 }],
      MostUnfavorableItems: [{ questionText: "Financial cost savings", unfavorable: 21 }],
      MostImprovedItems: [],
      MostDeclinedItems: [],
      KeyDrivers: [],
      DimensionDetail: [],
    },
    modules: ["Slider", "MostFavorableItems", "MostUnfavorableItems"],
  },
  Dimensions: [
    { dimensionName: "Service Dimensions", favorable: 69 },
    { dimensionName: "Core Deliverables", favorable: 74 },
  ],
  Heatmap: { columns: [], rows: [] },
  Questions: [],
};

export default function DemoDataPage() {
  const [code, setCode] = useState(JSON.stringify(defaultWidgetData, null, 2));

  useEffect(() => {
    // Find if the script is already there
    if (document.querySelector('script[src="/widget.js"]')) {
      // you could potentially remove and re-add, but for now we'll just let it be
      return;
    }

    // Add the widget script dynamically
    const script = document.createElement("script");
    script.src = "/widget.js";
    script.async = true;
    // Set attributes for inline mode
    script.dataset.widgetMode = "inline";
    script.dataset.widgetContainerId = "chat-widget-container";

    document.body.appendChild(script);

    // Cleanup function to remove the script when the component unmounts
    return () => {
      const existingScript = document.querySelector('script[src="/widget.js"]');
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
      // Also, you might want to clean up the window.ChatWidget object
      if (window.ChatWidget) {
        delete window.ChatWidget;
      }
    };
  }, []);

  const handleSendData = () => {
    if (window.ChatWidget) {
      try {
        const data = JSON.parse(code);
        window.ChatWidget.sendData(data);
        toast.success("Data sent to widget successfully!");
      } catch (error) {
        toast.error("Invalid JSON: Please check the data format.");
      }
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Toaster />
      <header className="border-b shrink-0">
        <div className="container flex items-center h-16 px-4 mx-auto">
          <h1 className="text-2xl font-bold">SFAI Chatbot - Demo Page</h1>
        </div>
      </header>
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        <ResizablePanel defaultSize={60}>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <h2 className="text-lg font-medium">Send Data to Chat Widget</h2>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50 space-y-4 h-full">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Editable JSON data</h3>
                <Button onClick={handleSendData}>Send Data</Button>
              </div>
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full font-mono text-sm"
                rows={20}
              />
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40}>
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <h3 className="text-lg font-medium">Embedded Chat Widget</h3>
            </div>
            <div className="flex-1 p-4">
              <div id="chat-widget-container" className="w-full h-full" />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

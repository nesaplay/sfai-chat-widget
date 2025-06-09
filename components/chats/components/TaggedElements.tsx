"use client";

import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, FileText, TriangleAlert, Hash, Library } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveTag {
  type: 'file' | 'priority' | 'topic' | 'section';
  value: string;
}

interface TaggedElementsProps {
  activeTags: ActiveTag[];
  removeTag: (tag: ActiveTag) => void;
}

const TaggedElements: React.FC<TaggedElementsProps> = ({ activeTags, removeTag }) => {
  if (activeTags.length === 0) return null;

  const renderTagIcon = (type: ActiveTag['type']) => {
    switch (type) {
      case 'file': return <FileText className="h-3 w-3 mr-1" />;
      case 'priority': return <TriangleAlert className="h-3 w-3 mr-1" />;
      case 'topic': return <Hash className="h-3 w-3 mr-1" />;
      case 'section': return <Library className="h-3 w-3 mr-1" />;
      default: return null;
    }
  };

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {activeTags.map((tag) => (
        <Badge key={`${tag.type}-${tag.value}`} variant="secondary" className="pl-2 pr-1 py-1 text-sm">
          <div className="flex items-center">
            {renderTagIcon(tag.type)}
            <span>{tag.value}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 ml-1 rounded-full"
              onClick={() => removeTag(tag)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </Badge>
      ))}
    </div>
  );
};

export default TaggedElements; 
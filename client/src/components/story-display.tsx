import { Story } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { BookOpen, Users, Crosshair, Map, Download, Share2, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import { saveAs } from 'file-saver';

interface StoryDisplayProps {
  story: Story;
}

export default function StoryDisplay({ story }: StoryDisplayProps) {
  const content = story.content as {
    title: string;
    introduction: string;
    mainQuest: string;
    sideQuests: string[];
    characters: Array<{
      name: string;
      role: string;
      description: string;
    }>;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let yPosition = margin;

    // Title
    doc.setFontSize(20);
    doc.text(content.title, margin, yPosition);
    yPosition += 15;

    // Introduction
    doc.setFontSize(12);
    doc.text("Introduction:", margin, yPosition);
    yPosition += 7;
    const introLines = doc.splitTextToSize(content.introduction, 170);
    doc.text(introLines, margin, yPosition);
    yPosition += (introLines.length * 7) + 10;

    // Main Quest
    doc.text("Main Quest:", margin, yPosition);
    yPosition += 7;
    const questLines = doc.splitTextToSize(content.mainQuest, 170);
    doc.text(questLines, margin, yPosition);
    yPosition += (questLines.length * 7) + 10;

    // Side Quests
    doc.text("Side Quests:", margin, yPosition);
    yPosition += 7;
    content.sideQuests.forEach(quest => {
      const lines = doc.splitTextToSize(`• ${quest}`, 170);
      doc.text(lines, margin, yPosition);
      yPosition += (lines.length * 7) + 3;
    });
    yPosition += 10;

    // Characters
    doc.text("Characters:", margin, yPosition);
    yPosition += 7;
    content.characters.forEach(char => {
      doc.setFontSize(11);
      doc.text(`${char.name} (${char.role})`, margin, yPosition);
      yPosition += 7;
      doc.setFontSize(10);
      const charLines = doc.splitTextToSize(char.description, 170);
      doc.text(charLines, margin, yPosition);
      yPosition += (charLines.length * 6) + 7;
    });

    doc.save(`${content.title.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  const exportToJSON = () => {
    const jsonContent = JSON.stringify(story, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    saveAs(blob, `${content.title.toLowerCase().replace(/\s+/g, '-')}.json`);
  };

  const shareStory = async () => {
    try {
      // Create a shareable link using the story ID
      const shareableLink = `${window.location.origin}/share/${story.id}`;
      await navigator.clipboard.writeText(shareableLink);
      // You might want to show a toast notification here
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md bg-white group">
      <CardHeader className="bg-primary/5 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="flex justify-between items-center flex-1">
            <span className="text-lg font-semibold">{content.title}</span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(story.createdAt), "MMM d, yyyy")}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="sm" onClick={exportToPDF} title="Export as PDF">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={exportToJSON} title="Export as JSON">
              <FileJson className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={shareStory} title="Share Story">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <BookOpen className="h-4 w-4" />
                <h3 className="font-semibold">Introduction</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {content.introduction}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Crosshair className="h-4 w-4" />
                <h3 className="font-semibold">Main Quest</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {content.mainQuest}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Map className="h-4 w-4" />
                <h3 className="font-semibold">Side Quests</h3>
              </div>
              <ul className="list-disc pl-5 space-y-2">
                {content.sideQuests.map((quest, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    {quest}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Users className="h-4 w-4" />
                <h3 className="font-semibold">Characters</h3>
              </div>
              <div className="grid gap-4">
                {content.characters.map((character, index) => (
                  <div key={index} className="space-y-1 p-3 rounded-lg bg-primary/5">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-sm">{character.name}</span>
                      <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        {character.role}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {character.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
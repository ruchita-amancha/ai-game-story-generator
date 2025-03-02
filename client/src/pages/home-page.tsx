import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import StoryGeneratorForm from "@/components/story-generator-form";
import IdeaGeneratorForm from "@/components/idea-generator-form";
import StoryDisplay from "@/components/story-display";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Story, GameplayDetails, WorldBuildingDetails } from "@shared/schema";
import { LogOut, GamepadIcon, Sparkles, BookText, Star, Crown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import GameplayDetailsDisplay from "@/components/gameplay-details";
import WorldBuildingDisplay from "@/components/world-building-display";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [generatedIdea, setGeneratedIdea] = useState<any>(null);
  const [gameplayDetails, setGameplayDetails] = useState<GameplayDetails | null>(null);
  const [worldDetails, setWorldDetails] = useState<WorldBuildingDetails | null>(null);

  const { data: stories } = useQuery<Story[]>({
    queryKey: ["/api/stories"],
  });

  const handleIdeaGenerated = (idea: any) => {
    setGeneratedIdea(idea);
  };

  const generateGameplayMutation = useMutation({
    mutationFn: async (concept: any) => {
      const res = await apiRequest("POST", "/api/gameplay-details", concept);
      return res.json();
    },
    onSuccess: (details: GameplayDetails) => {
      setGameplayDetails(details);
      toast({
        title: "Gameplay details generated!",
        description: "Check out the detailed mechanics for your game concept."
      });
      // Also generate world building details
      if (generatedIdea) {
        generateWorldBuildingMutation.mutate(generatedIdea);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate gameplay details",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const generateWorldBuildingMutation = useMutation({
    mutationFn: async (concept: any) => {
      const res = await apiRequest("POST", "/api/world-building", concept);
      return res.json();
    },
    onSuccess: (details: WorldBuildingDetails) => {
      setWorldDetails(details);
      toast({
        title: "World details generated!",
        description: "Explore the rich lore and details of your game world."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate world details",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const enablePremiumMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/enable-premium");
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Premium Enabled",
        description: "You now have access to all premium features!"
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to enable premium",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const isPremium = user?.isPremium;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <main className="container mx-auto px-4 py-4 sm:py-8">
        <Tabs defaultValue="story" className="space-y-6 sm:space-y-8">
          <TabsList className="grid w-full sm:w-[400px] grid-cols-2 mx-auto bg-white shadow-sm">
            <TabsTrigger value="story" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BookText className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Generate Story</span>
              <span className="sm:hidden">Story</span>
            </TabsTrigger>
            <TabsTrigger value="idea" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Sparkles className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Generate from Text</span>
              <span className="sm:hidden">Text</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="story" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Generate New Story</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Create a unique game story by filling out the form below.
                  </p>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
                  <StoryGeneratorForm />
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Your Stories</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Browse through your previously generated game stories.
                  </p>
                </div>
                <div className="space-y-4">
                  {stories?.map((story) => (
                    <StoryDisplay key={story.id} story={story} />
                  ))}
                  {stories?.length === 0 && (
                    <div className="text-center p-6 sm:p-8 rounded-lg bg-white shadow-sm border">
                      <BookText className="h-8 sm:h-12 w-8 sm:w-12 mx-auto mb-4 text-primary/20" />
                      <p className="text-sm sm:text-base text-muted-foreground">No stories generated yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="idea" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[1fr,1fr]">
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Generate from Description</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Describe your game idea and we'll help structure it into a proper game concept.
                  </p>
                </div>
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
                  <IdeaGeneratorForm onIdeaGenerated={handleIdeaGenerated} />
                </div>
              </div>

              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Generated Concept</h2>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Your generated game concept will appear here.
                  </p>
                </div>
                {generatedIdea ? (
                  <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 rounded-lg bg-white shadow-sm border">
                    <div className="space-y-2">
                      <h3 className="text-lg sm:text-xl font-semibold">{generatedIdea.gameTitle}</h3>
                      <div className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold">
                        {generatedIdea.genre}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Main Character</h4>
                        <p className="text-sm">{generatedIdea.mainCharacter}</p>
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">Concept</h4>
                        <p className="text-sm">{generatedIdea.conceptDescription}</p>
                      </div>
                    </div>
                    <Button
                      onClick={() => generateGameplayMutation.mutate(generatedIdea)}
                      className="w-full"
                      variant="secondary"
                      disabled={generateGameplayMutation.isPending}
                    >
                      {generateGameplayMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Use This Concept
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center p-6 sm:p-8 rounded-lg bg-white shadow-sm border">
                    <Sparkles className="h-8 sm:h-12 w-8 sm:w-12 mx-auto mb-4 text-primary/20" />
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Enter a description to generate a game concept.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {gameplayDetails && (
          <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Gameplay Details</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isPremium
                  ? "Detailed mechanics and systems for your game concept."
                  : "Basic gameplay mechanics for your game concept. Upgrade to Premium for more details!"}
              </p>
            </div>
            <GameplayDetailsDisplay
              details={gameplayDetails}
              title={generatedIdea?.gameTitle || "Game Concept"}
            />
          </div>
        )}

        {worldDetails && (
          <div className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">World Building</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isPremium
                  ? "Explore the rich lore and detailed world of your game concept."
                  : "Basic world information. Upgrade to Premium for full world-building features!"}
              </p>
            </div>
            {!isPremium ? (
              <div className="space-y-4">
                <div className="bg-lavender-100 border-2 border-lavender-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <Star className="h-5 w-5 text-lavender-600 shrink-0" />
                    <div>
                      <h3 className="font-semibold text-lavender-600 text-sm">Premium Features Available</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upgrade to access advanced world-building features:
                      </p>
                    </div>
                  </div>
                  <ul className="mt-3 ml-8 text-sm text-muted-foreground list-disc space-y-1">
                    <li>Detailed environment descriptions and climate systems</li>
                    <li>Rich cultural backgrounds and societal structures</li>
                    <li>Comprehensive historical timelines and legends</li>
                    <li>Advanced political systems and faction relationships</li>
                  </ul>
                </div>
                <div className="p-4 sm:p-6 rounded-lg bg-white shadow-sm border">
                  <h3 className="font-semibold mb-4">{worldDetails.worldName}</h3>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Basic Environment</h4>
                      <p className="mt-1 text-sm">{worldDetails.environment.geography}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Basic Overview</h4>
                      <p className="mt-1 text-sm">{worldDetails.cosmology.origin}</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <WorldBuildingDisplay
                details={worldDetails}
                title={generatedIdea?.gameTitle || "Game World"}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
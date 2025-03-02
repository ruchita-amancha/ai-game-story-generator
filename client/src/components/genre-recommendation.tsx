import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { storyGenreSchema } from "@shared/schema";

interface GenreRecommendation {
  recommendedGenre: string;
  confidence: number;
  explanation: string;
  alternativeGenres: string[];
}

export default function GenreRecommendation({
  onGenreSelect
}: {
  onGenreSelect: (genre: string) => void;
}) {
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const recommendMutation = useMutation({
    mutationFn: async (description: string) => {
      const res = await apiRequest("POST", "/api/recommend-genre", { description });
      return res.json() as Promise<GenreRecommendation>;
    },
    onSuccess: (data) => {
      toast({
        title: "Genre Recommendation Ready!",
        description: "We've analyzed your story idea and found the perfect genre match."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Recommendation Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Get Genre Recommendations</h3>
        <p className="text-sm text-muted-foreground">
          Describe your story idea, and we'll recommend the best genre for your game.
        </p>
      </div>

      <Textarea
        placeholder="Describe your story idea here..."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="min-h-[100px]"
        disabled={recommendMutation.isPending}
      />

      <Button
        onClick={() => recommendMutation.mutate(description)}
        disabled={!description || recommendMutation.isPending}
        className="w-full"
      >
        {recommendMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing Story...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Get Recommendations
          </>
        )}
      </Button>

      {recommendMutation.data && (
        <Card className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Recommended Genre</h4>
              <span className="text-sm text-muted-foreground">
                {Math.round(recommendMutation.data.confidence * 100)}% Match
              </span>
            </div>
            <Button
              variant="secondary"
              className="w-full justify-between"
              onClick={() => onGenreSelect(recommendMutation.data.recommendedGenre)}
            >
              {recommendMutation.data.recommendedGenre}
              <Sparkles className="h-4 w-4" />
            </Button>
            <p className="text-sm text-muted-foreground">
              {recommendMutation.data.explanation}
            </p>
          </div>

          {recommendMutation.data.alternativeGenres.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Alternative Genres</h4>
              <div className="flex flex-wrap gap-2">
                {recommendMutation.data.alternativeGenres.map((genre) => (
                  <Button
                    key={genre}
                    variant="outline"
                    size="sm"
                    onClick={() => onGenreSelect(genre)}
                  >
                    {genre}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

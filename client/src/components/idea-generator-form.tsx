import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCallback, useRef, useState, useEffect } from "react";

const COOLDOWN_PERIOD = 10000; // 10 seconds cooldown between requests

const formSchema = z.object({
  description: z.string().min(1, "Description is required").max(500, "Description too long")
});

interface IdeaGeneratorFormProps {
  onIdeaGenerated: (idea: any) => void;
}

const samplePrompts = [
  {
    title: "Fantasy RPG",
    description: "A fantasy RPG where players control magical creatures in an ancient floating city, using elemental powers to solve environmental puzzles and restore balance to the world."
  },
  {
    title: "Sci-Fi Mystery",
    description: "A sci-fi detective game set on a space station where time flows differently in each sector. Players must solve a murder mystery by navigating temporal anomalies and interviewing suspects across different time periods."
  },
  {
    title: "Horror Adventure",
    description: "A psychological horror game in an abandoned theme park where attractions come to life based on the player's deepest fears. Players must face their phobias to uncover the park's dark secrets."
  }
];

export default function IdeaGeneratorForm({ onIdeaGenerated }: IdeaGeneratorFormProps) {
  const { toast } = useToast();
  const lastRequestTime = useRef<number>(0);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [isImproving, setIsImproving] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: ""
    }
  });

  const checkCooldown = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime.current;
    const remaining = Math.max(0, COOLDOWN_PERIOD - timeSinceLastRequest);

    setCooldownRemaining(remaining);

    if (remaining > 0) {
      throw new Error(`Please wait ${Math.ceil(remaining / 1000)} seconds before generating another idea.`);
    }
  }, []);

  const generateMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      checkCooldown();
      lastRequestTime.current = Date.now();
      const res = await apiRequest("POST", "/api/generate-idea", values);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Idea generated!",
        description: "Your game concept has been created successfully."
      });
      onIdeaGenerated(data);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate idea",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const improvePromptMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      checkCooldown();
      lastRequestTime.current = Date.now();
      const res = await apiRequest("POST", "/api/improve-prompt", values);
      return res.json();
    },
    onSuccess: (data) => {
      form.setValue("description", data.improvedPrompt);
      toast({
        title: "Prompt improved!",
        description: data.reasoning
      });
      setIsImproving(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to improve prompt",
        description: error.message,
        variant: "destructive"
      });
      setIsImproving(false);
    }
  });

  const handleImprovePrompt = useCallback(() => {
    const description = form.getValues("description");
    if (!description) {
      toast({
        title: "No description",
        description: "Please enter a description first.",
        variant: "destructive"
      });
      return;
    }
    setIsImproving(true);
    improvePromptMutation.mutate({ description });
  }, [form, improvePromptMutation, toast]);

  // Update cooldown timer
  useEffect(() => {
    if (cooldownRemaining > 0) {
      const interval = setInterval(() => {
        setCooldownRemaining(prev => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [cooldownRemaining]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => generateMutation.mutate(data))} className="space-y-4">
        {generateMutation.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {generateMutation.error.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <FormLabel className="text-xs sm:text-sm text-muted-foreground">Sample Prompts</FormLabel>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {samplePrompts.map((prompt, index) => (
              <Button
                key={index}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => form.setValue("description", prompt.description)}
                className="text-[10px] sm:text-xs"
              >
                {prompt.title}
              </Button>
            ))}
          </div>
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Describe Your Game Idea</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe your game concept in a few sentences..." 
                  className="h-24 sm:h-32 resize-none text-sm"
                  {...field} 
                  disabled={generateMutation.isPending || isImproving}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleImprovePrompt}
            disabled={generateMutation.isPending || isImproving || cooldownRemaining > 0}
            className="flex-1 text-xs sm:text-sm"
          >
            {isImproving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Improving...
              </>
            ) : cooldownRemaining > 0 ? (
              `Wait ${Math.ceil(cooldownRemaining / 1000)}s`
            ) : (
              <>
                <Wand2 className="h-4 w-4 mr-2" />
                Improve Prompt
              </>
            )}
          </Button>
          <Button 
            type="submit" 
            className="flex-1 text-xs sm:text-sm"
            disabled={generateMutation.isPending || isImproving || cooldownRemaining > 0}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : cooldownRemaining > 0 ? (
              `Wait ${Math.ceil(cooldownRemaining / 1000)}s`
            ) : (
              'Generate Game Concept'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
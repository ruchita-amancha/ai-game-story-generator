import { useAuth } from "@/hooks/use-auth";
import PremiumFeaturesCard from "@/components/premium-features-card";
import { GamepadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default function PremiumPage() {
  const { user, logoutMutation } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <GamepadIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Game Story Generator
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Welcome, {user?.username}</span>
            <Button variant="ghost" size="sm" onClick={() => logoutMutation.mutate()}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-center">Premium Features</h2>
            <p className="text-muted-foreground text-center">
              Unlock advanced features and enhance your game story generation experience
            </p>
          </div>
          <PremiumFeaturesCard />
        </div>
      </main>
    </div>
  );
}

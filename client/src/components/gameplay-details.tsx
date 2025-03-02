import { GameplayDetails } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Move, 
  Swords, 
  Gamepad2,
  Box,
  ArrowRight
} from "lucide-react";

interface GameplayDetailsProps {
  details: GameplayDetails;
  title: string;
}

export default function GameplayDetailsDisplay({ details, title }: GameplayDetailsProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">{title}</CardTitle>
        <CardDescription>
          Detailed gameplay mechanics and systems
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-6">
            {/* Player Movement */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Move className="h-5 w-5" />
                <h3 className="font-semibold">Player Movement</h3>
              </div>
              
              <div className="pl-7 space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Basic Controls</h4>
                  <div className="flex flex-wrap gap-2">
                    {details.playerMovement.basicControls.map((control, index) => (
                      <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {control}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Special Moves</h4>
                  <div className="flex flex-wrap gap-2">
                    {details.playerMovement.specialMoves.map((move, index) => (
                      <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {move}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Navigation</h4>
                  <p className="text-sm">{details.playerMovement.navigationMechanics}</p>
                </div>
              </div>
            </div>

            {/* Core Mechanics */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Gamepad2 className="h-5 w-5" />
                <h3 className="font-semibold">Core Mechanics</h3>
              </div>
              
              <div className="pl-7 space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Main Gameplay</h4>
                  <p className="text-sm">{details.coreMechanics.mainGameplay}</p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Unique Features</h4>
                  <ul className="space-y-2">
                    {details.coreMechanics.uniqueFeatures.map((feature, index) => (
                      <li key={index} className="text-sm flex items-center gap-2">
                        <ArrowRight className="h-3 w-3 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Progression</h4>
                  <p className="text-sm">{details.coreMechanics.progression}</p>
                </div>
              </div>
            </div>

            {/* Combat System */}
            {details.combatSystem && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <Swords className="h-5 w-5" />
                  <h3 className="font-semibold">Combat System</h3>
                </div>
                
                <div className="pl-7 space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Attack Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {details.combatSystem.attackTypes.map((attack, index) => (
                        <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {attack}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Defense Options</h4>
                    <div className="flex flex-wrap gap-2">
                      {details.combatSystem.defenseOptions.map((defense, index) => (
                        <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {defense}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Special Abilities</h4>
                    <div className="flex flex-wrap gap-2">
                      {details.combatSystem.specialAbilities.map((ability, index) => (
                        <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {ability}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Environment Interaction */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <Box className="h-5 w-5" />
                <h3 className="font-semibold">Environment Interaction</h3>
              </div>
              
              <div className="pl-7 space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Interactive Elements</h4>
                  <div className="flex flex-wrap gap-2">
                    {details.environmentInteraction.interactiveElements.map((element, index) => (
                      <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        {element}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Environmental Mechanics</h4>
                  <p className="text-sm">{details.environmentInteraction.environmentalMechanics}</p>
                </div>

                {details.environmentInteraction.puzzleTypes && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Puzzle Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {details.environmentInteraction.puzzleTypes.map((puzzle, index) => (
                        <span key={index} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                          {puzzle}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

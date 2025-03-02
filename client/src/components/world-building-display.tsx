import { WorldBuildingDetails } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import {
  Globe,
  Library,
  Users,
  Mountain,
  Scroll,
  Crown,
  BookOpen,
  Star
} from "lucide-react";

interface WorldBuildingProps {
  details: WorldBuildingDetails;
  title: string;
}

const MotionCard = motion(Card);
const MotionDiv = motion.div;

export default function WorldBuildingDisplay({ details, title }: WorldBuildingProps) {
  const hoverScale = {
    hover: { scale: 1.02, transition: { duration: 0.2 } }
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 }
  };

  const cardHover = {
    hover: {
      boxShadow: "0 8px 30px rgba(0, 0, 0, 0.12)",
      background: "rgba(var(--primary-rgb), 0.08)",
      transition: { duration: 0.2 }
    }
  };

  return (
    <MotionCard
      className="w-full max-w-[95vw] mx-auto md:max-w-3xl lg:max-w-4xl xl:max-w-6xl"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <CardHeader>
        <CardTitle className="text-lg md:text-xl font-bold">{title}</CardTitle>
        <CardDescription className="text-sm md:text-base">
          World details and lore
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[80vh] pr-4">
          <div className="space-y-4 md:space-y-6">
            {/* Cosmology */}
            <MotionDiv
              initial="initial"
              animate="animate"
              whileHover="hover"
              variants={fadeInUp}
              className="space-y-2 md:space-y-3"
            >
              <div className="flex items-center gap-2 text-primary">
                <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <Globe className="h-4 w-4 md:h-5 md:w-5" />
                </motion.div>
                <h3 className="font-semibold text-sm md:text-base">Cosmology</h3>
              </div>
              <div className="pl-4 md:pl-7 space-y-2 md:space-y-3">
                <motion.p
                  className="text-xs md:text-sm"
                  whileHover={{ x: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  {details.cosmology.origin}
                </motion.p>
                {details.cosmology.magicSystem && (
                  <MotionDiv
                    whileHover="hover"
                    variants={cardHover}
                    className="bg-primary/5 rounded-lg p-2 md:p-3"
                  >
                    <h4 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Magic System</h4>
                    <p className="text-xs md:text-sm">{details.cosmology.magicSystem}</p>
                  </MotionDiv>
                )}
                {details.cosmology.technology && (
                  <MotionDiv
                    whileHover="hover"
                    variants={cardHover}
                    className="bg-primary/5 rounded-lg p-2 md:p-3"
                  >
                    <h4 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Technology</h4>
                    <p className="text-xs md:text-sm">{details.cosmology.technology}</p>
                  </MotionDiv>
                )}
                <div>
                  <h4 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Natural Laws</h4>
                  <ul className="space-y-1">
                    {details.cosmology.naturalLaws.map((law, index) => (
                      <motion.li
                        key={index}
                        className="text-xs md:text-sm flex items-center gap-2"
                        whileHover={{ x: 5, color: "var(--primary)" }}
                        transition={{ duration: 0.2 }}
                      >
                        <motion.div
                          whileHover={{ rotate: 180, scale: 1.2 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Star className="h-3 w-3 text-primary shrink-0" />
                        </motion.div>
                        {law}
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>
            </MotionDiv>

            {/* Environment */}
            <MotionDiv
              initial="initial"
              animate="animate"
              whileHover="hover"
              variants={fadeInUp}
              className="space-y-2 md:space-y-3"
            >
              <div className="flex items-center gap-2 text-primary">
                <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <Mountain className="h-4 w-4 md:h-5 md:w-5" />
                </motion.div>
                <h3 className="font-semibold text-sm md:text-base">Environment</h3>
              </div>
              <div className="pl-4 md:pl-7 space-y-2 md:space-y-3">
                <MotionDiv
                  whileHover="hover"
                  variants={cardHover}
                  className="bg-primary/5 rounded-lg p-2 md:p-3"
                >
                  <h4 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Geography</h4>
                  <p className="text-xs md:text-sm">{details.environment.geography}</p>
                </MotionDiv>
                <MotionDiv
                  whileHover="hover"
                  variants={cardHover}
                  className="bg-primary/5 rounded-lg p-2 md:p-3"
                >
                  <h4 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Climate</h4>
                  <p className="text-xs md:text-sm">{details.environment.climate}</p>
                </MotionDiv>
                <div>
                  <h4 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Notable Landmarks</h4>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {details.environment.landmarks.map((landmark, index) => (
                      <motion.span
                        key={index}
                        className="text-[10px] md:text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                        whileHover={{ scale: 1.1, backgroundColor: "var(--primary)", color: "white" }}
                        transition={{ duration: 0.2 }}
                      >
                        {landmark}
                      </motion.span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Major Settlements</h4>
                  <div className="grid gap-2 md:gap-3">
                    {details.environment.settlements.map((settlement, index) => (
                      <MotionDiv
                        key={index}
                        className="bg-primary/5 rounded-lg p-2 md:p-3 space-y-1 md:space-y-2"
                        whileHover="hover"
                        variants={cardHover}
                      >
                        <h5 className="font-medium text-xs md:text-sm">{settlement.name}</h5>
                        <p className="text-xs md:text-sm">{settlement.description}</p>
                        <p className="text-xs md:text-sm text-primary">{settlement.significance}</p>
                      </MotionDiv>
                    ))}
                  </div>
                </div>
              </div>
            </MotionDiv>

            {/* Society */}
            <MotionDiv
              initial="initial"
              animate="animate"
              whileHover="hover"
              variants={fadeInUp}
              className="space-y-2 md:space-y-3"
            >
              <div className="flex items-center gap-2 text-primary">
                <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <Users className="h-4 w-4 md:h-5 md:w-5" />
                </motion.div>
                <h3 className="font-semibold text-sm md:text-base">Society</h3>
              </div>
              <div className="pl-4 md:pl-7 space-y-2 md:space-y-3">
                <div>
                  <h4 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Factions</h4>
                  <div className="grid gap-2 md:gap-3">
                    {details.society.factions.map((faction, index) => (
                      <MotionDiv
                        key={index}
                        className="bg-primary/5 rounded-lg p-2 md:p-3 space-y-1 md:space-y-2"
                        whileHover="hover"
                        variants={cardHover}
                      >
                        <h5 className="font-medium text-xs md:text-sm">{faction.name}</h5>
                        <p className="text-xs md:text-sm">{faction.description}</p>
                        <div className="text-xs md:text-sm">
                          <span className="text-primary">Relationships:</span> {faction.relationships}
                        </div>
                        <div className="text-xs md:text-sm">
                          <span className="text-primary">Influence:</span> {faction.influence}
                        </div>
                      </MotionDiv>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Cultures</h4>
                  <div className="grid gap-2 md:gap-3">
                    {details.society.cultures.map((culture, index) => (
                      <MotionDiv
                        key={index}
                        className="bg-primary/5 rounded-lg p-2 md:p-3 space-y-1 md:space-y-2"
                        whileHover="hover"
                        variants={cardHover}
                      >
                        <h5 className="font-medium text-xs md:text-sm">{culture.name}</h5>
                        <div>
                          <span className="text-primary text-xs md:text-sm">Beliefs:</span>
                          <p className="text-xs md:text-sm">{culture.beliefs}</p>
                        </div>
                        <div>
                          <span className="text-primary text-xs md:text-sm">Traditions:</span>
                          <ul className="list-disc pl-4 md:pl-5 text-xs md:text-sm">
                            {culture.traditions.map((tradition, idx) => (
                              <motion.li key={idx} whileHover={{ x: 5 }} transition={{ duration: 0.2 }}>{tradition}</motion.li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <span className="text-primary text-xs md:text-sm">Customs & Rituals:</span>
                          <ul className="list-disc pl-4 md:pl-5 text-xs md:text-sm">
                            {culture.customsAndRituals.map((custom, idx) => (
                              <motion.li key={idx} whileHover={{ x: 5 }} transition={{ duration: 0.2 }}>{custom}</motion.li>
                            ))}
                          </ul>
                        </div>
                      </MotionDiv>
                    ))}
                  </div>
                </div>
                <MotionDiv
                  whileHover="hover"
                  variants={cardHover}
                  className="bg-primary/5 rounded-lg p-2 md:p-3 space-y-1 md:space-y-2"
                >
                  <h4 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Politics</h4>
                  <div>
                    <span className="text-primary text-xs md:text-sm">Power Structure:</span>
                    <p className="text-xs md:text-sm">{details.society.politics.powerStructure}</p>
                  </div>
                  <div>
                    <span className="text-primary text-xs md:text-sm">Major Conflicts:</span>
                    <ul className="list-disc pl-4 md:pl-5 text-xs md:text-sm">
                      {details.society.politics.majorConflicts.map((conflict, index) => (
                        <motion.li key={index} whileHover={{ x: 5 }} transition={{ duration: 0.2 }}>{conflict}</motion.li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-primary text-xs md:text-sm">Alliances:</span>
                    <ul className="list-disc pl-4 md:pl-5 text-xs md:text-sm">
                      {details.society.politics.alliances.map((alliance, index) => (
                        <motion.li key={index} whileHover={{ x: 5 }} transition={{ duration: 0.2 }}>{alliance}</motion.li>
                      ))}
                    </ul>
                  </div>
                </MotionDiv>
              </div>
            </MotionDiv>

            {/* History */}
            <MotionDiv
              initial="initial"
              animate="animate"
              whileHover="hover"
              variants={fadeInUp}
              className="space-y-2 md:space-y-3"
            >
              <div className="flex items-center gap-2 text-primary">
                <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                  <Scroll className="h-4 w-4 md:h-5 md:w-5" />
                </motion.div>
                <h3 className="font-semibold text-sm md:text-base">History</h3>
              </div>
              <div className="pl-4 md:pl-7 space-y-2 md:space-y-3">
                <div>
                  <h4 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Timeline</h4>
                  <div className="space-y-2 md:space-y-3">
                    {details.history.timeline.map((era, index) => (
                      <MotionDiv
                        key={index}
                        className="bg-primary/5 rounded-lg p-2 md:p-3 space-y-1 md:space-y-2"
                        whileHover="hover"
                        variants={cardHover}
                      >
                        <h5 className="font-medium text-xs md:text-sm">{era.era}</h5>
                        <p className="text-xs md:text-sm">{era.description}</p>
                        <div>
                          <span className="text-primary text-xs md:text-sm">Key Events:</span>
                          <ul className="list-disc pl-4 md:pl-5 text-xs md:text-sm">
                            {era.significantEvents.map((event, idx) => (
                              <motion.li key={idx} whileHover={{ x: 5 }} transition={{ duration: 0.2 }}>{event}</motion.li>
                            ))}
                          </ul>
                        </div>
                      </MotionDiv>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Legends</h4>
                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {details.history.legends.map((legend, index) => (
                      <motion.span
                        key={index}
                        className="text-[10px] md:text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                        whileHover={{ scale: 1.1, backgroundColor: "var(--primary)", color: "white" }}
                        transition={{ duration: 0.2 }}
                      >
                        {legend}
                      </motion.span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="text-xs md:text-sm font-medium text-muted-foreground mb-1 md:mb-2">Artifacts</h4>
                  <div className="grid gap-2 md:gap-3">
                    {details.history.artifacts.map((artifact, index) => (
                      <MotionDiv
                        key={index}
                        className="bg-primary/5 rounded-lg p-2 md:p-3 space-y-1 md:space-y-2"
                        whileHover="hover"
                        variants={cardHover}
                      >
                        <h5 className="font-medium text-xs md:text-sm">{artifact.name}</h5>
                        <p className="text-xs md:text-sm">{artifact.description}</p>
                        <p className="text-xs md:text-sm text-primary">{artifact.significance}</p>
                      </MotionDiv>
                    ))}
                  </div>
                </div>
              </div>
            </MotionDiv>
          </div>
        </ScrollArea>
      </CardContent>
    </MotionCard>
  );
}
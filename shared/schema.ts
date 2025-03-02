import { pgTable, text, serial, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isPremium: boolean("is_premium").notNull().default(false),
  premiumUntil: timestamp("premium_until"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry")
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    username: true,
    email: true,
    password: true,
  })
  .extend({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters")
  });

export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  genre: text("genre").notNull(),
  gameTitle: text("game_title").notNull(),
  mainCharacter: text("main_character").notNull(),
  storyLength: text("story_length").notNull(),
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const gamePlans = pgTable("game_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  genre: text("genre").notNull(),
  gameTitle: text("game_title").notNull(),
  mainCharacter: text("main_character").notNull(),
  conceptDescription: text("concept_description").notNull(),
  gameplayDetails: jsonb("gameplay_details"),
  worldBuildingDetails: jsonb("world_building_details"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

export const insertStorySchema = createInsertSchema(stories).pick({
  userId: true,
  genre: true,
  gameTitle: true,
  mainCharacter: true,
  storyLength: true,
  content: true
});

export const insertGamePlanSchema = createInsertSchema(gamePlans).pick({
  userId: true,
  genre: true,
  gameTitle: true,
  mainCharacter: true,
  conceptDescription: true,
  gameplayDetails: true,
  worldBuildingDetails: true
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;
export type Story = typeof stories.$inferSelect;
export type InsertGamePlan = z.infer<typeof insertGamePlanSchema>;
export type GamePlan = typeof gamePlans.$inferSelect;

export const storyGenreSchema = z.enum([
  "Fantasy",
  "Sci-Fi", 
  "Horror",
  "Mystery",
  "RPG"
]);

export const storyLengthSchema = z.enum([
  "Short",
  "Medium",
  "Long"
]);

export type StoryGenre = z.infer<typeof storyGenreSchema>;
export type StoryLength = z.infer<typeof storyLengthSchema>;

// Gameplay mechanics schema
export interface GameplayDetails {
  playerMovement: {
    basicControls: string[];
    specialMoves: string[];
    navigationMechanics: string;
  };
  coreMechanics: {
    mainGameplay: string;
    uniqueFeatures: string[];
    progression: string;
  };
  combatSystem?: {
    attackTypes: string[];
    defenseOptions: string[];
    specialAbilities: string[];
  };
  environmentInteraction: {
    interactiveElements: string[];
    environmentalMechanics: string;
    puzzleTypes?: string[];
  };
}

// Add after the GameplayDetails interface
export interface WorldBuildingDetails {
  worldName: string;
  cosmology: {
    origin: string;
    magicSystem?: string;
    technology?: string;
    naturalLaws: string[];
  };
  environment: {
    geography: string;
    climate: string;
    landmarks: string[];
    settlements: Array<{
      name: string;
      description: string;
      significance: string;
    }>;
  };
  society: {
    factions: Array<{
      name: string;
      description: string;
      relationships: string;
      influence: string;
    }>;
    cultures: Array<{
      name: string;
      traditions: string[];
      beliefs: string;
      customsAndRituals: string[];
    }>;
    politics: {
      powerStructure: string;
      majorConflicts: string[];
      alliances: string[];
    };
  };
  history: {
    timeline: Array<{
      era: string;
      description: string;
      significantEvents: string[];
    }>;
    legends: string[];
    artifacts: Array<{
      name: string;
      description: string;
      significance: string;
    }>;
  };
}

// Update Premium feature limits
export const FREE_TIER_LIMITS = {
  GENERATIONS_PER_DAY: 3,
  STORY_LENGTH_LIMIT: "Medium" as StoryLength,
  GAMEPLAY_DETAILS: false,
  IMPROVE_PROMPT: false,
  WORLD_BUILDING: false
} as const;

export const PREMIUM_TIER_LIMITS = {
  GENERATIONS_PER_DAY: 50,
  STORY_LENGTH_LIMIT: "Long" as StoryLength,
  GAMEPLAY_DETAILS: true,
  IMPROVE_PROMPT: true,
  WORLD_BUILDING: true
} as const;
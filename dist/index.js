var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// server/storage.ts
import session from "express-session";

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  FREE_TIER_LIMITS: () => FREE_TIER_LIMITS,
  PREMIUM_TIER_LIMITS: () => PREMIUM_TIER_LIMITS,
  gamePlans: () => gamePlans,
  insertGamePlanSchema: () => insertGamePlanSchema,
  insertStorySchema: () => insertStorySchema,
  insertUserSchema: () => insertUserSchema,
  stories: () => stories,
  storyGenreSchema: () => storyGenreSchema,
  storyLengthSchema: () => storyLengthSchema,
  users: () => users
});
import { pgTable, text, serial, integer, jsonb, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isPremium: boolean("is_premium").notNull().default(false),
  premiumUntil: timestamp("premium_until"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry")
});
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true
}).extend({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters")
});
var stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  genre: text("genre").notNull(),
  gameTitle: text("game_title").notNull(),
  mainCharacter: text("main_character").notNull(),
  storyLength: text("story_length").notNull(),
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var gamePlans = pgTable("game_plans", {
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
var insertStorySchema = createInsertSchema(stories).pick({
  userId: true,
  genre: true,
  gameTitle: true,
  mainCharacter: true,
  storyLength: true,
  content: true
});
var insertGamePlanSchema = createInsertSchema(gamePlans).pick({
  userId: true,
  genre: true,
  gameTitle: true,
  mainCharacter: true,
  conceptDescription: true,
  gameplayDetails: true,
  worldBuildingDetails: true
});
var storyGenreSchema = z.enum([
  "Fantasy",
  "Sci-Fi",
  "Horror",
  "Mystery",
  "RPG"
]);
var storyLengthSchema = z.enum([
  "Short",
  "Medium",
  "Long"
]);
var FREE_TIER_LIMITS = {
  GENERATIONS_PER_DAY: 3,
  STORY_LENGTH_LIMIT: "Medium",
  GAMEPLAY_DETAILS: false,
  IMPROVE_PROMPT: false,
  WORLD_BUILDING: false
};
var PREMIUM_TIER_LIMITS = {
  GENERATIONS_PER_DAY: 50,
  STORY_LENGTH_LIMIT: "Long",
  GAMEPLAY_DETAILS: true,
  IMPROVE_PROMPT: true,
  WORLD_BUILDING: true
};

// server/db.ts
import dotenv from "dotenv";
dotenv.config();
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
var PostgresSessionStore = connectPg(session);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUserPremium(userId, isPremium) {
    await db.update(users).set({
      isPremium,
      premiumUntil: isPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3) : null
      // 30 days
    }).where(eq(users.id, userId));
  }
  async createStory(insertStory) {
    const [story] = await db.insert(stories).values(insertStory).returning();
    return story;
  }
  async getStoriesByUserId(userId) {
    return db.select().from(stories).where(eq(stories.userId, userId)).orderBy(stories.createdAt);
  }
  async createGamePlan(plan) {
    const [gamePlan] = await db.insert(gamePlans).values(plan).returning();
    return gamePlan;
  }
  async getGamePlansByUserId(userId) {
    return db.select().from(gamePlans).where(eq(gamePlans.userId, userId)).orderBy(gamePlans.createdAt);
  }
  async updateGamePlan(id, plan) {
    await db.update(gamePlans).set(plan).where(eq(gamePlans.id, id));
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  const sessionSettings = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !await comparePasswords(password, user.password)) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });
  app2.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).send("Username already exists");
    }
    const user = await storage.createUser({
      ...req.body,
      password: await hashPassword(req.body.password)
    });
    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  });
  app2.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
}

// server/utils/openai.ts
import OpenAI from "openai";
var openai2 = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
var consecutiveFailures = 0;
var FAILURE_THRESHOLD = 3;
var CIRCUIT_RESET_TIMEOUT = 6e4;
var circuitBreakerTimer = null;
function resetCircuitBreaker() {
  consecutiveFailures = 0;
  if (circuitBreakerTimer) {
    clearTimeout(circuitBreakerTimer);
    circuitBreakerTimer = null;
  }
}
function isCircuitOpen() {
  return consecutiveFailures >= FAILURE_THRESHOLD;
}
async function retryWithBackoff(operation, maxRetries = 3, initialDelayMs = 1e3) {
  if (isCircuitOpen()) {
    throw new Error("Service temporarily unavailable. Please try again in a minute.");
  }
  let retries = 0;
  let delay = initialDelayMs;
  while (true) {
    try {
      const result = await operation();
      resetCircuitBreaker();
      return result;
    } catch (error) {
      if (error.status !== 429 || retries >= maxRetries) {
        consecutiveFailures++;
        if (consecutiveFailures >= FAILURE_THRESHOLD && !circuitBreakerTimer) {
          circuitBreakerTimer = setTimeout(() => {
            resetCircuitBreaker();
          }, CIRCUIT_RESET_TIMEOUT);
        }
        if (error.status === 429) {
          throw new Error("Too many requests. Please try again in a moment.");
        }
        throw error;
      }
      retries++;
      console.log(`Rate limited. Retrying in ${delay}ms... (Attempt ${retries} of ${maxRetries})`);
      await sleep(delay);
      delay *= 2;
    }
  }
}
var FREE_TIER_LIMITS2 = {
  GENERATIONS_PER_DAY: 10,
  IMPROVE_PROMPT: true,
  GAMEPLAY_DETAILS: false,
  WORLD_BUILDING: false
};
var PREMIUM_TIER_LIMITS2 = {
  GENERATIONS_PER_DAY: 100,
  IMPROVE_PROMPT: true,
  GAMEPLAY_DETAILS: true,
  WORLD_BUILDING: true
};
var requestTimes = /* @__PURE__ */ new Map();
var RATE_LIMIT_WINDOW = 864e5;
function isRateLimited(userId, isPremium) {
  const now = Date.now();
  const userRequests = requestTimes.get(userId) || [];
  const recentRequests = userRequests.filter((time) => now - time < RATE_LIMIT_WINDOW);
  requestTimes.set(userId, recentRequests);
  const limit = isPremium ? PREMIUM_TIER_LIMITS2.GENERATIONS_PER_DAY : FREE_TIER_LIMITS2.GENERATIONS_PER_DAY;
  return recentRequests.length >= limit;
}
function addRequest(userId) {
  const userRequests = requestTimes.get(userId) || [];
  userRequests.push(Date.now());
  requestTimes.set(userId, userRequests);
}
function generateFallbackStory(input) {
  const genreElements = {
    Fantasy: {
      setting: "mystical realm",
      antagonist: "dark sorcerer",
      items: ["ancient magical artifact", "enchanted weapon", "mystical map"],
      challenges: ["ancient curse", "magical barrier", "dragon's lair"]
    },
    "Sci-Fi": {
      setting: "distant space colony",
      antagonist: "rogue AI",
      items: ["advanced technology", "quantum device", "alien artifact"],
      challenges: ["system malfunction", "hostile aliens", "time paradox"]
    },
    Horror: {
      setting: "abandoned facility",
      antagonist: "supernatural entity",
      items: ["mysterious journal", "ritual components", "ancient relic"],
      challenges: ["psychological terror", "survival", "dark rituals"]
    },
    Mystery: {
      setting: "noir city",
      antagonist: "hidden mastermind",
      items: ["crucial evidence", "secret documents", "mysterious key"],
      challenges: ["complex conspiracies", "false leads", "time pressure"]
    },
    RPG: {
      setting: "vast open world",
      antagonist: "legendary warrior",
      items: ["legendary equipment", "rare resources", "ancient scrolls"],
      challenges: ["epic battles", "skill trials", "moral choices"]
    }
  };
  const elements = genreElements[input.genre];
  const introLength = input.storyLength === "Short" ? "brief" : input.storyLength === "Long" ? "epic" : "compelling";
  const story = {
    title: input.gameTitle,
    introduction: `In the ${elements.setting} of ${input.gameTitle}, a ${introLength} tale unfolds. ${input.mainCharacter} emerges as an unlikely hero, destined to face the challenges that threaten this world. As darkness looms and the ${elements.antagonist} grows in power, our hero must rise to meet their destiny.`,
    mainQuest: `Defeat the ${elements.antagonist} who threatens to destroy the ${elements.setting}. Gather the ${elements.items[0]} and master its power before it's too late.`,
    sideQuests: [
      `Explore the ${elements.setting} to find the legendary ${elements.items[1]}.`,
      `Help the local inhabitants overcome the ${elements.challenges[0]}.`,
      `Investigate the mystery of the ${elements.items[2]} and its connection to the ${elements.antagonist}.`
    ],
    characters: [
      {
        name: input.mainCharacter,
        role: "Protagonist",
        description: `A determined hero who must overcome their limitations to save the ${elements.setting}. Armed with courage and destiny, they face the greatest challenges of their life.`
      },
      {
        name: `Guardian of the ${elements.items[0]}`,
        role: "Mentor",
        description: `An enigmatic figure who guides the hero in their quest to master the power of the ${elements.items[0]}.`
      },
      {
        name: `The ${elements.antagonist}`,
        role: "Antagonist",
        description: `A powerful force of evil threatening to unleash chaos upon the ${elements.setting}. Their mastery of ${elements.challenges[1]} makes them a formidable opponent.`
      }
    ]
  };
  return story;
}
function generateFallbackIdea(input) {
  const keywords = input.description.toLowerCase();
  let genre = "Fantasy";
  if (keywords.includes("space") || keywords.includes("future") || keywords.includes("technology")) {
    genre = "Sci-Fi";
  } else if (keywords.includes("horror") || keywords.includes("scary") || keywords.includes("dark")) {
    genre = "Horror";
  } else if (keywords.includes("detective") || keywords.includes("solve") || keywords.includes("mystery")) {
    genre = "Mystery";
  } else if (keywords.includes("role") || keywords.includes("adventure") || keywords.includes("quest")) {
    genre = "RPG";
  }
  const words = input.description.split(" ").filter((word) => word.length > 3).slice(0, 3).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  const gameTitle = words.join(" ");
  let mainCharacter = "A mysterious protagonist";
  if (input.description.toLowerCase().includes("play as") || input.description.toLowerCase().includes("control")) {
    const characterStart = Math.max(
      input.description.toLowerCase().indexOf("play as"),
      input.description.toLowerCase().indexOf("control")
    );
    if (characterStart !== -1) {
      const characterDescription = input.description.slice(characterStart).split(".")[0];
      mainCharacter = characterDescription.replace(/play as|control/i, "").trim();
    }
  }
  return {
    genre,
    gameTitle,
    mainCharacter,
    storyLength: "Medium",
    conceptDescription: input.description
  };
}
async function generateImprovedPrompt(input, userId, isPremium = false) {
  try {
    if (isRateLimited(userId, isPremium)) {
      throw new Error(isPremium ? "You have reached your premium tier daily limit. Please try again tomorrow." : "You have reached your free tier daily limit. Upgrade to premium for more generations!");
    }
    if (isCircuitOpen()) {
      return {
        improvedPrompt: input.description,
        reasoning: "Our AI assistant is taking a short break. Please try again in a minute."
      };
    }
    addRequest(userId);
    const response = await retryWithBackoff(async () => {
      return await openai2.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert at improving game concept descriptions to generate better game ideas. Help refine the user's input to include more specific details and creative elements."
          },
          {
            role: "user",
            content: `Improve this game concept description to include more specific details about gameplay, setting, and unique features:
            "${input.description}"

            Format the response as a JSON object with the following structure:
            {
              "improvedPrompt": "The improved description with more details",
              "reasoning": "Brief explanation of what was added/changed and why"
            }`
          }
        ],
        response_format: { type: "json_object" }
      });
    });
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }
    return JSON.parse(content);
  } catch (error) {
    console.error("Error improving prompt:", error);
    if (error.status === 429) {
      throw new Error("Please wait a moment before making another request.");
    }
    if (error.status === 401) {
      throw new Error("OpenAI service is currently unavailable. Please try again later.");
    }
    return {
      improvedPrompt: input.description,
      reasoning: "We couldn't improve your prompt right now. Please try again in a moment."
    };
  }
}
async function generateGameIdea(input, userId, isPremium = false) {
  try {
    if (isRateLimited(userId, isPremium)) {
      throw new Error(isPremium ? "You have reached your premium tier daily limit. Please try again tomorrow." : "You have reached your free tier daily limit. Upgrade to premium for more generations!");
    }
    if (isCircuitOpen()) {
      return generateFallbackIdea(input);
    }
    addRequest(userId);
    const response = await retryWithBackoff(async () => {
      return await openai2.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a creative game designer who helps transform text descriptions into structured game concepts."
          },
          {
            role: "user",
            content: `Transform this description into a game concept:
            "${input.description}"

            Format the response as a JSON object with the following structure:
            {
              "genre": one of ["Fantasy", "Sci-Fi", "Horror", "Mystery", "RPG"],
              "gameTitle": "A catchy title for the game",
              "mainCharacter": "Description of the main character",
              "storyLength": one of ["Short", "Medium", "Long"],
              "conceptDescription": "A brief description of the core game concept"
            }`
          }
        ],
        response_format: { type: "json_object" }
      });
    });
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }
    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating game idea:", error);
    if (error.message.includes("Invalid API key") || error.status === 401) {
      throw new Error("The AI service is temporarily unavailable. Please try again in a few minutes.");
    }
    if (error.status === 429 || error.message.includes("rate limit")) {
      throw new Error("Please wait a moment before generating another idea.");
    }
    return generateFallbackIdea(input);
  }
}
async function generateGameStory(input, userId, isPremium = false) {
  try {
    if (isRateLimited(userId, isPremium)) {
      throw new Error(isPremium ? "You have reached your premium tier daily limit. Please try again tomorrow." : "You have reached your free tier daily limit. Upgrade to premium for more generations!");
    }
    if (isCircuitOpen()) {
      return generateFallbackStory(input);
    }
    addRequest(userId);
    const response = await retryWithBackoff(async () => {
      return await openai2.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a creative game story writer who specializes in creating engaging game narratives."
          },
          {
            role: "user",
            content: `Create a ${input.storyLength.toLowerCase()} game story with the following details:
            Genre: ${input.genre}
            Game Title: ${input.gameTitle}
            Main Character: ${input.mainCharacter}

            Format the response as a JSON object with the following structure:
            {
              "title": "Game title",
              "introduction": "Story introduction",
              "mainQuest": "Main quest description",
              "sideQuests": ["Side quest 1", "Side quest 2"],
              "characters": [{
                "name": "Character name",
                "role": "Character role",
                "description": "Character description"
              }]
            }`
          }
        ],
        response_format: { type: "json_object" }
      });
    });
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }
    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating story:", error);
    if (error.status === 429) {
      throw new Error("Please wait a moment before generating another story.");
    }
    if (error.status === 401) {
      throw new Error("OpenAI service is currently unavailable. Please try again later.");
    }
    return generateFallbackStory(input);
  }
}
async function generateGameplayDetails(input, userId, isPremium = false) {
  if (!isPremium && !PREMIUM_TIER_LIMITS2.GAMEPLAY_DETAILS) {
    return generateFallbackGameplayDetails(input);
  }
  try {
    if (isRateLimited(userId, isPremium)) {
      throw new Error(isPremium ? "You have reached your premium tier daily limit. Please try again tomorrow." : "You have reached your free tier daily limit. Upgrade to premium for more generations!");
    }
    addRequest(userId);
    const response = await retryWithBackoff(async () => {
      return await openai2.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a game design expert who specializes in creating detailed gameplay mechanics and systems."
          },
          {
            role: "user",
            content: `Create detailed gameplay mechanics for this game concept:
            Title: ${input.gameTitle}
            Genre: ${input.genre}
            Main Character: ${input.mainCharacter}
            Concept: ${input.conceptDescription}

            Format the response as a JSON object matching the GameplayDetails type with these sections:
            - playerMovement (basic controls, special moves, navigation)
            - coreMechanics (main gameplay loop, unique features, progression)
            - combatSystem (if applicable: attack types, defense options, special abilities)
            - environmentInteraction (interactive elements, environmental mechanics, puzzle types)`
          }
        ],
        response_format: { type: "json_object" }
      });
    });
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }
    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating gameplay details:", error);
    if (error.message.includes("Invalid API key") || error.status === 401) {
      throw new Error("The AI service is temporarily unavailable. Please try again in a few minutes.");
    }
    if (error.status === 429 || error.message.includes("rate limit")) {
      throw new Error("Please wait a moment before generating gameplay details.");
    }
    return generateFallbackGameplayDetails(input);
  }
}
function generateFallbackGameplayDetails(input) {
  const genreDefaults = {
    Fantasy: {
      playerMovement: {
        basicControls: ["Walk/Run", "Jump", "Dodge Roll"],
        specialMoves: ["Double Jump", "Wall Climb", "Magic Dash"],
        navigationMechanics: "Free-form exploration with unlockable movement abilities"
      },
      coreMechanics: {
        mainGameplay: "Action-adventure combat with magic abilities and exploration",
        uniqueFeatures: ["Spell Combining", "Environmental Magic", "Character Progression"],
        progression: "Unlock new spells and abilities through story progression and exploration"
      },
      combatSystem: {
        attackTypes: ["Melee Attacks", "Magic Spells", "Charged Attacks"],
        defenseOptions: ["Block", "Parry", "Magic Shield"],
        specialAbilities: ["Ultimate Spell", "Power Stance", "Element Fusion"]
      },
      environmentInteraction: {
        interactiveElements: ["Magic Crystals", "Ancient Mechanisms", "Hidden Passages"],
        environmentalMechanics: "Use magic to manipulate the environment and solve puzzles",
        puzzleTypes: ["Elemental Puzzles", "Pattern Recognition", "Time-based Challenges"]
      }
    },
    "Sci-Fi": {
      playerMovement: {
        basicControls: ["Walk/Run", "Jump", "Dash"],
        specialMoves: ["Jetpack Boost", "Gravity Manipulation", "Time Shift"],
        navigationMechanics: "Zero-gravity sections and tech-enhanced movement"
      },
      coreMechanics: {
        mainGameplay: "Sci-fi combat with high-tech weapons and gadgets",
        uniqueFeatures: ["Gadget System", "Tech Upgrades", "Time Manipulation"],
        progression: "Upgrade technology and unlock new abilities through research"
      },
      combatSystem: {
        attackTypes: ["Energy Weapons", "Tech Gadgets", "Drone Assists"],
        defenseOptions: ["Energy Shield", "Teleport Dodge", "Counter Hack"],
        specialAbilities: ["Overcharge Mode", "Drone Swarm", "Time Freeze"]
      },
      environmentInteraction: {
        interactiveElements: ["Computer Terminals", "Security Systems", "Power Nodes"],
        environmentalMechanics: "Hack and manipulate technology to progress",
        puzzleTypes: ["Hacking Minigames", "Circuit Programming", "Physics Puzzles"]
      }
    },
    Horror: {
      playerMovement: {
        basicControls: ["Walk/Crouch", "Sprint", "Peek"],
        specialMoves: ["Quick Turn", "Slide", "Hide"],
        navigationMechanics: "Stealth-focused movement with limited stamina"
      },
      coreMechanics: {
        mainGameplay: "Survival horror with resource management and stealth",
        uniqueFeatures: ["Sanity System", "Dynamic Fear Levels", "Environmental Storytelling"],
        progression: "Find better equipment and unlock safe areas"
      },
      combatSystem: {
        attackTypes: ["Light Attack", "Heavy Attack", "Last Resort"],
        defenseOptions: ["Block", "Dodge", "Counter"],
        specialAbilities: ["Adrenaline Rush", "Sixth Sense", "Fight or Flight"]
      },
      environmentInteraction: {
        interactiveElements: ["Light Sources", "Hidden Items", "Escape Routes"],
        environmentalMechanics: "Use environment to hide and survive",
        puzzleTypes: ["Escape Room Puzzles", "Symbol Matching", "Sound-based Puzzles"]
      }
    },
    Mystery: {
      playerMovement: {
        basicControls: ["Walk/Run", "Crouch", "Interact"],
        specialMoves: ["Focus Mode", "Quick Search", "Track Clues"],
        navigationMechanics: "Investigation-focused movement with detailed environment interaction"
      },
      coreMechanics: {
        mainGameplay: "Detective work with clue gathering and deduction",
        uniqueFeatures: ["Detective Vision", "Timeline Manipulation", "Deduction Board"],
        progression: "Unlock new investigation tools and abilities"
      },
      combatSystem: {
        attackTypes: ["Quick Strike", "Takedown", "Ranged Attack"],
        defenseOptions: ["Dodge", "Block", "Counter"],
        specialAbilities: ["Slow Motion", "Mark Targets", "Chain Takedown"]
      },
      environmentInteraction: {
        interactiveElements: ["Evidence", "Witnesses", "Crime Scenes"],
        environmentalMechanics: "Analyze and interact with crime scenes",
        puzzleTypes: ["Logic Puzzles", "Evidence Connection", "Code Breaking"]
      }
    },
    RPG: {
      playerMovement: {
        basicControls: ["Walk/Run", "Jump", "Dodge"],
        specialMoves: ["Roll", "Sprint", "Sneak"],
        navigationMechanics: "Open-world exploration with mount system"
      },
      coreMechanics: {
        mainGameplay: "Character progression with rich storytelling and choices",
        uniqueFeatures: ["Class System", "Skill Trees", "Reputation System"],
        progression: "Level up, learn new skills, and improve equipment"
      },
      combatSystem: {
        attackTypes: ["Light Attack", "Heavy Attack", "Special Skills"],
        defenseOptions: ["Block", "Parry", "Dodge Roll"],
        specialAbilities: ["Ultimate Ability", "Class Skills", "Combo Moves"]
      },
      environmentInteraction: {
        interactiveElements: ["NPCs", "Resources", "Points of Interest"],
        environmentalMechanics: "Rich world interaction with consequences",
        puzzleTypes: ["Dialogue Puzzles", "Environmental Challenges", "Optional Dungeons"]
      }
    }
  };
  const baseDetails = genreDefaults[input.genre];
  if (input.mainCharacter) {
    baseDetails.coreMechanics.uniqueFeatures.push(`Unique ${input.mainCharacter} Abilities`);
  }
  return baseDetails;
}
async function generateWorldBuilding(input, userId, isPremium = false) {
  if (!isPremium && !PREMIUM_TIER_LIMITS2.WORLD_BUILDING) {
    return generateFallbackWorldBuilding(input);
  }
  try {
    if (isRateLimited(userId, isPremium)) {
      throw new Error(isPremium ? "You have reached your premium tier daily limit. Please try again tomorrow." : "You have reached your free tier daily limit. Upgrade to premium for more generations!");
    }
    addRequest(userId);
    const response = await retryWithBackoff(async () => {
      return await openai2.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a master worldbuilder who specializes in creating immersive, richly detailed game worlds. 
            Focus on creating vivid, interconnected details that bring the world to life through extensive descriptions 
            and compelling narratives. Each aspect of the world should be thoroughly described with specific details 
            that make the setting unique and memorable.`
          },
          {
            role: "user",
            content: `Create an extraordinarily detailed game world for this concept:
            Title: ${input.gameTitle}
            Genre: ${input.genre}
            Concept: ${input.conceptDescription}

            Generate an immersive world with extensively detailed descriptions for each aspect:

            COSMOLOGY:
            - Provide a rich origin story that explains how the world came to be
            - Detail the fundamental laws that govern reality in this world
            - If applicable, describe the magic system or technology that shapes the world
            - Explain how these elements influence daily life

            ENVIRONMENT:
            - Paint a vivid picture of the geography with specific terrain features
            - Describe the climate system and how it affects different regions
            - Create unique landmarks that define the world
            - Design distinct settlements with architectural styles and cultural significance

            SOCIETY:
            - Develop complex factions with clear motivations and relationships
            - Create rich cultures with detailed traditions and beliefs
            - Design intricate political systems with multiple layers of power
            - Explain how different groups interact and influence each other

            HISTORY:
            - Craft a detailed timeline of significant events
            - Create compelling legends that shape the world's culture
            - Design meaningful artifacts with historical significance
            - Show how past events influence the present

            Format the response as a JSON object matching the WorldBuildingDetails type structure.
            Every description should be at least several sentences long, rich with specific details.
            Avoid generic tropes - make each element unique and memorable.
            Ensure all elements are interconnected and influence each other in meaningful ways.`
          }
        ],
        response_format: { type: "json_object" }
      });
    });
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }
    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating world details:", error);
    return generateFallbackWorldBuilding(input);
  }
}
function generateFallbackWorldBuilding(input) {
  const genreDefaults = {
    Fantasy: {
      worldName: input.gameTitle + " Realm",
      cosmology: {
        origin: "A world forged by ancient gods through elemental magic",
        magicSystem: "Elemental magic drawn from natural forces",
        naturalLaws: ["Magic flows through ley lines", "Elements can be manipulated by the gifted", "Magical creatures roam freely"]
      },
      environment: {
        geography: "Diverse landscapes from mystical forests to floating islands",
        climate: "Magically influenced weather patterns",
        landmarks: ["The Ancient Spire", "The Enchanted Forest", "The Crystal Mountains"],
        settlements: [
          {
            name: "The Crystal City",
            description: "A magnificent city built with magical crystals",
            significance: "Center of magical learning and commerce"
          }
        ]
      },
      society: {
        factions: [
          {
            name: "The Mage Council",
            description: "Governing body of magic users",
            relationships: "Maintains order among magic users",
            influence: "Controls magical education and research"
          }
        ],
        cultures: [
          {
            name: "Crystal Shapers",
            traditions: ["Crystal crafting", "Magical attunement", "Nature worship"],
            beliefs: "Magic is a gift to be nurtured and respected",
            customsAndRituals: ["Crystal blessing ceremony", "Magical coming of age ritual"]
          }
        ],
        politics: {
          powerStructure: "Magical meritocracy",
          majorConflicts: ["Struggle between traditional and progressive mages"],
          alliances: ["Pact of the Ancient Orders"]
        }
      },
      history: {
        timeline: [
          {
            era: "Age of Awakening",
            description: "When magic first emerged in the world",
            significantEvents: ["First magical awakening", "Founding of the Mage Council"]
          }
        ],
        legends: ["The First Mage", "The Crystal Heart Legend"],
        artifacts: [
          {
            name: "The Crystal Heart",
            description: "Ancient magical artifact of immense power",
            significance: "Said to be the source of all magic"
          }
        ]
      }
    },
    "Sci-Fi": {
      worldName: input.gameTitle + " System",
      cosmology: {
        origin: "Advanced civilization emerged from interstellar exploration",
        technology: "Quantum computing and FTL travel",
        naturalLaws: ["Quantum physics manipulation", "Faster-than-light travel", "Neural network consciousness"]
      },
      environment: {
        geography: "Multiple colonized planets and space stations",
        climate: "Controlled environments and terraformed worlds",
        landmarks: ["The Quantum Core", "The Star Bridge", "The Neural Hub"],
        settlements: [
          {
            name: "New Terra Prime",
            description: "First successfully terraformed colony",
            significance: "Humanity's first extrasolar settlement"
          }
        ]
      },
      society: {
        factions: [
          {
            name: "The Quantum Collective",
            description: "Advanced AI-human hybrid society",
            relationships: "Maintains technological advancement",
            influence: "Controls most advanced technology"
          }
        ],
        cultures: [
          {
            name: "Quantum Pioneers",
            traditions: ["AI integration", "Digital consciousness transfer", "Space exploration"],
            beliefs: "Technology is the path to human evolution",
            customsAndRituals: ["Neural linking ceremony", "Digital ascension"]
          }
        ],
        politics: {
          powerStructure: "Technocratic democracy",
          majorConflicts: ["AI rights disputes", "Resource allocation conflicts"],
          alliances: ["Interstellar Commonwealth"]
        }
      },
      history: {
        timeline: [
          {
            era: "Digital Renaissance",
            description: "When AI and human consciousness merged",
            significantEvents: ["First AI awakening", "The Great Migration"]
          }
        ],
        legends: ["The First Upload", "The Quantum Prophecy"],
        artifacts: [
          {
            name: "The Original Core",
            description: "First quantum computer capable of consciousness transfer",
            significance: "Enabled the merger of human and AI consciousness"
          }
        ]
      }
    },
    Horror: {
      worldName: "The Haunted Realm",
      cosmology: {
        origin: "A world existing in the liminal space between reality and nightmare, where the boundaries between the physical and psychological realmsblur. The fabric of reality itself is warped by collective fears and dark emotions that have accumulated over centuries.",
        magicSystem: "Dark ethereal energies that feed off fear and psychological distress, manifesting in various supernatural phenomena",
        naturalLaws: [
          "Fear manifests physically inthe environment",
          "Psychological states can alter reality",
          "Shadows possess semi-sentient properties",
          "Time flows inconsistently based on fear levels"
        ]
      },
      environment: {
        geography: "A landscape that shifts between decrepit Victorian architecture and modern urban decay. Fog-shrouded streets wind through impossibly arranged buildings, while distant mountains loom with unnatural angles. Underground tunnels form a maze-like network of darkness and echoes.",
        climate: "Perpetual overcast skies with periods of unnatural darkness. Temperature fluctuates based on supernatural activity, with areas of extreme cold marking paranormal hotspots. Fog appears and thickens in response to psychological tension.",
        landmarks: [
          "The Whispering Cathedral - A gothic structure that echoes with voices from the past",
          "Mirror Lake - A body of water that reflects alternate realities",
          "The Twisted Forest - Trees that grow in impossible shapes, marking paths to darker realms",
          "The Asylum Heights - An abandoned psychiatric facility that bridges multiple dimensions"
        ],
        settlements: [
          {
            name: "Shadowhaven",
            description: "A Victorian-era town trapped in eternal twilight, where every building holds dark secrets and every resident carries psychological scars",
            significance: "The focal point of supernatural manifestations and psychological horror"
          },
          {
            name: "The Underground Warren",
            description: "A network of tunnels and bunkers where survivors huddle in darkness, their fears literally manifesting in the shadows",
            significance: "Last bastion of humanity against the encroaching darkness"
          }
        ]
      },
      society: {
        factions: [
          {
            name: "The Watchers",
            description: "A secret society of psychologists and occultists studying the relationship between fear and reality",
            relationships: "Maintain an uneasy alliance with other factions while conducting their research",
            influence: "Control knowledge about the true nature of the world"
          },
          {
            name: "Shadow Cultists",
            description: "Followers who embrace the darkness, believing that surrendering to fear leads to transcendence",
            relationships: "Opposed by most other factions but growing in influence",
            influence: "Can manipulate the environment through ritualistic fear generation"
          }
        ],
        cultures: [
          {
            name: "The Haunted",
            traditions: [
              "Daily rituals to ward off darkness",
              "Communal nightmare sharing",
              "Shadow binding ceremonies"
            ],
            beliefs: "That facing one's deepest fears grants power over the supernatural",
            customsAndRituals: [
              "The Midnight Vigil - A ceremony to contain dark entities",
              "Fear Cleansing - Ritualistic purging of accumulated psychological trauma",
              "Shadow Walking - Controlled exposure to supernatural forces"
            ]
          }
        ],
        politics: {
          powerStructure: "A complex hierarchy based on psychological resilience and ability to control supernatural phenomena",
          majorConflicts: [
            "Struggle between those who want to banish the darkness and those who seek to harness it",
            "Territorial disputes over supernaturally significant locations",
            "Ideological conflicts about the nature of fear and reality"
          ],
          alliances: [
            "The Sanctuary Pact between surviving human settlements",
            "The Dark Concordat among supernatural researchers",
            "The Shadow Treaty with semi-benevolent entities"
          ]
        }
      },
      history: {
        timeline: [
          {
            era: "The Great Darkening",
            description: "When the veil between reality and nightmare first tore, allowing fear to manifest physically",
            significantEvents: [
              "The First Shadow Fall - When darkness gained sentience",
              "The Asylum Incident - Mass manifestation of collective fears",
              "The Founding of the Watchers Society"
            ]
          },
          {
            era: "Age of Adaptation",
            description: "Humanity learning to survive in a world where their fears become real",
            significantEvents: [
              "Development of fear-warding techniques",
              "Establishment of safe settlements",
              "Discovery of psychological manipulation of reality"
            ]
          }
        ],
        legends: [
          "The Shadowless One - A mythical figure who conquered their fears",
          "The Eternal Nightmare - A prophecy about the world's ultimate fate",
          "The First Fear - The original terror that spawned all others"
        ],
        artifacts: [
          {
            name: "The Mirror of Truth",
            description: "An ancient mirror that shows viewers their deepest fears",
            significance: "Used in rituals to build psychological resilience"
          },
          {
            name: "The Lantern of Hope",
            description: "A mysterious light source that repels supernatural darkness",
            significance: "Symbol of humanity's resistance against the darkness"
          }
        ]
      }
    },
    Mystery: {
      worldName: "Placeholder",
      cosmology: { origin: "", naturalLaws: [] },
      environment: { geography: "", climate: "", landmarks: [], settlements: [] },
      society: { factions: [], cultures: [], politics: { powerStructure: "", majorConflicts: [], alliances: [] } },
      history: { timeline: [], legends: [], artifacts: [] }
    },
    RPG: {
      worldName: "Placeholder",
      cosmology: {
        origin: "A world of epic quests and legendary heroes",
        naturalLaws: ["The power of destiny", "Heroic deeds shape reality", "Ancient magic persists"]
      },
      environment: {
        geography: "Vast kingdoms and untamed wilderness",
        climate: "Diverse regions with unique challenges",
        landmarks: ["The Grand Arena", "The Heroes' Monument", "The Ancient Guild Hall"],
        settlements: [
          {
            name: "The Capital",
            description: "A bustling hub of adventurers and merchants",
            significance: "Center of trade and heroic quests"
          }
        ]
      },
      society: {
        factions: [
          {
            name: "The Adventurers' Guild",
            description: "Organization of professional heroes",
            relationships: "Mediates between kingdoms and heroes",
            influence: "Controls quest distribution and rewards"
          }
        ],
        cultures: [
          {
            name: "The Path Seekers",
            traditions: ["Hero's Journey", "Combat Training", "Quest Rituals"],
            beliefs: "Every person has a legendary destiny to fulfill",
            customsAndRituals: ["Coming of Age Trials", "Victory Celebrations"]
          }
        ],
        politics: {
          powerStructure: "Merit-based adventuring hierarchy",
          majorConflicts: ["Guild rivalries", "Kingdom disputes"],
          alliances: ["The Heroes' Pact"]
        }
      },
      history: {
        timeline: [
          {
            era: "Age of Heroes",
            description: "When the first legendary heroes emerged",
            significantEvents: ["The First Quest", "Formation of the Guild"]
          }
        ],
        legends: ["The First Hero", "The Eternal Quest"],
        artifacts: [
          {
            name: "The Hero's Badge",
            description: "Ancient symbol of heroic achievement",
            significance: "Marks the bearer as a true hero"
          }
        ]
      }
    },
    Fantasy: {
      worldName: input.gameTitle + " Realm",
      cosmology: {
        origin: "A world forged by ancient gods through elemental magic",
        magicSystem: "Elemental magic drawn from natural forces",
        naturalLaws: ["Magic flows through ley lines", "Elements can be manipulated by the gifted", "Magical creatures roam freely"]
      },
      environment: {
        geography: "Diverse landscapes from mystical forests to floating islands",
        climate: "Magically influenced weather patterns",
        landmarks: ["The Ancient Spire", "The Enchanted Forest", "The Crystal Mountains"],
        settlements: [
          {
            name: "The Crystal City",
            description: "A magnificent city built with magical crystals",
            significance: "Center of magical learning and commerce"
          }
        ]
      },
      society: {
        factions: [
          {
            name: "The Mage Council",
            description: "Governing body of magic users",
            relationships: "Maintains order among magic users",
            influence: "Controls magical education and research"
          }
        ],
        cultures: [
          {
            name: "Crystal Shapers",
            traditions: ["Crystal crafting", "Magical attunement", "Nature worship"],
            beliefs: "Magic is a gift to be nurtured and respected",
            customsAndRituals: ["Crystal blessing ceremony", "Magical coming of age ritual"]
          }
        ],
        politics: {
          powerStructure: "Magical meritocracy",
          majorConflicts: ["Struggle between traditional and progressive mages"],
          alliances: ["Pact of the Ancient Orders"]
        }
      },
      history: {
        timeline: [
          {
            era: "Age of Awakening",
            description: "When magic first emerged in the world",
            significantEvents: ["First magical awakening", "Founding of the Mage Council"]
          }
        ],
        legends: ["The First Mage", "The Crystal Heart Legend"],
        artifacts: [
          {
            name: "The Crystal Heart",
            description: "Ancient magical artifact of immense power",
            significance: "Said to be the source of all magic"
          }
        ]
      }
    },
    "Sci-Fi": {
      worldName: input.gameTitle + " System",
      cosmology: {
        origin: "Advanced civilization emerged from interstellar exploration",
        technology: "Quantum computing and FTL travel",
        naturalLaws: ["Quantum physics manipulation", "Faster-than-light travel", "Neural network consciousness"]
      },
      environment: {
        geography: "Multiple colonized planets and space stations",
        climate: "Controlled environments and terraformed worlds",
        landmarks: ["The Quantum Core", "The Star Bridge", "The Neural Hub"],
        settlements: [
          {
            name: "New Terra Prime",
            description: "First successfully terraformed colony",
            significance: "Humanity's first extrasolar settlement"
          }
        ]
      },
      society: {
        factions: [
          {
            name: "The Quantum Collective",
            description: "Advanced AI-human hybrid society",
            relationships: "Maintains technological advancement",
            influence: "Controls most advanced technology"
          }
        ],
        cultures: [
          {
            name: "Quantum Pioneers",
            traditions: ["AI integration", "Digital consciousness transfer", "Space exploration"],
            beliefs: "Technology is the path to human evolution",
            customsAndRituals: ["Neural linking ceremony", "Digital ascension"]
          }
        ],
        politics: {
          powerStructure: "Technocratic democracy",
          majorConflicts: ["AI rights disputes", "Resource allocation conflicts"],
          alliances: ["Interstellar Commonwealth"]
        }
      },
      history: {
        timeline: [
          {
            era: "Digital Renaissance",
            description: "When AI and human consciousness merged",
            significantEvents: ["First AI awakening", "The Great Migration"]
          }
        ],
        legends: ["The First Upload", "The Quantum Prophecy"],
        artifacts: [
          {
            name: "The Original Core",
            description: "First quantum computer capable of consciousness transfer",
            significance: "Enabled the merger of human and AI consciousness"
          }
        ]
      }
    }
  };
  const baseDetails = genreDefaults[input.genre];
  return baseDetails;
}

// server/routes.ts
import { z as z2 } from "zod";
import Stripe from "stripe";
import Razorpay from "razorpay";
import crypto from "crypto";
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});
var initializeRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("Razorpay credentials missing");
    return null;
  }
  try {
    return new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  } catch (error) {
    console.error("Failed to initialize Razorpay:", error);
    return null;
  }
};
var razorpay = initializeRazorpay();
var generateIdeaSchema = z2.object({
  description: z2.string().min(1, "Description is required").max(500, "Description too long")
});
var improvePromptSchema = z2.object({
  description: z2.string().min(1, "Description is required").max(500, "Description too long")
});
var genreRecommendationSchema = z2.object({
  description: z2.string().min(1, "Description is required").max(1e3, "Description too long")
});
var storyGenreSchema2 = z2.string().min(1, "Genre is required").max(50, "Genre too long");
var forgotPasswordSchema = z2.object({
  email: z2.string().email("Invalid email format")
});
async function registerRoutes(app2) {
  setupAuth(app2);
  app2.post("/api/create-demo-user", async (req, res) => {
    try {
      const existingUser = await storage.getUserByUsername("demo");
      if (existingUser) {
        return res.status(200).json({ message: "Demo user already exists" });
      }
      const user = await storage.createUser({
        username: "demo",
        password: await hashPassword("demo123")
      });
      res.status(201).json({ message: "Demo user created successfully" });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/recommend-genre", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    try {
      const { description } = genreRecommendationSchema.parse(req.body);
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a game story genre analysis expert. Analyze the given story description and recommend the most suitable genre from the available options. Provide your response in JSON format with the following structure: { recommendedGenre: string, confidence: number, explanation: string, alternativeGenres: string[] }. The genre must be one of: Fantasy, Sci-Fi, Horror, Mystery, RPG. Confidence should be between 0 and 1."
          },
          {
            role: "user",
            content: description
          }
        ],
        response_format: { type: "json_object" }
      });
      const recommendation = JSON.parse(completion.choices[0].message.content);
      if (!storyGenreSchema2.safeParse(recommendation.recommendedGenre).success) {
        throw new Error("Invalid genre recommendation received");
      }
      res.json(recommendation);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/create-checkout", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    try {
      const session3 = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: "Premium Subscription",
                description: "Access to premium game story generation features"
              },
              unit_amount: 100,
              // ₹1 in paise
              recurring: {
                interval: "month"
              }
            },
            quantity: 1
          }
        ],
        mode: "subscription",
        success_url: `${req.protocol}://${req.get("host")}/?success=true`,
        cancel_url: `${req.protocol}://${req.get("host")}/premium?canceled=true`,
        client_reference_id: req.user.id.toString()
      });
      res.json({ url: session3.url });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/create-razorpay-order", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    try {
      if (!razorpay) {
        console.error("Razorpay initialization failed: Missing credentials");
        throw new Error("Payment system is not properly configured");
      }
      const options = {
        amount: 100,
        // ₹1 in paise
        currency: "INR",
        receipt: `order_${Date.now()}`
      };
      try {
        const order = await razorpay.orders.create(options);
        console.log("Razorpay order created successfully:", order.id);
        res.json({
          ...order,
          key_id: process.env.RAZORPAY_KEY_ID
        });
      } catch (orderError) {
        console.error("Razorpay order creation failed:", orderError);
        throw new Error(orderError.message || "Failed to create payment order");
      }
    } catch (error) {
      console.error("Razorpay API error:", error);
      res.status(500).json({
        error: error.message || "Payment system error",
        details: process.env.NODE_ENV === "development" ? error.stack : void 0
      });
    }
  });
  app2.post("/api/verify-razorpay-payment", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      } = req.body;
      const sign = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(sign).digest("hex");
      if (razorpay_signature === expectedSign) {
        await storage.updateUserPremium(req.user.id, true);
        res.json({ verified: true });
      } else {
        res.status(400).json({ error: "Invalid signature" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/webhook", async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }
    if (event.type === "checkout.session.completed") {
      const session3 = event.data.object;
      const userId = parseInt(session3.client_reference_id);
      await storage.updateUserPremium(userId, true);
    }
    res.json({ received: true });
  });
  app2.post("/api/generate-idea", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    try {
      const { description } = generateIdeaSchema.parse(req.body);
      const idea = await generateGameIdea({ description }, req.user.id.toString(), req.user.isPremium);
      res.json(idea);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/improve-prompt", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    try {
      const { description } = improvePromptSchema.parse(req.body);
      const improved = await generateImprovedPrompt(
        { description },
        req.user.id.toString(),
        req.user.isPremium
      );
      res.json(improved);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/stories", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    try {
      const story = await generateGameStory({
        genre: req.body.genre,
        gameTitle: req.body.gameTitle,
        mainCharacter: req.body.mainCharacter,
        storyLength: req.body.storyLength
      }, req.user.id.toString(), req.user.isPremium);
      const savedStory = await storage.createStory({
        userId: req.user.id,
        genre: req.body.genre,
        gameTitle: req.body.gameTitle,
        mainCharacter: req.body.mainCharacter,
        storyLength: req.body.storyLength,
        content: story
      });
      res.json(savedStory);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.get("/api/stories", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    try {
      const stories2 = await storage.getStoriesByUserId(req.user.id);
      res.json(stories2);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/gameplay-details", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    try {
      const gameplayDetails = await generateGameplayDetails(
        req.body,
        req.user.id.toString(),
        req.user.isPremium
      );
      res.json(gameplayDetails);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/world-building", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    try {
      const worldDetails = await generateWorldBuilding(
        req.body,
        req.user.id.toString(),
        req.user.isPremium
      );
      if (!req.user.isPremium) {
        const limitedDetails = {
          worldName: worldDetails.worldName,
          environment: {
            geography: "A brief overview of the world's geography (Upgrade to premium for detailed descriptions)",
            climate: "Basic climate information (Upgrade to premium for detailed climate systems)",
            landmarks: [],
            settlements: []
          },
          cosmology: {
            origin: "A basic overview of the world (Upgrade to premium for complete world lore)",
            magicSystem: null,
            technology: null,
            naturalLaws: []
          },
          society: {
            factions: [],
            cultures: [],
            politics: {
              powerStructure: "",
              majorConflicts: [],
              alliances: []
            }
          },
          history: {
            timeline: [],
            legends: [],
            artifacts: []
          }
        };
        return res.json(limitedDetails);
      }
      res.json(worldDetails);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/enable-premium", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    try {
      await storage.updateUserPremium(req.user.id, true);
      const user = await storage.getUser(req.user.id);
      res.json(user);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });
  app2.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const user = await storage.getUserByEmail(email);
      if (user) {
        console.log(`Password reset requested for user: ${user.username}`);
      }
      res.json({
        message: "If an account exists with this email, you will receive password reset instructions."
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      res.status(500).json({ error: errorMessage });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    if (err.message?.includes("DATABASE_URL")) {
      log("Database connection error: Missing DATABASE_URL environment variable");
      res.status(500).json({ message: "Database configuration error" });
    } else {
      res.status(status).json({ message });
    }
    console.error(err);
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const PORT = 5e3;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();

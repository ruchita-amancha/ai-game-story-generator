// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
import OpenAI from "openai";
import { StoryGenre, StoryLength } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface StoryInput {
  genre: StoryGenre;
  gameTitle: string;
  mainCharacter: string;
  storyLength: StoryLength;
}

interface StoryOutput {
  title: string;
  introduction: string;
  mainQuest: string;
  sideQuests: string[];
  characters: Array<{
    name: string;
    role: string;
    description: string;
  }>;
}

interface IdeaGenerationInput {
  description: string;
}

interface IdeaGenerationOutput {
  genre: StoryGenre;
  gameTitle: string;
  mainCharacter: string;
  storyLength: StoryLength;
  conceptDescription: string;
}

interface PromptImprovementOutput {
  improvedPrompt: string;
  reasoning: string;
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Circuit breaker state
let consecutiveFailures = 0;
const FAILURE_THRESHOLD = 3;
const CIRCUIT_RESET_TIMEOUT = 60000; // 1 minute
let circuitBreakerTimer: NodeJS.Timeout | null = null;

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

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  if (isCircuitOpen()) {
    throw new Error('Service temporarily unavailable. Please try again in a minute.');
  }

  let retries = 0;
  let delay = initialDelayMs;

  while (true) {
    try {
      const result = await operation();
      resetCircuitBreaker();
      return result;
    } catch (error: any) {
      if (error.status !== 429 || retries >= maxRetries) {
        consecutiveFailures++;

        if (consecutiveFailures >= FAILURE_THRESHOLD && !circuitBreakerTimer) {
          circuitBreakerTimer = setTimeout(() => {
            resetCircuitBreaker();
          }, CIRCUIT_RESET_TIMEOUT);
        }

        if (error.status === 429) {
          throw new Error('Too many requests. Please try again in a moment.');
        }

        throw error;
      }

      retries++;
      console.log(`Rate limited. Retrying in ${delay}ms... (Attempt ${retries} of ${maxRetries})`);
      await sleep(delay);
      delay *= 2; // Exponential backoff
    }
  }
}

// Rate limiting configuration
const FREE_TIER_LIMITS = {
  GENERATIONS_PER_DAY: 10,
  IMPROVE_PROMPT: true,
  GAMEPLAY_DETAILS: false,
  WORLD_BUILDING: false,
};

const PREMIUM_TIER_LIMITS = {
  GENERATIONS_PER_DAY: 100,
  IMPROVE_PROMPT: true,
  GAMEPLAY_DETAILS: true,
  WORLD_BUILDING: true,
};


// Simple rate limiter using a Map
const requestTimes = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 86400000; // 24 hours in milliseconds

function isRateLimited(userId: string, isPremium: boolean): boolean {
  const now = Date.now();
  const userRequests = requestTimes.get(userId) || [];

  // Remove requests older than the window
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  requestTimes.set(userId, recentRequests);

  const limit = isPremium ? PREMIUM_TIER_LIMITS.GENERATIONS_PER_DAY : FREE_TIER_LIMITS.GENERATIONS_PER_DAY;
  return recentRequests.length >= limit;
}

function addRequest(userId: string) {
  const userRequests = requestTimes.get(userId) || [];
  userRequests.push(Date.now());
  requestTimes.set(userId, userRequests);
}

// Fallback story generator for when OpenAI is unavailable
function generateFallbackStory(input: StoryInput): StoryOutput {
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

  const story: StoryOutput = {
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

// Modify the generateFallbackIdea function
function generateFallbackIdea(input: IdeaGenerationInput): IdeaGenerationOutput {
  const keywords = input.description.toLowerCase();
  let genre: StoryGenre = "Fantasy";

  if (keywords.includes("space") || keywords.includes("future") || keywords.includes("technology")) {
    genre = "Sci-Fi";
  } else if (keywords.includes("horror") || keywords.includes("scary") || keywords.includes("dark")) {
    genre = "Horror";
  } else if (keywords.includes("detective") || keywords.includes("solve") || keywords.includes("mystery")) {
    genre = "Mystery";
  } else if (keywords.includes("role") || keywords.includes("adventure") || keywords.includes("quest")) {
    genre = "RPG";
  }

  // Generate a more natural game title from the description
  const words = input.description.split(' ')
    .filter(word => word.length > 3)
    .slice(0, 3)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  const gameTitle = words.join(' ');

  // Extract potential character description from the input
  let mainCharacter = "A mysterious protagonist";
  if (input.description.toLowerCase().includes("play as") || input.description.toLowerCase().includes("control")) {
    const characterStart = Math.max(
      input.description.toLowerCase().indexOf("play as"),
      input.description.toLowerCase().indexOf("control")
    );
    if (characterStart !== -1) {
      const characterDescription = input.description.slice(characterStart).split('.')[0];
      mainCharacter = characterDescription.replace(/play as|control/i, '').trim();
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

async function generateImprovedPrompt(
  input: IdeaGenerationInput,
  userId: string,
  isPremium: boolean = false
): Promise<PromptImprovementOutput> {
  try {
    if (isRateLimited(userId, isPremium)) {
      throw new Error(isPremium
        ? 'You have reached your premium tier daily limit. Please try again tomorrow.'
        : 'You have reached your free tier daily limit. Upgrade to premium for more generations!');
    }

    if (isCircuitOpen()) {
      return {
        improvedPrompt: input.description,
        reasoning: "Our AI assistant is taking a short break. Please try again in a minute."
      };
    }

    addRequest(userId);

    const response = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
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
      throw new Error('No content received from OpenAI');
    }

    return JSON.parse(content) as PromptImprovementOutput;
  } catch (error: any) {
    console.error('Error improving prompt:', error);

    if (error.status === 429) {
      throw new Error('Please wait a moment before making another request.');
    }

    if (error.status === 401) {
      throw new Error('OpenAI service is currently unavailable. Please try again later.');
    }

    return {
      improvedPrompt: input.description,
      reasoning: "We couldn't improve your prompt right now. Please try again in a moment."
    };
  }
}

async function generateGameIdea(input: IdeaGenerationInput, userId: string, isPremium: boolean = false): Promise<IdeaGenerationOutput> {
  try {
    if (isRateLimited(userId, isPremium)) {
      throw new Error(isPremium
        ? 'You have reached your premium tier daily limit. Please try again tomorrow.'
        : 'You have reached your free tier daily limit. Upgrade to premium for more generations!');
    }

    if (isCircuitOpen()) {
      return generateFallbackIdea(input);
    }

    addRequest(userId);

    const response = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
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
      throw new Error('No content received from OpenAI');
    }

    return JSON.parse(content) as IdeaGenerationOutput;
  } catch (error: any) {
    console.error('Error generating game idea:', error);

    if (error.message.includes('Invalid API key') || error.status === 401) {
      throw new Error('The AI service is temporarily unavailable. Please try again in a few minutes.');
    }

    if (error.status === 429 || error.message.includes('rate limit')) {
      throw new Error('Please wait a moment before generating another idea.');
    }

    // For any other errors, use the fallback generator
    return generateFallbackIdea(input);
  }
}

async function generateGameStory(input: StoryInput, userId: string, isPremium: boolean = false): Promise<StoryOutput> {
  try {
    if (isRateLimited(userId, isPremium)) {
      throw new Error(isPremium
        ? 'You have reached your premium tier daily limit. Please try again tomorrow.'
        : 'You have reached your free tier daily limit. Upgrade to premium for more generations!');
    }

    if (isCircuitOpen()) {
      return generateFallbackStory(input);
    }

    addRequest(userId);

    const response = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
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
      throw new Error('No content received from OpenAI');
    }

    return JSON.parse(content) as StoryOutput;
  } catch (error: any) {
    console.error('Error generating story:', error);

    if (error.status === 429) {
      throw new Error('Please wait a moment before generating another story.');
    }

    if (error.status === 401) {
      throw new Error('OpenAI service is currently unavailable. Please try again later.');
    }

    return generateFallbackStory(input);
  }
}

interface GameplayDetails {
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
  combatSystem: {
    attackTypes: string[];
    defenseOptions: string[];
    specialAbilities: string[];
  };
  environmentInteraction: {
    interactiveElements: string[];
    environmentalMechanics: string;
    puzzleTypes: string[];
  };
}


// Add this new function after the other generation functions
async function generateGameplayDetails(
  input: IdeaGenerationOutput,
  userId: string,
  isPremium: boolean = false
): Promise<GameplayDetails> {
  if (!isPremium && !PREMIUM_TIER_LIMITS.GAMEPLAY_DETAILS) {
    // Return basic gameplay details for free tier
    return generateFallbackGameplayDetails(input);
  }

  try {
    if (isRateLimited(userId, isPremium)) {
      throw new Error(isPremium
        ? 'You have reached your premium tier daily limit. Please try again tomorrow.'
        : 'You have reached your free tier daily limit. Upgrade to premium for more generations!');
    }

    addRequest(userId);

    const response = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
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
      throw new Error('No content received from OpenAI');
    }

    return JSON.parse(content) as GameplayDetails;
  } catch (error: any) {
    console.error('Error generating gameplay details:', error);

    if (error.message.includes('Invalid API key') || error.status === 401) {
      throw new Error('The AI service is temporarily unavailable. Please try again in a few minutes.');
    }

    if (error.status === 429 || error.message.includes('rate limit')) {
      throw new Error('Please wait a moment before generating gameplay details.');
    }

    return generateFallbackGameplayDetails(input);
  }
}

function generateFallbackGameplayDetails(input: IdeaGenerationOutput): GameplayDetails {
  const genreDefaults: Record<StoryGenre, GameplayDetails> = {
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

  // Start with genre defaults
  const baseDetails = genreDefaults[input.genre];

  // Customize based on input
  if (input.mainCharacter) {
    baseDetails.coreMechanics.uniqueFeatures.push(`Unique ${input.mainCharacter} Abilities`);
  }

  return baseDetails;
}

interface WorldBuildingDetails {
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

// Add after generateGameplayDetails function
async function generateWorldBuilding(
  input: {
    genre: StoryGenre;
    gameTitle: string;
    conceptDescription: string;
  },
  userId: string,
  isPremium: boolean = false
): Promise<WorldBuildingDetails> {
  if (!isPremium && !PREMIUM_TIER_LIMITS.WORLD_BUILDING) {
    return generateFallbackWorldBuilding(input);
  }

  try {
    if (isRateLimited(userId, isPremium)) {
      throw new Error(isPremium
        ? 'You have reached your premium tier daily limit. Please try again tomorrow.'
        : 'You have reached your free tier daily limit. Upgrade to premium for more generations!');
    }

    addRequest(userId);

    const response = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
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
      throw new Error('No content received from OpenAI');
    }

    return JSON.parse(content) as WorldBuildingDetails;
  } catch (error: any) {
    console.error('Error generating world details:', error);
    return generateFallbackWorldBuilding(input);
  }
}

function generateFallbackWorldBuilding(input: { genre: StoryGenre; gameTitle: string; conceptDescription: string }): WorldBuildingDetails {
  const genreDefaults: Record<StoryGenre, WorldBuildingDetails> = {
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
      worldName: "Placeholder",cosmology: { origin: "", naturalLaws: [] },
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

export {
  generateGameStory,
  generateGameIdea,
  generateImprovedPrompt,
  generateGameplayDetails,
  generateWorldBuilding
};
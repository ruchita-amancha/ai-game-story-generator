import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { generateGameStory, generateGameIdea, generateImprovedPrompt, generateGameplayDetails, generateWorldBuilding } from "./utils/openai";
import { z } from "zod";
import Stripe from "stripe";
import Razorpay from "razorpay";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16"
});

// Update the Razorpay initialization section
const initializeRazorpay = () => {
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

const razorpay = initializeRazorpay();

const generateIdeaSchema = z.object({
  description: z.string().min(1, "Description is required").max(500, "Description too long")
});

const improvePromptSchema = z.object({
  description: z.string().min(1, "Description is required").max(500, "Description too long")
});

const genreRecommendationSchema = z.object({
  description: z.string().min(1, "Description is required").max(1000, "Description too long")
});

const storyGenreSchema = z.string().min(1, "Genre is required").max(50, "Genre too long");

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format")
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Create demo user if it doesn't exist
  app.post("/api/create-demo-user", async (req, res) => {
    try {
      // Check if demo user already exists
      const existingUser = await storage.getUserByUsername("demo");
      if (existingUser) {
        return res.status(200).json({ message: "Demo user already exists" });
      }

      // Create demo user
      const user = await storage.createUser({
        username: "demo",
        password: await hashPassword("demo123"),
      });

      res.status(201).json({ message: "Demo user created successfully" });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/recommend-genre", async (req, res) => {
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

      if (!storyGenreSchema.safeParse(recommendation.recommendedGenre).success) {
        throw new Error("Invalid genre recommendation received");
      }

      res.json(recommendation);
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/create-checkout", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "inr",
              product_data: {
                name: "Premium Subscription",
                description: "Access to premium game story generation features",
              },
              unit_amount: 100, // ₹1 in paise
              recurring: {
                interval: "month"
              }
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${req.protocol}://${req.get("host")}/?success=true`,
        cancel_url: `${req.protocol}://${req.get("host")}/premium?canceled=true`,
        client_reference_id: req.user.id.toString(),
      });

      res.json({ url: session.url });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  // Update the create-razorpay-order endpoint
  app.post("/api/create-razorpay-order", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      // Check if Razorpay is properly initialized
      if (!razorpay) {
        console.error("Razorpay initialization failed: Missing credentials");
        throw new Error("Payment system is not properly configured");
      }

      const options = {
        amount: 100, // ₹1 in paise
        currency: "INR",
        receipt: `order_${Date.now()}`,
      };

      try {
        const order = await razorpay.orders.create(options);
        console.log("Razorpay order created successfully:", order.id);

        // Send both order details and key_id
        res.json({
          ...order,
          key_id: process.env.RAZORPAY_KEY_ID
        });
      } catch (orderError: any) {
        console.error("Razorpay order creation failed:", orderError);
        throw new Error(orderError.message || "Failed to create payment order");
      }
    } catch (error: any) {
      console.error("Razorpay API error:", error);
      res.status(500).json({ 
        error: error.message || "Payment system error",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  app.post("/api/verify-razorpay-payment", async (req, res) => {
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
      const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(sign)
        .digest("hex");

      if (razorpay_signature === expectedSign) {
        await storage.updateUserPremium(req.user.id, true);
        res.json({ verified: true });
      } else {
        res.status(400).json({ error: "Invalid signature" });
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/webhook", async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret!);
    } catch (err: any) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = parseInt(session.client_reference_id!);
      await storage.updateUserPremium(userId, true);
    }

    res.json({ received: true });
  });

  app.post("/api/generate-idea", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const { description } = generateIdeaSchema.parse(req.body);

      const idea = await generateGameIdea({ description }, req.user.id.toString(), req.user.isPremium);
      res.json(idea);
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/improve-prompt", async (req, res) => {
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
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/stories", async (req, res) => {
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
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.get("/api/stories", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      const stories = await storage.getStoriesByUserId(req.user.id);
      res.json(stories);
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/gameplay-details", async (req, res) => {
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
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/world-building", async (req, res) => {
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
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/enable-premium", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }

    try {
      await storage.updateUserPremium(req.user.id, true);
      const user = await storage.getUser(req.user.id);
      res.json(user);
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });

  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);

      // Check if user exists but don't reveal this information
      const user = await storage.getUserByEmail(email);

      if (user) {
        // In a production environment, you would:
        // 1. Generate a secure reset token
        // 2. Save it to the database with an expiration
        // 3. Send an email with a reset link
        console.log(`Password reset requested for user: ${user.username}`);
      }

      // Always return success to prevent user enumeration
      res.json({ 
        message: "If an account exists with this email, you will receive password reset instructions." 
      });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      res.status(500).json({ error: errorMessage });
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
import session from "express-session";
import { db } from "./db";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
import { users, stories, gamePlans } from "@shared/schema";
import type { InsertUser, User, Story, InsertStory, GamePlan, InsertGamePlan } from "@shared/schema";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createStory(story: InsertStory): Promise<Story>;
  getStoriesByUserId(userId: number): Promise<Story[]>;
  updateUserPremium(userId: number, isPremium: boolean): Promise<void>;
  createGamePlan(plan: InsertGamePlan): Promise<GamePlan>;
  getGamePlansByUserId(userId: number): Promise<GamePlan[]>;
  updateGamePlan(id: number, plan: Partial<GamePlan>): Promise<void>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPremium(userId: number, isPremium: boolean): Promise<void> {
    await db
      .update(users)
      .set({
        isPremium,
        premiumUntil: isPremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null // 30 days
      })
      .where(eq(users.id, userId));
  }

  async createStory(insertStory: InsertStory): Promise<Story> {
    const [story] = await db.insert(stories).values(insertStory).returning();
    return story;
  }

  async getStoriesByUserId(userId: number): Promise<Story[]> {
    return db
      .select()
      .from(stories)
      .where(eq(stories.userId, userId))
      .orderBy(stories.createdAt);
  }

  async createGamePlan(plan: InsertGamePlan): Promise<GamePlan> {
    const [gamePlan] = await db.insert(gamePlans).values(plan).returning();
    return gamePlan;
  }

  async getGamePlansByUserId(userId: number): Promise<GamePlan[]> {
    return db
      .select()
      .from(gamePlans)
      .where(eq(gamePlans.userId, userId))
      .orderBy(gamePlans.createdAt);
  }

  async updateGamePlan(id: number, plan: Partial<GamePlan>): Promise<void> {
    await db
      .update(gamePlans)
      .set(plan)
      .where(eq(gamePlans.id, id));
  }
}

export const storage = new DatabaseStorage();
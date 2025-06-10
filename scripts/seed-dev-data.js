#!/usr/bin/env node

/**
 * Development Database Seeding Script
 * Creates admin users and sample data for development/testing
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`)
};

async function hashPassword(password) {
  const saltRounds = process.env.BCRYPT_SALT_ROUNDS ? parseInt(process.env.BCRYPT_SALT_ROUNDS) : 10;
  return await bcrypt.hash(password, saltRounds);
}

async function createAdminUsers() {
  log.info('Creating admin users...');

  const adminUsers = [
    {
      email: 'admin@kitchen-pal.local',
      password: 'admin123',
      first_name: 'Admin',
      last_name: 'User',
      is_verified: true
    },
    {
      email: 'dev@kitchen-pal.local',
      password: 'dev123',
      first_name: 'Developer',
      last_name: 'Admin',
      is_verified: true
    },
    {
      email: 'test@kitchen-pal.local',
      password: 'test123',
      first_name: 'Test',
      last_name: 'User',
      is_verified: true
    }
  ];

  for (const userData of adminUsers) {
    try {
      const hashedPassword = await hashPassword(userData.password);
      
      const user = await prisma.users.upsert({
        where: { email: userData.email },
        update: {
          password_hash: hashedPassword,
          first_name: userData.first_name,
          last_name: userData.last_name,
          is_verified: userData.is_verified
        },
        create: {
          email: userData.email,
          password_hash: hashedPassword,
          first_name: userData.first_name,
          last_name: userData.last_name,
          is_verified: userData.is_verified
        }
      });

      log.success(`Created/Updated user: ${userData.email}`);
    } catch (error) {
      log.error(`Failed to create user ${userData.email}: ${error.message}`);
    }
  }
}

async function createSampleRecipes() {
  log.info('Creating sample recipes...');

  // Get the admin user
  const adminUser = await prisma.users.findFirst({
    where: { email: 'admin@kitchen-pal.local' }
  });

  if (!adminUser) {
    log.warning('Admin user not found, skipping sample recipes');
    return;
  }

  const sampleRecipes = [
    {
      title: 'Classic Spaghetti Carbonara',
      description: 'A traditional Italian pasta dish with eggs, cheese, and pancetta',
      instructions: `1. Bring a large pot of salted water to boil
2. Cook spaghetti according to package instructions
3. Meanwhile, cook pancetta in a large skillet until crispy
4. Whisk eggs with Parmesan cheese in a bowl
5. Drain pasta, reserving 1 cup pasta water
6. Toss hot pasta with pancetta, then remove from heat
7. Quickly stir in egg mixture, adding pasta water as needed
8. Season with pepper and serve immediately`,
      prep_time: 10,
      cook_time: 15,
      servings: 4,
      difficulty_level: 'medium',
      cuisine_type: 'Italian',
      meal_type: 'dinner',
      is_public: true,
      ingredients: [
        { ingredient_name: 'Spaghetti', quantity: 400, unit: 'g' },
        { ingredient_name: 'Pancetta', quantity: 200, unit: 'g' },
        { ingredient_name: 'Eggs', quantity: 3, unit: 'whole' },
        { ingredient_name: 'Parmesan cheese', quantity: 100, unit: 'g' },
        { ingredient_name: 'Black pepper', quantity: 1, unit: 'tsp' }
      ]
    },
    {
      title: 'Chicken Stir Fry',
      description: 'Quick and healthy chicken stir fry with vegetables',
      instructions: `1. Cut chicken into bite-sized pieces
2. Heat oil in a wok or large skillet
3. Cook chicken until golden, about 5-6 minutes
4. Add vegetables and stir-fry for 3-4 minutes
5. Add sauce and cook for 2 more minutes
6. Serve over rice`,
      prep_time: 15,
      cook_time: 10,
      servings: 2,
      difficulty_level: 'easy',
      cuisine_type: 'Asian',
      meal_type: 'dinner',
      is_public: true,
      ingredients: [
        { ingredient_name: 'Chicken breast', quantity: 300, unit: 'g' },
        { ingredient_name: 'Bell peppers', quantity: 2, unit: 'whole' },
        { ingredient_name: 'Broccoli', quantity: 200, unit: 'g' },
        { ingredient_name: 'Soy sauce', quantity: 3, unit: 'tbsp' },
        { ingredient_name: 'Garlic', quantity: 2, unit: 'cloves' },
        { ingredient_name: 'Ginger', quantity: 1, unit: 'tsp' }
      ]
    },
    {
      title: 'Chocolate Chip Cookies',
      description: 'Classic homemade chocolate chip cookies',
      instructions: `1. Preheat oven to 375°F (190°C)
2. Cream butter and sugars together
3. Beat in eggs and vanilla
4. Mix in flour, baking soda, and salt
5. Stir in chocolate chips
6. Drop rounded tablespoons onto baking sheet
7. Bake for 9-11 minutes until golden brown
8. Cool on baking sheet for 5 minutes before transferring`,
      prep_time: 20,
      cook_time: 11,
      servings: 24,
      difficulty_level: 'easy',
      cuisine_type: 'American',
      meal_type: 'dessert',
      is_public: true,
      ingredients: [
        { ingredient_name: 'Butter', quantity: 225, unit: 'g' },
        { ingredient_name: 'Brown sugar', quantity: 200, unit: 'g' },
        { ingredient_name: 'White sugar', quantity: 100, unit: 'g' },
        { ingredient_name: 'Eggs', quantity: 2, unit: 'whole' },
        { ingredient_name: 'Vanilla extract', quantity: 2, unit: 'tsp' },
        { ingredient_name: 'All-purpose flour', quantity: 300, unit: 'g' },
        { ingredient_name: 'Baking soda', quantity: 1, unit: 'tsp' },
        { ingredient_name: 'Salt', quantity: 1, unit: 'tsp' },
        { ingredient_name: 'Chocolate chips', quantity: 200, unit: 'g' }
      ]
    }
  ];

  for (const recipeData of sampleRecipes) {
    try {
      const { ingredients, ...recipeWithoutIngredients } = recipeData;
      
      const recipe = await prisma.recipes.create({
        data: {
          ...recipeWithoutIngredients,
          user_id: adminUser.id,
          recipe_ingredients: {
            create: ingredients
          }
        }
      });

      log.success(`Created recipe: ${recipeData.title}`);
    } catch (error) {
      log.error(`Failed to create recipe ${recipeData.title}: ${error.message}`);
    }
  }
}

async function createSampleInventory() {
  log.info('Creating sample inventory...');

  const testUser = await prisma.users.findFirst({
    where: { email: 'test@kitchen-pal.local' }
  });

  if (!testUser) {
    log.warning('Test user not found, skipping sample inventory');
    return;
  }

  const inventoryItems = [
    { ingredient_name: 'Eggs', quantity: 12, unit: 'whole' },
    { ingredient_name: 'Milk', quantity: 1, unit: 'liter' },
    { ingredient_name: 'Bread', quantity: 1, unit: 'loaf' },
    { ingredient_name: 'Chicken breast', quantity: 500, unit: 'g' },
    { ingredient_name: 'Rice', quantity: 2, unit: 'kg' },
    { ingredient_name: 'Onions', quantity: 3, unit: 'whole' },
    { ingredient_name: 'Garlic', quantity: 1, unit: 'bulb' },
    { ingredient_name: 'Tomatoes', quantity: 6, unit: 'whole' }
  ];

  for (const item of inventoryItems) {
    try {
      await prisma.user_inventory.create({
        data: {
          user_id: testUser.id,
          ...item
        }
      });

      log.success(`Added to inventory: ${item.ingredient_name}`);
    } catch (error) {
      log.error(`Failed to add inventory item ${item.ingredient_name}: ${error.message}`);
    }
  }
}

async function main() {
  try {
    log.info('🌱 Starting database seeding...');
    
    await createAdminUsers();
    await createSampleRecipes();
    await createSampleInventory();
    
    log.success('🎉 Database seeding completed successfully!');
    
    console.log('');
    console.log('📋 Development Login Credentials:');
    console.log('');
    console.log('👤 Admin Account:');
    console.log('   Email: admin@kitchen-pal.local');
    console.log('   Password: admin123');
    console.log('');
    console.log('👤 Developer Account:');
    console.log('   Email: dev@kitchen-pal.local');
    console.log('   Password: dev123');
    console.log('');
    console.log('👤 Test User Account:');
    console.log('   Email: test@kitchen-pal.local');
    console.log('   Password: test123');
    console.log('');
    
  } catch (error) {
    log.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
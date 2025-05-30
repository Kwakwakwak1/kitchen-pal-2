// Simple test script for ingredient parsing
// Run with: node test-ingredients.js

import { parseIngredient } from './utils/ingredientParser.js';

const testIngredients = [
  "2 cups all-purpose flour",
  "1 ½ tablespoons olive oil",
  "3-4 large tomatoes, diced",
  "1/2 cup chopped onions",
  "Salt to taste",
  "2 lbs ground beef",
  "1 tsp vanilla extract (optional)",
  "3 eggs",
  "1 pinch of salt"
];

console.log('🧪 Testing Ingredient Parser\n');

testIngredients.forEach((ingredient, index) => {
  console.log(`Test ${index + 1}: "${ingredient}"`);
  try {
    const parsed = parseIngredient(ingredient);
    console.log(`  ✅ Quantity: ${parsed.quantity}`);
    console.log(`  ✅ Unit: ${parsed.unit}`);
    console.log(`  ✅ Name: ${parsed.ingredientName}`);
    console.log(`  ✅ Optional: ${parsed.isOptional}`);
    if (parsed.notes) {
      console.log(`  ✅ Notes: ${parsed.notes}`);
    }
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
  }
  console.log('');
});

console.log('✨ Test completed!'); 
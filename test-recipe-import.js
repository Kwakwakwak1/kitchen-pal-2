import { scrapeRecipeFromUrl } from './services/recipeScrapingService.ts';

const testUrls = [
  'https://www.delish.com/cooking/recipe-ideas/a63570903/copycat-chilis-nashville-hot-mozzarella',
  'https://www.allrecipes.com/recipe/23600/worlds-best-lasagna/',
  'https://www.foodnetwork.com/recipes/alton-brown/good-eats-meatloaf-recipe-1937667'
];

async function testRecipeImport() {
  console.log('🧪 Testing Enhanced Recipe Import Functionality\n');
  
  for (const url of testUrls) {
    console.log(`\n📝 Testing: ${url}`);
    console.log('━'.repeat(80));
    
    try {
      const result = await scrapeRecipeFromUrl(url);
      
      if (result.success) {
        console.log('✅ SUCCESS!');
        console.log(`📋 Recipe: ${result.data.name}`);
        console.log(`🥘 Ingredients: ${result.data.ingredients.length} items`);
        console.log(`📖 Instructions: ${result.data.instructions ? 'Found' : 'Missing'}`);
        console.log(`⏱️ Timing: ${result.data.prepTime || 'N/A'} prep, ${result.data.cookTime || 'N/A'} cook`);
        console.log(`🔗 Source: ${result.data.sourceName || 'Unknown'}`);
        
        if (result.warnings && result.warnings.length > 0) {
          console.log(`⚠️ Warnings: ${result.warnings.join('; ')}`);
        }
      } else {
        console.log('❌ FAILED');
        console.log(`💥 Error: ${result.error}`);
      }
    } catch (error) {
      console.log('💥 EXCEPTION:', error.message);
    }
    
    console.log('━'.repeat(80));
  }
  
  console.log('\n🎉 Test completed!');
}

// Run the test
testRecipeImport().catch(console.error); 
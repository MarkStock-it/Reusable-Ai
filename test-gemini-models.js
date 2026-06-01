#!/usr/bin/env node

// Test script to list available Gemini models
// This helps determine which models work with your API key

const apiKey = process.argv[2];

if (!apiKey) {
  console.error('Usage: node test-gemini-models.js YOUR_API_KEY');
  process.exit(1);
}

async function listModels() {
  const endpoints = [
    'https://generativelanguage.googleapis.com/v1/models',
    'https://generativelanguage.googleapis.com/v1beta/models',
  ];

  for (const endpoint of endpoints) {
    console.log(`\n🔍 Trying: ${endpoint}`);
    console.log('─'.repeat(60));
    
    try {
      const url = `${endpoint}?key=${apiKey}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        console.error(`❌ HTTP ${res.status}`);
        const text = await res.text();
        console.error(text.slice(0, 200));
        continue;
      }

      const data = await res.json();
      
      if (data.models && data.models.length > 0) {
        console.log(`✅ Found ${data.models.length} models:\n`);
        data.models.forEach(model => {
          console.log(`  • ${model.name}`);
          if (model.displayName) console.log(`    Display: ${model.displayName}`);
          if (model.supportedGenerationMethods) {
            console.log(`    Methods: ${model.supportedGenerationMethods.join(', ')}`);
          }
        });
      } else {
        console.log('No models found in response');
      }
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
    }
  }
}

listModels();

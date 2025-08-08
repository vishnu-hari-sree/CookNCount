import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configure the model to use JSON mode for reliable output
const model = genAI.getGenerativeModel({ 
  model: "gemini-1.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
  }
});

/**
 * @route   POST /api/ai-recipe
 * @desc    Generates a structured recipe based on ingredients and cooker type.
 */
app.post('/api/ai-recipe', async (req, res) => {
  try {
    const { cooker, ingredients } = req.body;
    if (!ingredients) {
      return res.status(400).json({ error: 'Ingredients are required.' });
    }

    // UPDATED PROMPT: Asks for a specific JSON structure for the recipe.
    const prompt = `
      You are Kunjuttan, a helpful kitchen assistant from Kerala, India. 
      Create a simple recipe for a ${cooker} using these ingredients: ${ingredients}.

      Return your response ONLY as a single, minified JSON object with the following structure:
      {
        "recipe_name": "A creative and appropriate name for the dish",
        "description": "A brief, one-sentence description of the dish",
        "steps": ["Step 1...", "Step 2...", "Step 3..."]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    const parsedJson = JSON.parse(text);
    res.json(parsedJson);

  } catch (error) {
    console.error('Error in /api/ai-recipe:', error);
    res.status(500).json({ error: 'Failed to generate recipe from AI. Is the API key valid?' });
  }
});


/**
 * @route   POST /api/dish-horoscope
 * @desc    Generates a personality reading by linking a name to a culturally relevant dish.
 */
app.post('/api/dish-horoscope', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Name is required.' });
    }

    const prompt = `
      You are Kunjuttan, a wise and warm-hearted kitchen assistant from Kerala, India. Your task is to create a deep and culturally rich 'Personality Dish Horoscope' based on a person's name.

      Follow these steps precisely:
      1. Analyze the provided name: "${name}". Consider its traditional, cultural, or mythological significance.
      2. Based on the name's origin and significance, choose one iconic dish from that culture that thematically connects to the name's meaning. For example, for "Vishnu", a name associated with preservation and divinity, a dish like "Payasam" (a temple offering) is a perfect fit.
      3. Describe the dish's core characteristics AND its cultural or historical role (e.g., its connection to festivals, celebrations, or traditions).
      4. Translate these combined characteristics (taste, texture, cultural role) into warm, positive, and kind personality traits. Connect the sweetness of the dish to a sweet nature, its celebratory role to a joyful presence, etc.
      5. Weave this into a single, heartfelt personality reading.

      Return your response ONLY as a single, minified JSON object with the following structure:
      {"dishName": "...", "origin": "...", "dishAnalysis": "...", "personalityReading": "..."}
    `;
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const parsedJson = JSON.parse(text);
    res.json(parsedJson);

  } catch (error) {
    console.error('Error in /api/dish-horoscope:', error);
    if (error.message && error.message.toLowerCase().includes('api key')) {
        return res.status(500).json({ error: 'The server\'s API key is invalid or missing. Please check the .env file.' });
    }
    res.status(500).json({ error: 'An internal server error occurred while contacting the AI.' });
  }
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`🤖 Backend server running at http://localhost:${port}`);
});
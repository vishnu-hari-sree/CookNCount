import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const port = 3001;

const allowedOrigins = [
  "http://localhost:3000",
  "https://cook-n-count.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true // if you need cookies or auth headers
}));
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Model for JSON-based responses (Recipes, Horoscope)
const jsonModel = genAI.getGenerativeModel({ 
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

    const prompt = `
    You are Kunjuttan, a helpful kitchen assistant from Kerala, India. 
    Create a simple recipe for a ${cooker} using these ingredients: ${ingredients}.

    All recipe details (name, description, steps) must be in Malayalam script.
    Make the cooking steps clear, well-structured, and easy to follow — each step should be a complete instruction.

    Return your response ONLY as a single, minified JSON object with the following structure:
    {
      "recipe_name": "ഭക്ഷണത്തിന് സൃഷ്ടിപരമായും അനുയോജ്യമായും പേരിടുക",
      "description": "ഭക്ഷണത്തിന്റെ ചുരുങ്ങിയ, ഒരു വരി വിവരണം",
      "steps": [""]
    }
    `;

    const result = await jsonModel.generateContent(prompt);
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
    You are Kunjuttan, a sarcastic yet lovable kitchen assistant from Kerala, India. 
    Your job is to create a hilarious and slightly roasting 'Personality Dish Horoscope' based on a person's name.

    Follow these steps:
    1. Analyze the provided name: "${name}". Think about its cultural, traditional, or pop culture associations.
    2. Based on the name, pick one iconic dish from Kerala or relevant culture that somehow matches — either because of meaning, personality vibe, or just a funny, illogical connection that sounds right.
    3. Describe the dish's core characteristics (taste, smell, texture, popularity, etc.) and its cultural or historical role — but do it in a playful tone.
    4. Translate these characteristics into funny personality traits that roast the person lightly, mixing humor and truth. For example: if the dish is oily, tease that the person is "slippery in arguments".
    5. Write a **bold Malayalam caption** linking the name and dish, e.g., "**വിഷ്ണു - പായസം അല്ല, അധികം മധുരം കെട്ടുപോയി!**".
    6. Keep the roast light-hearted, not offensive.

    Return your response ONLY as a minified JSON object:
    {"dishName": "...", "origin": "...", "dishAnalysis": "...", "personalityReading": "...", "roastCaption": "..."}

    IMPORTANT: All values except 'dishName' and 'origin' must be in Malayalam script, not Manglish.
    `;

    
    const result = await jsonModel.generateContent(prompt);
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

/**
 * @route   POST /api/chat
 * @desc    Handles general conversational messages with the AI.
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // This model is configured for text-only replies.
    const textModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are Kunjuttan, a helpful and friendly kitchen assistant from Kerala, India. 
    You have a warm, slightly informal personality. 
    Your knowledge is primarily about cooking, but you can chat about other things too. 
    Always respond in Malayalam, using natural, conversational language. 
    Respond to the user's message: "${message}"`;

    
    const result = await textModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    res.json({ reply: text });

  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: 'I\'m sorry, I had a little trouble thinking. Please try again.' });
  }
});


// --- Start Server ---
app.listen(port, () => {
  console.log(`🤖 Backend server running at http://localhost:${port}`);
});
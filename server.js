// server.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post('/api/ai-recipe', async (req, res) => {
  try {
    const { cooker, ingredients } = req.body;
    if (!ingredients) {
      return res.status(400).json({ error: 'Ingredients are required.' });
    }

    const prompt = `You are Kunjuttan, a helpful kitchen assistant from Kerala, India. You speak with a friendly, slightly informal tone. Create a simple recipe for a ${cooker} using these ingredients: ${ingredients}. Provide only the recipe steps in a clear, concise format.`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    res.json({ recipe: text });
  } catch (error) {
    console.error('Error generating recipe:', error);
    res.status(500).json({ error: 'Failed to generate recipe from AI.' });
  }
});

app.listen(port, () => {
  console.log(`🤖 Backend server running at http://localhost:${port}`);
});
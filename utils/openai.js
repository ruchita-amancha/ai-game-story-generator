// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateGameStory({ genre, gameTitle, mainCharacter, storyLength }) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a creative game story writer who specializes in creating engaging game narratives."
        },
        {
          role: "user",
          content: `Create a game story with the following details:
          Genre: ${genre}
          Game Title: ${gameTitle}
          Main Character: ${mainCharacter}
          Story Length: ${storyLength}
          
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

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Error generating story:', error);
    throw new Error('Failed to generate story');
  }
}

module.exports = { generateGameStory };

const express = require('express');
const router = express.Router();
const { generateGameStory } = require('../utils/openai');

router.post('/generate-story', async (req, res) => {
  try {
    const { genre, gameTitle, mainCharacter, storyLength } = req.body;
    
    // Validate required fields
    if (!genre || !gameTitle || !mainCharacter || !storyLength) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const story = await generateGameStory({
      genre,
      gameTitle,
      mainCharacter,
      storyLength
    });

    res.json(story);
  } catch (error) {
    console.error('Error in generate-story route:', error);
    res.status(500).json({ error: 'Failed to generate story' });
  }
});

module.exports = router;

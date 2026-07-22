const express = require('express');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const response = await fetch('https://restcountries.com/v3.1/all?fields=name,cca2');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Erreur pays:', error);
    // Fallback en cas d'erreur
    res.json([
      { name: { common: 'France' }, cca2: 'FR' },
      { name: { common: 'United States' }, cca2: 'US' },
      { name: { common: 'United Kingdom' }, cca2: 'GB' },
      { name: { common: 'Germany' }, cca2: 'DE' },
      { name: { common: 'Spain' }, cca2: 'ES' },
      { name: { common: 'Tunisia' }, cca2: 'TN' }
    ]);
  }
});

module.exports = router;

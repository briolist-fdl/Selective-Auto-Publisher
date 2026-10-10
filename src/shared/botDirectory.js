const BOTS = {
  'poke-post': {
    name: 'Poké-Post',
    githubUrl: 'https://github.com/briolist-fdl/poke-post',
    topggUrl: '',
    discordBotListUrl: '',
    buyMeACoffeeUrl: 'https://buymeacoffee.com/briolist',
    supportMessageChance: 1.0,
  },

  relayonme: {
    name: 'RelayOnMe',
    githubUrl: 'https://github.com/briolist-fdl/relayonme',
    topggUrl: '',
    discordBotListUrl: '',
    buyMeACoffeeUrl: 'https://buymeacoffee.com/briolist',
    supportMessageChance: 0.2,
  },

  sap: {
    name: 'SelectiveAutoPublisher',
    githubUrl: 'https://github.com/briolist-fdl/Selective-Auto-Publisher',
    topggUrl: '',
    discordBotListUrl: '',
    buyMeACoffeeUrl: 'https://buymeacoffee.com/briolist',
    supportMessageChance: 0.33,
  },
};

function getBotConfig() {
  const botId = process.env.BOT_ID;

  if (!botId) {
    throw new Error('Missing BOT_ID in .env');
  }

  const config = BOTS[botId];

  if (!config) {
    throw new Error(`Unknown BOT_ID: ${botId}`);
  }

  return {
    id: botId,
    ...config,
  };
}

export {
  BOTS,
  getBotConfig,
};

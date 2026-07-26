const appJson = require("./app.json");

module.exports = () => {
  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL;

  return {
    expo: {
      ...appJson.expo,
      experiments: {
        ...appJson.expo.experiments,
        ...(baseUrl ? { baseUrl } : {}),
      },
    },
  };
};

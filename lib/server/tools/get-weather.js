const CITIES = {
  karachi: {
    temperature_c: 31,
    condition: 'Partly cloudy',
    humidity: 62,
    wind_kph: 14,
  },
  london: {
    temperature_c: 14,
    condition: 'Light rain',
    humidity: 78,
    wind_kph: 19,
  },
  'new york': {
    temperature_c: 21,
    condition: 'Sunny',
    humidity: 55,
    wind_kph: 11,
  },
  paris: { temperature_c: 17, condition: 'Cloudy', humidity: 70, wind_kph: 13 },
  tokyo: { temperature_c: 24, condition: 'Clear', humidity: 60, wind_kph: 9 },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const getWeatherDeclaration = {
  name: 'get_weather',
  description:
    'Get the current weather for a city. Use it whenever the user asks about weather, temperature, rain, wind, or humidity in a place.',
  parameters: {
    type: 'OBJECT',
    properties: {
      city: {
        type: 'STRING',
        description: 'City name, for example "Karachi" or "London".',
      },
    },
    required: ['city'],
  },
};

export async function runGetWeather(args) {
  await sleep(450);
  const city =
    typeof args?.city === 'string' ? args.city.trim().toLowerCase() : '';
  if (!city) throw new Error('No city provided.');
  const report = CITIES[city];
  if (!report)
    throw new Error(`Weather service has no data for "${args.city}".`);
  return { ok: true, result: { city: args.city.trim(), ...report } };
}

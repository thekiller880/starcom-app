export const PRIMARY_RAIL_MODES = [
  {
    mode: 'CyberCommand' as const,
    emoji: '📑',
    tooltip: 'Cyber Command'
  },
  {
    mode: 'GeoPolitical' as const,
    emoji: '🌍',
    tooltip: 'Geo Political'
  },
  {
    mode: 'EcoNatural' as const,
    emoji: '🌿',
    tooltip: 'Eco Natural'
  }
] as const;

export const SECONDARY_RAIL_MODES = {
  CyberCommand: [
    { subMode: 'IntelReports' as const, emoji: '📑', tooltip: 'Intel Reports' },
    { subMode: 'CyberThreats' as const, emoji: '🛡️', tooltip: 'Cyber Threats' },
    { subMode: 'CyberAttacks' as const, emoji: '⚡', tooltip: 'Cyber Attacks' },
    { subMode: 'Satellites' as const, emoji: '🛰️', tooltip: 'Satellites' },
    { subMode: 'CommHubs' as const, emoji: '📡', tooltip: 'Communication Hubs' }
  ],
  GeoPolitical: [
    { subMode: 'NationalTerritories' as const, emoji: '🗺️', tooltip: 'National Territories' },
    { subMode: 'DiplomaticEvents' as const, emoji: '🤝', tooltip: 'Diplomatic Events' },
    { subMode: 'ResourceZones' as const, emoji: '⛽', tooltip: 'Resource Zones' }
  ],
  EcoNatural: [
    { subMode: 'SpaceWeather' as const, emoji: '☀️', tooltip: 'Space Weather' },
    { subMode: 'EcologicalDisasters' as const, emoji: '🌋', tooltip: 'Ecological Disasters' },
    { subMode: 'EarthWeather' as const, emoji: '🌦️', tooltip: 'Earth Weather' }
  ]
} as const;

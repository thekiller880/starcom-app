import type { VisualizationData, VisualizationType } from '../../types/CyberCommandVisualization';

export class MockDataGenerator {
  static generateIntelReports(count: number = 10): VisualizationData[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `intel-${Date.now()}-${i}`,
      type: 'IntelReports' as const,
      location: {
        latitude: -90 + Math.random() * 180,
        longitude: -180 + Math.random() * 360
      },
      timestamp: new Date(Date.now() - Math.random() * 86400000),
      metadata: {
        source: 'MockGenerator',
        confidence: Math.random(),
        classification: 'UNCLASSIFIED'
      },
      priority: (['low', 'medium', 'high', 'critical'] as const)[Math.floor(Math.random() * 4)],
      status: (['active', 'inactive', 'pending', 'resolved'] as const)[Math.floor(Math.random() * 4)]
    }));
  }

  static generateCyberAttacks(count: number = 20): VisualizationData[] {
    const attackTypes = ['DDoS', 'Malware', 'Phishing', 'Breach', 'Ransomware'];

    return Array.from({ length: count }, (_, i) => ({
      id: `attack-${Date.now()}-${i}`,
      type: 'CyberAttacks' as const,
      location: {
        latitude: -90 + Math.random() * 180,
        longitude: -180 + Math.random() * 360
      },
      timestamp: new Date(Date.now() - Math.random() * 3600000),
      metadata: {
        attackType: attackTypes[Math.floor(Math.random() * attackTypes.length)],
        severity: Math.floor(Math.random() * 10) + 1,
        targetSector: 'Financial',
        mitigation: Math.random() > 0.5 ? 'Blocked' : 'In Progress'
      },
      priority: (['medium', 'high', 'critical'] as const)[Math.floor(Math.random() * 3)],
      status: (['active', 'pending'] as const)[Math.floor(Math.random() * 2)]
    }));
  }

  static generateCyberThreats(count: number = 15): VisualizationData[] {
    const threatTypes = ['C2_Server', 'Botnet', 'Malware_Family', 'Threat_Actor'];

    return Array.from({ length: count }, (_, i) => ({
      id: `threat-${Date.now()}-${i}`,
      type: 'CyberThreats' as const,
      location: {
        latitude: -90 + Math.random() * 180,
        longitude: -180 + Math.random() * 360
      },
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 7),
      metadata: {
        threatType: threatTypes[Math.floor(Math.random() * threatTypes.length)],
        malwareFamily: 'APT' + (Math.floor(Math.random() * 50) + 1),
        attribution: Math.random() > 0.3 ? 'High' : 'Medium',
        iocs: Math.floor(Math.random() * 50) + 1
      },
      priority: (['low', 'medium', 'high', 'critical'] as const)[Math.floor(Math.random() * 4)],
      status: (['active', 'inactive'] as const)[Math.floor(Math.random() * 2)]
    }));
  }

  static generateSatellites(count: number = 30): VisualizationData[] {
    const infraTypes = ['DataCenter', 'SubmarineCable', 'IXP', 'CDN'];

    return Array.from({ length: count }, (_, i) => ({
      id: `sat-${Date.now()}-${i}`,
      type: 'Satellites' as const,
      location: {
        latitude: -90 + Math.random() * 180,
        longitude: -180 + Math.random() * 360
      },
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 30),
      metadata: {
        infraType: infraTypes[Math.floor(Math.random() * infraTypes.length)],
        capacity: Math.floor(Math.random() * 100) + 1 + 'Gbps',
        operator: 'Provider' + (Math.floor(Math.random() * 10) + 1),
        status: Math.random() > 0.1 ? 'Operational' : 'Maintenance'
      },
      priority: (['low', 'medium'] as const)[Math.floor(Math.random() * 2)],
      status: 'active' as const
    }));
  }

  static generateNetworkInfrastructure(count: number = 30): VisualizationData[] {
    return this.generateSatellites(count);
  }

  static generateCommHubs(count: number = 25): VisualizationData[] {
    const hubTypes = ['SatelliteGroundStation', 'SIGINT_Facility', 'CellTower', 'RadioTelescope'];

    return Array.from({ length: count }, (_, i) => ({
      id: `comm-${Date.now()}-${i}`,
      type: 'CommHubs' as const,
      location: {
        latitude: -90 + Math.random() * 180,
        longitude: -180 + Math.random() * 360
      },
      timestamp: new Date(Date.now() - Math.random() * 86400000 * 30),
      metadata: {
        hubType: hubTypes[Math.floor(Math.random() * hubTypes.length)],
        frequency: (Math.random() * 30 + 1).toFixed(1) + 'GHz',
        coverage: Math.floor(Math.random() * 500) + 50 + 'km',
        classification: 'UNCLASSIFIED'
      },
      priority: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
      status: 'active' as const
    }));
  }

  static generateForType(type: VisualizationType, count?: number): VisualizationData[] {
    switch (type) {
      case 'IntelReports':
        return this.generateIntelReports(count);
      case 'CyberAttacks':
        return this.generateCyberAttacks(count);
      case 'CyberThreats':
        return this.generateCyberThreats(count);
      case 'Satellites':
        return this.generateSatellites(count);
      case 'CommHubs':
        return this.generateCommHubs(count);
      default:
        return [];
    }
  }
}

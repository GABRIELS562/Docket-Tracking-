/**
 * RFID Hardware Configuration
 * Based on industry best practices for warehouse and asset tracking
 */

export const RFIDHardwareConfig = {
  // Reader Configurations
  readers: {
    mobile: {
      zebra_mc3330xr: {
        name: 'Zebra MC3330xR',
        type: 'handheld',
        connectivity: ['WiFi', 'Bluetooth', 'USB'],
        readRange: '0-20 feet',
        tagsPerSecond: 700,
        battery: '3100 mAh',
        useCase: 'Manual inventory, spot checks',
        cost: '$2000-3000'
      }
    },
    
    fixed: {
      zebra_fx9600: {
        name: 'Zebra FX9600',
        type: 'fixed',
        ports: 4,
        connectivity: ['Ethernet', 'GPIO'],
        readRange: '0-30 feet',
        tagsPerSecond: 1300,
        power: 'PoE+ or AC adapter',
        useCase: 'Entry/exit portals, choke points',
        cost: '$1500-2500'
      },
      
      impinj_speedway: {
        name: 'Impinj Speedway R420',
        type: 'fixed',
        ports: 4,
        connectivity: ['Ethernet', 'GPIO', 'USB'],
        readRange: '0-30 feet',
        tagsPerSecond: 1100,
        power: 'PoE+ or AC adapter',
        useCase: 'High-density environments',
        cost: '$1300-2000'
      }
    },
    
    tunnel: {
      impinj_xarray: {
        name: 'Impinj xArray',
        type: 'gateway',
        antennas: 52,
        connectivity: ['Ethernet'],
        readRange: 'Complete coverage',
        tagsPerSecond: 1500,
        power: 'AC adapter',
        useCase: 'Conveyor systems, dock doors',
        cost: '$10000-15000'
      }
    }
  },

  // Tag Configurations by Use Case
  tags: {
    documents: {
      type: 'wet_inlay',
      models: [
        {
          name: 'Smartrac Dogbone',
          chip: 'Impinj Monza R6',
          size: '93mm x 23mm',
          memory: '96-bit EPC + 64-bit TID',
          cost: '$0.10-0.15',
          application: 'Paper labels, file folders'
        },
        {
          name: 'Zebra ZBR2000',
          chip: 'Impinj Monza 4QT',
          size: '70mm x 17mm',
          memory: '128-bit EPC + 48-bit user',
          cost: '$0.12-0.18',
          application: 'Thermal printable labels'
        }
      ]
    },
    
    evidence: {
      type: 'hard_tag',
      models: [
        {
          name: 'Confidex Casey',
          chip: 'NXP UCODE 8',
          size: '52mm x 32mm x 3mm',
          memory: '128-bit EPC + 32-bit user',
          cost: '$0.50-1.00',
          features: ['Tamper-evident', 'Cable tie holes'],
          application: 'Evidence bags, containers'
        },
        {
          name: 'Alien Squiggle',
          chip: 'Alien Higgs-3',
          size: '94mm x 24mm',
          memory: '96-bit EPC + 512-bit user',
          cost: '$0.25-0.40',
          application: 'Flexible surface mounting'
        }
      ]
    },
    
    equipment: {
      type: 'on_metal',
      models: [
        {
          name: 'Xerafy Titanium Metal Skin',
          chip: 'Impinj Monza R6-P',
          size: '52mm x 13mm x 2mm',
          memory: '128-bit EPC + 64-bit user',
          cost: '$2.00-3.00',
          features: ['IP68 rated', 'Industrial adhesive'],
          application: 'Tools, metal equipment'
        },
        {
          name: 'Omni-ID Exo 800',
          chip: 'NXP UCODE 8',
          size: '155mm x 30mm x 10mm',
          memory: '128-bit EPC + 32-bit user',
          cost: '$3.00-5.00',
          features: ['Screw mountable', 'Extreme durability'],
          application: 'Heavy equipment, vehicles'
        }
      ]
    }
  },

  // Printer Configurations
  printers: {
    desktop: {
      zebra_zd420: {
        name: 'Zebra ZD420-RFID',
        type: 'thermal_desktop',
        printWidth: '4 inches',
        rfidCapability: true,
        connectivity: ['USB', 'Ethernet', 'WiFi'],
        tagEncoding: 'On-the-fly',
        throughput: '200 labels/hour',
        cost: '$800-1200',
        useCase: 'Small to medium volume'
      }
    },
    
    industrial: {
      zebra_zt410: {
        name: 'Zebra ZT410-RFID',
        type: 'thermal_industrial',
        printWidth: '4 inches',
        rfidCapability: true,
        connectivity: ['USB', 'Ethernet', 'Serial'],
        tagEncoding: 'High-speed',
        throughput: '1000+ labels/hour',
        cost: '$3000-4000',
        useCase: 'High volume production'
      }
    }
  },

  // Antenna Configurations
  antennas: {
    circular: {
      name: 'Laird S9028PCR',
      type: 'circular_polarized',
      gain: '9 dBi',
      beamwidth: '70 degrees',
      frequency: '902-928 MHz',
      cost: '$100-150',
      useCase: 'General purpose, wide coverage'
    },
    
    linear: {
      name: 'MTI MT-263003',
      type: 'linear_polarized',
      gain: '10 dBi',
      beamwidth: '60 degrees',
      frequency: '902-928 MHz',
      cost: '$120-180',
      useCase: 'Conveyor belts, directional reading'
    },
    
    nearField: {
      name: 'Impinj Brickyard',
      type: 'near_field',
      gain: '3 dBi',
      readRange: '0-18 inches',
      frequency: '865-928 MHz',
      cost: '$200-250',
      useCase: 'Desktop reading, small items'
    }
  },

  // Implementation Phases
  phases: {
    pilot: {
      duration: '1-2 months',
      hardware: ['1 mobile reader', '1000 tags', '1 desktop printer'],
      investment: '$5,000',
      coverage: '1,000-10,000 items'
    },
    
    growth: {
      duration: '3-6 months',
      hardware: ['2 mobile readers', '2 fixed readers', '10000 tags', '1 industrial printer'],
      investment: '$15,000',
      coverage: '10,000-50,000 items'
    },
    
    scale: {
      duration: '6-12 months',
      hardware: ['4 fixed readers', '1 tunnel system', '50000 tags', '2 industrial printers'],
      investment: '$50,000',
      coverage: '50,000-300,000 items'
    },
    
    enterprise: {
      duration: '12+ months',
      hardware: ['10+ fixed readers', 'Multiple tunnels', '300000+ tags', 'Print bureau'],
      investment: '$100,000+',
      coverage: '300,000+ items'
    }
  },

  // RF Configuration
  rfSettings: {
    frequency: {
      us: '902-928 MHz',
      eu: '865-868 MHz',
      channels: 50,
      hopTime: '400ms'
    },
    
    power: {
      mobile: '30 dBm (1W)',
      fixed: '36 dBm (4W)',
      regulatory: 'FCC Part 15.247'
    },
    
    sensitivity: {
      optimal: '-82 dBm',
      minimum: '-70 dBm'
    }
  },

  // Integration APIs
  apis: {
    llrp: {
      name: 'Low Level Reader Protocol',
      version: '1.1',
      standard: 'EPCglobal',
      useCase: 'Reader control and configuration'
    },
    
    epcis: {
      name: 'EPC Information Services',
      version: '2.0',
      standard: 'GS1',
      useCase: 'Event capture and sharing'
    },
    
    rain: {
      name: 'RAIN Communication Interface',
      version: '3.0',
      standard: 'RAIN Alliance',
      useCase: 'Unified reader interface'
    }
  },

  // Vendor Contacts
  vendors: {
    gao_rfid: {
      name: 'GAO RFID Inc',
      website: 'https://gaorfid.com',
      speciality: 'Complete solutions',
      support: 'Excellent'
    },
    
    atlas_rfid: {
      name: 'Atlas RFID Store',
      website: 'https://atlasrfidstore.com',
      speciality: 'Wide selection',
      support: 'Good tutorials'
    },
    
    impinj: {
      name: 'Impinj',
      website: 'https://impinj.com',
      speciality: 'High-performance chips',
      support: 'Enterprise'
    }
  }
};

// Helper functions for hardware selection
export const selectHardware = {
  getReaderByVolume: (itemsPerDay: number) => {
    if (itemsPerDay < 500) return RFIDHardwareConfig.readers.mobile.zebra_mc3330xr;
    if (itemsPerDay < 5000) return RFIDHardwareConfig.readers.fixed.zebra_fx9600;
    return RFIDHardwareConfig.readers.tunnel.impinj_xarray;
  },

  getTagByObjectType: (objectType: string) => {
    switch(objectType) {
      case 'docket':
      case 'file':
        return RFIDHardwareConfig.tags.documents.models[0];
      case 'evidence':
        return RFIDHardwareConfig.tags.evidence.models[0];
      case 'equipment':
      case 'tool':
        return RFIDHardwareConfig.tags.equipment.models[0];
      default:
        return RFIDHardwareConfig.tags.documents.models[0];
    }
  },

  calculateROI: (currentManualTime: number, itemCount: number, investmentCost: number) => {
    const hourlyRate = 50; // $/hour
    const rfidTimePerItem = 0.5; // seconds
    const manualCostPerYear = (currentManualTime * itemCount * hourlyRate) / 3600 * 250; // 250 working days
    const rfidCostPerYear = (rfidTimePerItem * itemCount * hourlyRate) / 3600 * 250;
    const annualSavings = manualCostPerYear - rfidCostPerYear;
    const paybackPeriod = investmentCost / annualSavings;
    
    return {
      annualSavings,
      paybackPeriod,
      fiveYearROI: (annualSavings * 5) - investmentCost
    };
  }
};

export default RFIDHardwareConfig;
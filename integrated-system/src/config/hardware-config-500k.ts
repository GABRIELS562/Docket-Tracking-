/**
 * Hardware Configuration for 500K Docket Tracking System
 * Dual Technology: RFID + Barcode
 * All prices in South African Rands (ZAR)
 */

export const HardwareConfig500K = {
  // System Capacity
  capacity: {
    target: 500000,
    maximum: 2000000,
    dailyMovements: 10000,
    peakHourMovements: 2000,
    utilizationTarget: '25%'
  },

  // Fixed RFID Infrastructure
  fixedReaders: {
    portals: {
      model: 'Zebra FX9600',
      quantity: 10,
      locations: [
        { id: 'PORTAL-MAIN-01', location: 'Main Entrance Left', zone: 'ENTRY' },
        { id: 'PORTAL-MAIN-02', location: 'Main Entrance Right', zone: 'ENTRY' },
        { id: 'PORTAL-EVIDENCE-01', location: 'Evidence Room Entry', zone: 'SECURE' },
        { id: 'PORTAL-EVIDENCE-02', location: 'Evidence Room Exit', zone: 'SECURE' },
        { id: 'PORTAL-ARCHIVE-01', location: 'Archive Entry', zone: 'STORAGE' },
        { id: 'PORTAL-ARCHIVE-02', location: 'Archive Exit', zone: 'STORAGE' },
        { id: 'PORTAL-COURT-01', location: 'Court Transfer In', zone: 'TRANSFER' },
        { id: 'PORTAL-COURT-02', location: 'Court Transfer Out', zone: 'TRANSFER' },
        { id: 'PORTAL-DISPATCH-01', location: 'Dispatch Incoming', zone: 'DISPATCH' },
        { id: 'PORTAL-DISPATCH-02', location: 'Dispatch Outgoing', zone: 'DISPATCH' }
      ],
      specifications: {
        readRate: 1300, // tags per second
        ports: 8,
        antennas: 4, // per reader
        power: '30 dBm',
        connectivity: ['Ethernet', 'GPIO', 'USB'],
        features: ['Direction detection', 'Tag filtering', 'Event management']
      },
      pricing: {
        unitCost: 38000,
        antennaCost: 2500,
        installationCost: 5000,
        totalCost: 380000
      }
    },

    overhead: {
      model: 'Zebra FX9600',
      quantity: 15,
      gridSpacing: '15 feet',
      coverage: '225 square feet per reader',
      specifications: {
        mountHeight: '3 meters',
        antennaType: 'Wide-angle circular polarized',
        antennaGain: '9 dBi',
        beamWidth: '70 degrees'
      },
      pricing: {
        unitCost: 38000,
        antennasCost: 150000, // 60 antennas
        mountingCost: 45000,
        totalCost: 570000
      }
    },

    smartShelves: {
      model: 'Impinj R700',
      quantity: 75,
      shelvesPerReader: 5,
      readers: 15,
      specifications: {
        antennaType: 'Linear shelf antenna',
        readRange: '1 meter',
        capacity: '6,700 dockets per shelf unit',
        shelfLevels: 5
      },
      pricing: {
        readerCost: 420000, // 15 readers @ R28,000
        antennaCost: 360000, // 300 antennas @ R1,200
        integrationCost: 45000,
        totalCost: 825000
      }
    }
  },

  // Mobile Equipment
  mobileReaders: {
    handheld: {
      model: 'Zebra MC3330xR',
      quantity: 3,
      features: [
        'RFID UHF reading',
        'Barcode scanning (1D/2D)',
        'Geiger counter mode',
        'WiFi/Bluetooth connectivity',
        'Android OS',
        'Push-to-talk'
      ],
      specifications: {
        readRange: '0-6 meters',
        battery: '7000 mAh',
        weight: '505g',
        display: '4 inch touchscreen',
        memory: '4GB RAM/32GB Flash'
      },
      pricing: {
        unitCost: 38000,
        totalCost: 114000
      }
    }
  },

  // Barcode Infrastructure
  barcodeSystem: {
    verificationStations: {
      model: 'Zebra DS9908',
      quantity: 5,
      locations: [
        'Main entrance desk',
        'Evidence check-in',
        'Archive desk',
        'Court preparation',
        'Audit station'
      ],
      features: [
        'Omnidirectional scanning',
        'RFID + Barcode combo',
        'Hands-free operation',
        'LED aiming'
      ],
      pricing: {
        unitCost: 7000,
        totalCost: 35000
      }
    },

    mobileScanners: {
      model: 'Zebra DS2278',
      quantity: 5,
      type: 'Bluetooth cordless',
      battery: '2400 mAh',
      pricing: {
        unitCost: 3500,
        totalCost: 17500
      }
    }
  },

  // Tag Specifications
  tags: {
    dualTechnology: {
      model: 'Smartrac DogBone M730 with Barcode',
      quantity: 500000,
      spares: 10000,
      specifications: {
        rfid: {
          chip: 'Impinj M730',
          frequency: 'UHF 860-960 MHz',
          epcMemory: '96 bits',
          userMemory: '64 bits',
          tidMemory: '48 bits',
          readRange: '10 meters',
          stackPenetration: '20 sheets'
        },
        barcode: {
          type: 'Code 128',
          backup: 'QR Code',
          resolution: '203 DPI',
          scanDistance: '30cm'
        },
        physical: {
          size: '100mm x 25mm',
          material: 'Synthetic paper',
          adhesive: 'Permanent acrylic',
          temperature: '-40°C to +85°C',
          lifespan: '10 years'
        }
      },
      pricing: {
        unitCost: 4.50,
        volumeDiscount: '10% at 500K',
        totalCost: 2250000
      }
    },

    specialtyTags: {
      metalMount: {
        model: 'Confidex Silverline Blade',
        quantity: 1000,
        use: 'Metal filing cabinets',
        unitCost: 8.00,
        totalCost: 8000
      },
      tamperEvident: {
        model: 'Alien Higgs-3 Tamper',
        quantity: 5000,
        use: 'High-security evidence',
        unitCost: 6.00,
        totalCost: 30000
      }
    }
  },

  // Printers
  printers: {
    desktop: {
      model: 'Zebra ZD621R',
      quantity: 3,
      features: [
        'RFID encoding',
        'Barcode printing',
        'Color LCD display',
        '203 DPI resolution'
      ],
      throughput: '200 labels/hour',
      pricing: {
        unitCost: 15000,
        totalCost: 45000
      }
    },

    industrial: {
      model: 'Zebra ZT411R',
      quantity: 1,
      features: [
        'High-volume RFID encoding',
        '24/7 operation',
        '600 DPI option',
        'Peel and present'
      ],
      throughput: '1000+ labels/hour',
      pricing: {
        unitCost: 55000,
        totalCost: 55000
      }
    }
  },

  // Network Infrastructure
  network: {
    switches: {
      model: 'Cisco Catalyst 9200',
      quantity: 5,
      ports: 48,
      poe: 'PoE+ (30W per port)',
      pricing: {
        unitCost: 25000,
        totalCost: 125000
      }
    },

    accessPoints: {
      model: 'Cisco Meraki MR46',
      quantity: 10,
      coverage: 'WiFi 6',
      pricing: {
        unitCost: 8000,
        totalCost: 80000
      }
    },

    cabling: {
      cat6a: '2000 meters',
      fiberOptic: '500 meters',
      totalCost: 75000
    }
  },

  // Power Management
  powerManagement: {
    ups: {
      model: 'APC Smart-UPS SRT 10kVA',
      quantity: 3,
      runtime: '4 hours at 50% load',
      features: [
        'Online double conversion',
        'Network management card',
        'Extended battery packs'
      ],
      pricing: {
        unitCost: 65000,
        batteryPacks: 30000,
        totalCost: 225000
      }
    },

    generator: {
      model: 'Cummins 50kVA',
      quantity: 1,
      autoStart: true,
      fuel: 'Diesel',
      runtime: '48 hours',
      pricing: {
        unit: 180000,
        installation: 45000,
        totalCost: 225000
      }
    },

    solar: {
      optional: true,
      panels: '20kW system',
      batteries: '40kWh lithium',
      inverter: '15kW hybrid',
      totalCost: 450000
    }
  },

  // Software Licensing
  software: {
    rfidPlatform: {
      name: 'TagMatiks AT',
      license: 'Enterprise',
      users: 'Unlimited',
      modules: [
        'Asset Tracking',
        'Finding System',
        'Chain of Custody',
        'Analytics Dashboard',
        'API Access'
      ],
      pricing: {
        annual: 150000,
        implementation: 50000,
        training: 40000
      }
    },

    barcodeIntegration: {
      name: 'BarTender Enterprise',
      features: [
        'Label design',
        'Database connectivity',
        'Batch printing',
        'RFID encoding'
      ],
      pricing: {
        license: 30000,
        annual: 6000
      }
    },

    database: {
      name: 'PostgreSQL Enterprise',
      support: 'Professional',
      backup: 'Real-time replication',
      pricing: {
        annual: 60000
      }
    }
  },

  // Total System Cost
  totalCost: {
    hardware: {
      rfidFixed: 1775000,
      rfidMobile: 114000,
      barcode: 52500,
      network: 280000,
      power: 450000,
      printers: 100000,
      subtotal: 2771500
    },

    tags: {
      dual: 2250000,
      specialty: 38000,
      subtotal: 2288000
    },

    software: {
      licenses: 180000,
      implementation: 50000,
      training: 40000,
      subtotal: 270000
    },

    services: {
      installation: 120000,
      rfSurvey: 25000,
      projectManagement: 60000,
      subtotal: 205000
    },

    contingency: {
      percentage: 10,
      amount: 453450
    },

    grandTotal: 4987950,
    negotiatedPrice: 4285000 // After bulk discounts and negotiation
  },

  // ROI Metrics
  roi: {
    annualSavings: {
      labor: 900000,
      lostItems: 580000,
      compliance: 150000,
      efficiency: 470000,
      total: 2100000
    },
    
    operatingCosts: {
      annual: 305000
    },
    
    netAnnualBenefit: 1795000,
    paybackMonths: 28,
    fiveYearROI: 4690000
  }
};

// Helper functions
export const SystemCalculations = {
  // Calculate reader coverage for a given area
  calculateCoverage: (areaSquareMeters: number): number => {
    const readerCoverage = 20; // square meters per reader
    return Math.ceil(areaSquareMeters / readerCoverage);
  },

  // Calculate tag requirements with safety margin
  calculateTags: (items: number, growthRate: number, years: number): number => {
    const projected = items * Math.pow(1 + growthRate, years);
    return Math.ceil(projected * 1.1); // 10% safety margin
  },

  // Find docket time estimation
  estimateFindTime: (readers: number, distance: number): number => {
    const baseTime = 10; // seconds
    const searchTime = distance / readers;
    return Math.round(baseTime + searchTime);
  },

  // System capacity check
  checkCapacity: (currentItems: number): string => {
    const maxCapacity = 2000000;
    const utilization = (currentItems / maxCapacity) * 100;
    
    if (utilization < 30) return 'Excellent - significant headroom';
    if (utilization < 50) return 'Good - comfortable capacity';
    if (utilization < 70) return 'Adequate - monitor growth';
    if (utilization < 90) return 'Warning - plan expansion';
    return 'Critical - immediate expansion needed';
  }
};

export default HardwareConfig500K;
import type { WeddingInfo } from '../types';

export const weddingInfo: WeddingInfo = {
  bride: {
    name: 'Sarah',
    fullName: 'Sarah Michelle Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+1-555-0001'
  },
  groom: {
    name: 'Michael',
    fullName: 'Michael David Thompson',
    email: 'michael.thompson@email.com',
    phone: '+1-555-0002'
  },
  date: {
    ceremony: new Date('2024-08-15T16:00:00'),
    reception: new Date('2024-08-15T18:00:00'),
    rsvpDeadline: new Date('2024-07-15T23:59:59')
  },
  venue: {
    ceremony: {
      name: 'St. Mary\'s Cathedral',
      address: '123 Cathedral Avenue',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      coordinates: {
        lat: 37.7749,
        lng: -122.4194
      },
      website: 'https://stmaryscathedral.org',
      phone: '(415) 555-0123',
      description: 'A stunning Gothic Revival cathedral in the heart of San Francisco, featuring soaring ceilings and beautiful stained glass windows.',
      photos: [
        {
          id: 'ceremony-1',
          url: '/images/venues/cathedral-main.jpg',
          alt: 'St. Mary\'s Cathedral Main Altar',
          caption: 'The magnificent main altar where we\'ll exchange vows',
          isMain: true
        },
        {
          id: 'ceremony-2',
          url: '/images/venues/cathedral-interior.jpg',
          alt: 'Cathedral Interior',
          caption: 'Beautiful Gothic architecture and stained glass'
        }
      ],
      parkingInfo: 'Valet parking available on Cathedral Avenue. Street parking is limited.',
      accessibilityInfo: 'Wheelchair accessible entrance on the south side. Accessible restrooms available.',
      dresscode: 'Formal attire requested'
    },
    reception: {
      name: 'The Grand Ballroom at Hotel Luxe',
      address: '456 Elegant Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94103',
      coordinates: {
        lat: 37.7849,
        lng: -122.4094
      },
      website: 'https://hotelluxe.com/events',
      phone: '(415) 555-0456',
      description: 'An elegant ballroom with crystal chandeliers, marble floors, and panoramic city views.',
      photos: [
        {
          id: 'reception-1',
          url: '/images/venues/ballroom-main.jpg',
          alt: 'Grand Ballroom Setup',
          caption: 'The ballroom set for our reception',
          isMain: true
        },
        {
          id: 'reception-2',
          url: '/images/venues/ballroom-view.jpg',
          alt: 'City View from Ballroom',
          caption: 'Stunning city views from our reception venue'
        }
      ],
      parkingInfo: 'Complimentary valet parking for all wedding guests.',
      accessibilityInfo: 'Fully wheelchair accessible with elevator access to the ballroom level.'
    }
  },
  timeline: [
    {
      time: '2:30 PM',
      event: 'Photography Session',
      description: 'Bridal party photos at the cathedral',
      location: 'St. Mary\'s Cathedral'
    },
    {
      time: '3:30 PM',
      event: 'Guest Arrival',
      description: 'Please arrive 30 minutes before the ceremony begins. Light refreshments will be served.',
      location: 'St. Mary\'s Cathedral'
    },
    {
      time: '4:00 PM',
      event: 'Wedding Ceremony',
      description: 'Join us as we exchange vows in this beautiful cathedral',
      location: 'St. Mary\'s Cathedral'
    },
    {
      time: '4:45 PM',
      event: 'Post-Ceremony Photos',
      description: 'Family and group photos on the cathedral steps',
      location: 'St. Mary\'s Cathedral'
    },
    {
      time: '5:30 PM',
      event: 'Cocktail Hour',
      description: 'Enjoy signature cocktails, wine, and gourmet hors d\'oeuvres',
      location: 'The Grand Ballroom'
    },
    {
      time: '6:30 PM',
      event: 'Reception Dinner',
      description: 'Three-course plated dinner service begins',
      location: 'The Grand Ballroom'
    },
    {
      time: '8:00 PM',
      event: 'First Dance',
      description: 'Our first dance as a married couple',
      location: 'The Grand Ballroom'
    },
    {
      time: '8:15 PM',
      event: 'Parent Dances',
      description: 'Special dances with our parents',
      location: 'The Grand Ballroom'
    },
    {
      time: '8:30 PM',
      event: 'Dancing & Celebration',
      description: 'Dance the night away with live DJ and open bar!',
      location: 'The Grand Ballroom'
    },
    {
      time: '10:00 PM',
      event: 'Cake Cutting',
      description: 'Join us for the traditional cake cutting ceremony',
      location: 'The Grand Ballroom'
    },
    {
      time: '11:30 PM',
      event: 'Last Call',
      description: 'Final drinks and late night snacks',
      location: 'The Grand Ballroom'
    },
    {
      time: '12:00 AM',
      event: 'Grand Exit',
      description: 'Sparkler send-off for the happy couple',
      location: 'Hotel Luxe Front Entrance'
    }
  ],
  registry: [
    // Kitchen & Dining
    {
      id: 'reg-001',
      name: 'KitchenAid Artisan Stand Mixer',
      description: 'Professional-grade stand mixer in Empire Red',
      store: 'Williams Sonoma',
      url: 'https://williamssonoma.com/products/kitchenaid-artisan-mixer',
      price: 399.99,
      originalPrice: 449.99,
      image: '/images/registry/kitchenaid-mixer.jpg',
      category: 'kitchen',
      priority: 'high',
      quantity: 1,
      purchased: 0,
      isAvailable: true
    },
    {
      id: 'reg-002',
      name: 'All-Clad D3 Cookware Set',
      description: '10-piece stainless steel cookware collection',
      store: 'Sur La Table',
      url: 'https://surlatable.com/products/all-clad-d3-cookware-set',
      price: 599.99,
      image: '/images/registry/all-clad-set.jpg',
      category: 'kitchen',
      priority: 'high',
      quantity: 1,
      purchased: 0,
      isAvailable: true
    },
    {
      id: 'reg-003',
      name: 'Henckels Classic Knife Set',
      description: '15-piece professional knife block set',
      store: 'Amazon',
      url: 'https://amazon.com/henckels-knife-set',
      price: 299.99,
      category: 'kitchen',
      priority: 'medium',
      quantity: 1,
      purchased: 0,
      isAvailable: true
    },
    
    // Home & Living
    {
      id: 'reg-004',
      name: 'Egyptian Cotton Sheet Set',
      description: 'Luxury 600-thread count sheets in White, King size',
      store: 'Pottery Barn',
      url: 'https://potterybarn.com/products/egyptian-cotton-sheets',
      price: 199.99,
      category: 'bedroom',
      priority: 'high',
      quantity: 2,
      purchased: 0,
      isAvailable: true
    },
    {
      id: 'reg-005',
      name: 'West Elm Mid-Century Coffee Table',
      description: 'Walnut wood coffee table with hairpin legs',
      store: 'West Elm',
      url: 'https://westelm.com/products/mid-century-coffee-table',
      price: 499.99,
      category: 'home',
      priority: 'medium',
      quantity: 1,
      purchased: 0,
      isAvailable: true
    },
    {
      id: 'reg-006',
      name: 'Dyson V15 Detect Cordless Vacuum',
      description: 'Advanced cordless vacuum with laser detection',
      store: 'Target',
      url: 'https://target.com/p/dyson-v15-detect',
      price: 749.99,
      category: 'home',
      priority: 'medium',
      quantity: 1,
      purchased: 0,
      isAvailable: true
    },

    // Experiences
    {
      id: 'reg-007',
      name: 'Cooking Class for Two',
      description: 'Private cooking class at Sur La Table',
      store: 'Sur La Table',
      url: 'https://surlatable.com/cooking-classes',
      price: 250.00,
      category: 'experience',
      priority: 'low',
      quantity: 1,
      purchased: 0,
      isAvailable: true
    }
  ],
  cashGifts: [
    {
      id: 'cash-001',
      type: 'honeymoon_fund',
      name: 'Honeymoon Fund',
      description: 'Help us create magical memories on our European honeymoon adventure!',
      instructions: 'Contribute any amount to help fund our romantic getaway to Italy and France.',
      qrCode: '/images/qr/honeymoon-fund.png',
      isActive: true,
      icon: '✈️'
    },
    {
      id: 'cash-002',
      type: 'venmo',
      name: 'Venmo',
      description: 'Send a monetary gift via Venmo',
      instructions: 'Send to @SarahMichael-Wedding with a note about the wedding',
      accountInfo: {
        username: '@SarahMichael-Wedding'
      },
      qrCode: '/images/qr/venmo-qr.png',
      isActive: true,
      icon: '💙'
    },
    {
      id: 'cash-003',
      type: 'zelle',
      name: 'Zelle',
      description: 'Send a gift directly to our bank account',
      instructions: 'Send via Zelle to our wedding email address',
      accountInfo: {
        email: 'sarahmichael.wedding@email.com'
      },
      isActive: true,
      icon: '🏦'
    }
  ],
  accommodations: [
    {
      id: 'hotel-001',
      name: 'Hotel Luxe San Francisco',
      type: 'hotel',
      description: 'Our reception venue hotel with special wedding rates. Luxury amenities and prime location.',
      address: '456 Elegant Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94103',
      coordinates: {
        lat: 37.7849,
        lng: -122.4094
      },
      distanceFromVenue: '0 miles - Reception venue location',
      priceRange: '$$$',
      amenities: ['Spa', 'Fitness center', 'Room service', 'Concierge', 'Valet parking'],
      bookingUrl: 'https://hotelluxe.com/book?group=JohnsonThompsonWedding',
      phone: '(415) 555-0456',
      website: 'https://hotelluxe.com',
      groupRate: {
        available: true,
        code: 'JTWEDDING2024',
        description: '$50 off standard rates for wedding guests',
        deadline: new Date('2024-07-01')
      },
      rating: 4.8,
      reviewCount: 1247,
      photos: ['/images/hotels/luxe-exterior.jpg', '/images/hotels/luxe-room.jpg']
    },
    {
      id: 'hotel-002',
      name: 'The Historic Grand Hotel',
      type: 'hotel',
      description: 'Historic boutique hotel with Victorian charm, walking distance to both venues.',
      address: '789 Historic Avenue',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      coordinates: {
        lat: 37.7799,
        lng: -122.4144
      },
      distanceFromVenue: '0.5 miles from ceremony, 0.3 miles from reception',
      priceRange: '$$',
      amenities: ['Free WiFi', 'Continental breakfast', 'Historic architecture', 'Pet-friendly'],
      bookingUrl: 'https://historicgrand.com/reservations',
      phone: '(415) 555-0789',
      website: 'https://historicgrand.com',
      groupRate: {
        available: true,
        code: 'WEDDING15',
        description: '15% off for wedding guests',
        deadline: new Date('2024-06-15')
      },
      rating: 4.5,
      reviewCount: 892,
      photos: ['/images/hotels/grand-lobby.jpg', '/images/hotels/grand-room.jpg']
    },
    {
      id: 'hotel-003',
      name: 'Budget Inn Downtown',
      type: 'hotel',
      description: 'Clean, comfortable accommodations with excellent value near public transportation.',
      address: '321 Budget Street',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94103',
      coordinates: {
        lat: 37.7699,
        lng: -122.4044
      },
      distanceFromVenue: '1.2 miles from venues',
      priceRange: '$',
      amenities: ['Free parking', 'WiFi', '24-hour front desk', 'Coffee station'],
      bookingUrl: 'https://budgetinn.com/book',
      phone: '(415) 555-0321',
      rating: 4.0,
      reviewCount: 456,
      photos: ['/images/hotels/budget-exterior.jpg']
    },
    {
      id: 'airbnb-001',
      name: 'Charming Victorian Near Venues',
      type: 'airbnb',
      description: 'Beautiful 2-bedroom Victorian home perfect for families or groups wanting more space.',
      address: 'Mission District',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94110',
      coordinates: {
        lat: 37.7599,
        lng: -122.4194
      },
      distanceFromVenue: '1.5 miles from venues',
      priceRange: '$$',
      amenities: ['Full kitchen', 'Parking', 'Garden', 'Family-friendly', 'Pet-friendly'],
      bookingUrl: 'https://airbnb.com/h/charming-victorian-sf',
      rating: 4.9,
      reviewCount: 127,
      photos: ['/images/airbnb/victorian-exterior.jpg', '/images/airbnb/victorian-kitchen.jpg']
    }
  ],
  transportation: [
    {
      id: 'transport-001',
      type: 'airport_shuttle',
      name: 'SFO Airport Shuttle',
      description: 'Direct shuttle service from San Francisco International Airport to downtown hotels',
      estimatedCost: '$35-45 per person',
      estimatedTime: '45-60 minutes',
      bookingInfo: 'Book online or at airport shuttle counter',
      website: 'https://sfoshuttle.com',
      notes: 'Runs every 30 minutes, 24/7 service available'
    },
    {
      id: 'transport-002',
      type: 'rideshare',
      name: 'Uber/Lyft',
      description: 'Convenient rideshare options throughout San Francisco',
      estimatedCost: '$15-35 between venues and hotels',
      estimatedTime: '10-20 minutes depending on traffic',
      notes: 'Most convenient option for getting around the city'
    },
    {
      id: 'transport-003',
      type: 'rental_car',
      name: 'Car Rental',
      description: 'Major rental car companies available at SFO and downtown locations',
      estimatedCost: '$50-80 per day',
      bookingInfo: 'Reserve in advance for better rates',
      notes: 'Parking can be expensive and limited in downtown SF'
    },
    {
      id: 'transport-004',
      type: 'public_transit',
      name: 'BART & Muni',
      description: 'Public transportation from airport and around the city',
      estimatedCost: '$3-8 per ride',
      estimatedTime: '45-90 minutes from airport',
      notes: 'BART from SFO to downtown, then Muni for local transport'
    }
  ],
  localAttractions: [
    {
      id: 'attraction-001',
      name: 'Golden Gate Bridge',
      type: 'attraction',
      description: 'Iconic San Francisco landmark and perfect photo opportunity',
      address: 'Golden Gate Bridge Welcome Center',
      coordinates: {
        lat: 37.8199,
        lng: -122.4783
      },
      website: 'https://goldengatebridge.org',
      hours: 'Viewable 24/7, Welcome Center: 9am-6pm',
      distanceFromVenue: '8 miles north of venues',
      rating: 4.9,
      photos: ['/images/attractions/golden-gate.jpg']
    },
    {
      id: 'restaurant-001',
      name: 'Fisherman\'s Wharf',
      type: 'restaurant',
      description: 'Famous waterfront dining and entertainment district',
      address: 'Pier 39, San Francisco',
      coordinates: {
        lat: 37.8087,
        lng: -122.4098
      },
      website: 'https://fishermanswharf.org',
      priceRange: '$$',
      distanceFromVenue: '3 miles from venues',
      rating: 4.3,
      photos: ['/images/attractions/fishermans-wharf.jpg']
    },
    {
      id: 'attraction-002',
      name: 'Union Square Shopping',
      type: 'shopping',
      description: 'Premier shopping district with luxury and department stores',
      address: 'Union Square, San Francisco',
      coordinates: {
        lat: 37.7880,
        lng: -122.4074
      },
      hours: 'Store hours vary, generally 10am-9pm',
      priceRange: '$$$',
      distanceFromVenue: '1 mile from venues',
      rating: 4.5
    },
    {
      id: 'cultural-001',
      name: 'San Francisco Museum of Modern Art',
      type: 'cultural',
      description: 'World-class modern and contemporary art museum',
      address: '151 3rd St, San Francisco',
      coordinates: {
        lat: 37.7857,
        lng: -122.4011
      },
      website: 'https://sfmoma.org',
      phone: '(415) 357-4000',
      hours: 'Fri-Tue: 10am-5pm, Thu: 10am-9pm, Wed: Closed',
      priceRange: '$$',
      distanceFromVenue: '0.8 miles from venues',
      rating: 4.6
    }
  ],
  contacts: [
    {
      role: 'bride',
      name: 'Sarah Johnson',
      phone: '+1-555-0001',
      email: 'sarah.johnson@email.com',
      preferredContact: 'phone',
      availability: 'Weekdays after 6pm, weekends anytime'
    },
    {
      role: 'groom',
      name: 'Michael Thompson',
      phone: '+1-555-0002',
      email: 'michael.thompson@email.com',
      preferredContact: 'email',
      availability: 'Weekdays 9am-5pm, weekends anytime'
    },
    {
      role: 'maid_of_honor',
      name: 'Lisa Williams',
      phone: '+1-555-0105',
      email: 'lisa.williams@email.com',
      preferredContact: 'text',
      availability: 'Evenings and weekends'
    },
    {
      role: 'best_man',
      name: 'James Anderson',
      phone: '+1-555-0106',
      email: 'james.anderson@email.com',
      preferredContact: 'phone',
      availability: 'Weekdays after 7pm, weekends'
    },
    {
      role: 'wedding_planner',
      name: 'Elena Rodriguez',
      phone: '+1-555-9999',
      email: 'elena@dreamweddings.com',
      preferredContact: 'email',
      availability: 'Mon-Fri 9am-6pm'
    }
  ],
  weddingParty: {
    maidOfHonor: {
      id: 'moh-001',
      name: 'Lisa Williams',
      role: 'Maid of Honor',
      relationship: 'Best friend since college',
      photo: '/images/wedding-party/lisa.jpg',
      bio: 'Sarah\'s college roommate and lifelong best friend. Always ready with a laugh and a shoulder to lean on.'
    },
    bestMan: {
      id: 'bm-001',
      name: 'James Anderson',
      role: 'Best Man',
      relationship: 'Brother from another mother',
      photo: '/images/wedding-party/james.jpg',
      bio: 'Michael\'s best friend since high school. Partner in crime and voice of reason.'
    },
    bridesmaids: [
      {
        id: 'bm-001',
        name: 'Emma Thompson',
        role: 'Bridesmaid',
        relationship: 'Sister',
        photo: '/images/wedding-party/emma.jpg',
        bio: 'Sarah\'s loving sister and built-in best friend.'
      },
      {
        id: 'bm-002',
        name: 'Amanda Martinez',
        role: 'Bridesmaid',
        relationship: 'Cousin',
        photo: '/images/wedding-party/amanda.jpg',
        bio: 'Sarah\'s cousin and childhood adventure partner.'
      }
    ],
    groomsmen: [
      {
        id: 'gm-001',
        name: 'David Johnson',
        role: 'Groomsman',
        relationship: 'Brother',
        photo: '/images/wedding-party/david.jpg',
        bio: 'Michael\'s younger brother and loyal supporter.'
      },
      {
        id: 'gm-002',
        name: 'Christopher Taylor',
        role: 'Groomsman',
        relationship: 'College friend',
        photo: '/images/wedding-party/chris.jpg',
        bio: 'College fraternity brother and lifelong friend.'
      }
    ]
  },
  importantInfo: {
    dressCode: 'Formal attire requested. Men: suits or tuxedos. Women: cocktail dresses or formal wear. Please avoid wearing white.',
    ceremony: {
      isUnplugged: true,
      notes: [
        'Please turn off all phones and cameras during the ceremony',
        'Our professional photographer will capture every moment',
        'Ceremony will be approximately 30 minutes',
        'Rice and confetti are not permitted - bubbles will be provided'
      ]
    },
    reception: {
      isOpenBar: true,
      musicRequests: true,
      dancingInfo: 'Live DJ with dance floor available all evening',
      notes: [
        'Full open bar with premium spirits, wine, and beer',
        'Special cocktails: "Sarah\'s Sunset" and "Michael\'s Manhattan"',
        'Late night snack station opens at 10:30 PM',
        'Please let us know about song requests in your RSVP'
      ]
    },
    gifts: {
      preferredDelivery: 'registry',
      homeAddress: '123 Newlywed Lane, San Francisco, CA 94102',
      registryNotes: 'Gifts can be shipped directly from our registry stores or brought to the reception. A gift table will be available at the venue.'
    },
    specialConsiderations: [
      'Both venues are wheelchair accessible',
      'Vegetarian, vegan, and gluten-free meal options available',
      'Please indicate any dietary restrictions in your RSVP',
      'Parking will be provided at both venues',
      'Children are welcome - please include them in your guest count'
    ]
  },
  hashtag: '#SarahMichaelSayIDo',
  website: 'https://sarahmichael2024.wedding.com'
};
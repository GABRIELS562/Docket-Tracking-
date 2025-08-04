import type { IndividualGuest } from '../types';

// Individual guest authentication system - each guest gets their own unique token
// Format: "firstname-lastname-8randomchars"
export const individualGuests: IndividualGuest[] = [
  // Family & Close Friends with Plus-One
  {
    id: 'guest-001',
    firstName: 'Emma',
    lastName: 'Thompson',
    fullName: 'Emma Thompson',
    email: 'emma.thompson@email.com',
    phone: '+1-555-0101',
    token: 'emma-thompson-a7k9m2x4',
    hasUsedToken: false,
    plusOneEligible: true,
    invitationGroup: 'family-bride',
    createdAt: new Date('2024-01-15'),
    specialNotes: 'Bride\'s sister, vegetarian'
  },
  {
    id: 'guest-002',
    firstName: 'Michael',
    lastName: 'Rodriguez',
    fullName: 'Michael Rodriguez',
    email: 'michael.rodriguez@email.com',
    phone: '+1-555-0102',
    token: 'michael-rodriguez-b8j4n1v9',
    hasUsedToken: false,
    plusOneEligible: true,
    invitationGroup: 'friends-college',
    createdAt: new Date('2024-01-15'),
    specialNotes: 'Groom\'s college roommate'
  },
  {
    id: 'guest-003',
    firstName: 'Sarah',
    lastName: 'Chen',
    fullName: 'Sarah Chen',
    email: 'sarah.chen@email.com',
    phone: '+1-555-0103',
    token: 'sarah-chen-c9l5p3w8',
    hasUsedToken: false,
    plusOneEligible: true,
    invitationGroup: 'work-colleagues',
    createdAt: new Date('2024-01-15'),
    dietaryRestrictions: ['gluten-free']
  },
  {
    id: 'guest-004',
    firstName: 'David',
    lastName: 'Johnson',
    fullName: 'David Johnson',
    email: 'david.johnson@email.com',
    phone: '+1-555-0104',
    token: 'david-johnson-d1m6r4z7',
    hasUsedToken: false,
    plusOneEligible: true,
    invitationGroup: 'family-groom',
    createdAt: new Date('2024-01-15'),
    specialNotes: 'Groom\'s brother'
  },
  {
    id: 'guest-005',
    firstName: 'Lisa',
    lastName: 'Williams',
    fullName: 'Lisa Williams',
    email: 'lisa.williams@email.com',
    phone: '+1-555-0105',
    token: 'lisa-williams-e2n7s5a1',
    hasUsedToken: false,
    plusOneEligible: true,
    invitationGroup: 'friends-bride',
    createdAt: new Date('2024-01-15'),
    specialNotes: 'Maid of Honor'
  },
  {
    id: 'guest-006',
    firstName: 'James',
    lastName: 'Anderson',
    fullName: 'James Anderson',
    email: 'james.anderson@email.com',
    phone: '+1-555-0106',
    token: 'james-anderson-f3p8t6b2',
    hasUsedToken: false,
    plusOneEligible: true,
    invitationGroup: 'friends-groom',
    createdAt: new Date('2024-01-15'),
    specialNotes: 'Best Man'
  },
  {
    id: 'guest-007',
    firstName: 'Amanda',
    lastName: 'Martinez',
    fullName: 'Amanda Martinez',
    email: 'amanda.martinez@email.com',
    phone: '+1-555-0107',
    token: 'amanda-martinez-g4q9u7c3',
    hasUsedToken: false,
    plusOneEligible: true,
    invitationGroup: 'family-bride',
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'guest-008',
    firstName: 'Christopher',
    lastName: 'Taylor',
    fullName: 'Christopher Taylor',
    email: 'christopher.taylor@email.com',
    phone: '+1-555-0108',
    token: 'christopher-taylor-h5r1v8d4',
    hasUsedToken: false,
    plusOneEligible: true,
    invitationGroup: 'work-colleagues',
    createdAt: new Date('2024-01-15'),
    dietaryRestrictions: ['vegetarian']
  },
  {
    id: 'guest-009',
    firstName: 'Jessica',
    lastName: 'Brown',
    fullName: 'Jessica Brown',
    email: 'jessica.brown@email.com',
    phone: '+1-555-0109',
    token: 'jessica-brown-i6s2w9e5',
    hasUsedToken: false,
    plusOneEligible: true,
    invitationGroup: 'friends-bride',
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'guest-010',
    firstName: 'Robert',
    lastName: 'Davis',
    fullName: 'Robert Davis',
    email: 'robert.davis@email.com',
    phone: '+1-555-0110',
    token: 'robert-davis-j7t3x1f6',
    hasUsedToken: false,
    plusOneEligible: true,
    invitationGroup: 'family-groom',
    createdAt: new Date('2024-01-15'),
    specialNotes: 'Groom\'s uncle'
  },

  // Individual guests (no plus-one)
  {
    id: 'guest-011',
    firstName: 'Rachel',
    lastName: 'Wilson',
    fullName: 'Rachel Wilson',
    email: 'rachel.wilson@email.com',
    phone: '+1-555-0111',
    token: 'rachel-wilson-k8u4y2g7',
    hasUsedToken: false,
    plusOneEligible: false,
    invitationGroup: 'work-colleagues',
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'guest-012',
    firstName: 'Kevin',
    lastName: 'Moore',
    fullName: 'Kevin Moore',
    email: 'kevin.moore@email.com',
    phone: '+1-555-0112',
    token: 'kevin-moore-l9v5z3h8',
    hasUsedToken: false,
    plusOneEligible: false,
    invitationGroup: 'friends-college',
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'guest-013',
    firstName: 'Nicole',
    lastName: 'Garcia',
    fullName: 'Nicole Garcia',
    email: 'nicole.garcia@email.com',
    phone: '+1-555-0113',
    token: 'nicole-garcia-m1w6a4i9',
    hasUsedToken: false,
    plusOneEligible: false,
    invitationGroup: 'friends-bride',
    createdAt: new Date('2024-01-15'),
    dietaryRestrictions: ['vegan']
  },
  {
    id: 'guest-014',
    firstName: 'Daniel',
    lastName: 'Miller',
    fullName: 'Daniel Miller',
    email: 'daniel.miller@email.com',
    phone: '+1-555-0114',
    token: 'daniel-miller-n2x7b5j1',
    hasUsedToken: false,
    plusOneEligible: false,
    invitationGroup: 'work-colleagues',
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'guest-015',
    firstName: 'Stephanie',
    lastName: 'White',
    fullName: 'Stephanie White',
    email: 'stephanie.white@email.com',
    phone: '+1-555-0115',
    token: 'stephanie-white-p3y8c6k2',
    hasUsedToken: false,
    plusOneEligible: false,
    invitationGroup: 'friends-bride',
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'guest-016',
    firstName: 'Mark',
    lastName: 'Jackson',
    fullName: 'Mark Jackson',
    email: 'mark.jackson@email.com',
    phone: '+1-555-0116',
    token: 'mark-jackson-q4z9d7l3',
    hasUsedToken: false,
    plusOneEligible: false,
    invitationGroup: 'friends-groom',
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'guest-017',
    firstName: 'Ashley',
    lastName: 'Thomas',
    fullName: 'Ashley Thomas',
    email: 'ashley.thomas@email.com',
    phone: '+1-555-0117',
    token: 'ashley-thomas-r5a1e8m4',
    hasUsedToken: false,
    plusOneEligible: false,
    invitationGroup: 'family-bride',
    createdAt: new Date('2024-01-15'),
    specialNotes: 'Bride\'s cousin'
  },
  {
    id: 'guest-018',
    firstName: 'Ryan',
    lastName: 'Lee',
    fullName: 'Ryan Lee',
    email: 'ryan.lee@email.com',
    phone: '+1-555-0118',
    token: 'ryan-lee-s6b2f9n5',
    hasUsedToken: false,
    plusOneEligible: false,
    invitationGroup: 'friends-college',
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'guest-019',
    firstName: 'Megan',
    lastName: 'Clark',
    fullName: 'Megan Clark',
    email: 'megan.clark@email.com',
    phone: '+1-555-0119',
    token: 'megan-clark-t7c3g1p6',
    hasUsedToken: false,
    plusOneEligible: false,
    invitationGroup: 'work-colleagues',
    createdAt: new Date('2024-01-15'),
    dietaryRestrictions: ['dairy-free']
  },
  {
    id: 'guest-020',
    firstName: 'Tyler',
    lastName: 'Harris',
    fullName: 'Tyler Harris',
    email: 'tyler.harris@email.com',
    phone: '+1-555-0120',
    token: 'tyler-harris-u8d4h2q7',
    hasUsedToken: false,
    plusOneEligible: false,
    invitationGroup: 'friends-groom',
    createdAt: new Date('2024-01-15')
  },

  // Additional guests with special cases
  {
    id: 'guest-021',
    firstName: 'Samantha',
    lastName: 'Lewis',
    fullName: 'Samantha Lewis',
    email: 'samantha.lewis@email.com',
    phone: '+1-555-0121',
    token: 'samantha-lewis-v9e5i3r8',
    hasUsedToken: false,
    plusOneEligible: true,
    plusOneName: 'Marcus Lewis',
    plusOneEmail: 'marcus.lewis@email.com',
    invitationGroup: 'family-bride',
    createdAt: new Date('2024-01-15'),
    specialNotes: 'Bride\'s aunt, married couple'
  },
  {
    id: 'guest-022',
    firstName: 'Benjamin',
    lastName: 'Walker',
    fullName: 'Benjamin Walker',
    email: 'benjamin.walker@email.com',
    phone: '+1-555-0122',
    token: 'benjamin-walker-w1f6j4s9',
    hasUsedToken: false,
    plusOneEligible: true,
    invitationGroup: 'family-groom',
    createdAt: new Date('2024-01-15'),
    specialNotes: 'Groom\'s cousin'
  },
  {
    id: 'guest-023',
    firstName: 'Lauren',
    lastName: 'Young',
    fullName: 'Lauren Young',
    email: 'lauren.young@email.com',
    phone: '+1-555-0123',
    token: 'lauren-young-x2g7k5t1',
    hasUsedToken: false,
    plusOneEligible: false,
    invitationGroup: 'friends-bride',
    createdAt: new Date('2024-01-15'),
    dietaryRestrictions: ['nut-free', 'shellfish-free']
  },
  {
    id: 'guest-024',
    firstName: 'Nathan',
    lastName: 'King',
    fullName: 'Nathan King',
    email: 'nathan.king@email.com',
    phone: '+1-555-0124',
    token: 'nathan-king-y3h8l6u2',
    hasUsedToken: false,
    plusOneEligible: true,
    invitationGroup: 'work-colleagues',
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'guest-025',
    firstName: 'Brittany',
    lastName: 'Scott',
    fullName: 'Brittany Scott',
    email: 'brittany.scott@email.com',
    phone: '+1-555-0125',
    token: 'brittany-scott-z4i9m7v3',
    hasUsedToken: false,
    plusOneEligible: false,
    invitationGroup: 'friends-bride',
    createdAt: new Date('2024-01-15')
  }
];

// Guest lookup by token for quick authentication
export const guestTokenMap = new Map<string, IndividualGuest>();
individualGuests.forEach(guest => {
  guestTokenMap.set(guest.token, guest);
});

// Group guests by invitation category
export const guestsByGroup = individualGuests.reduce((groups, guest) => {
  const group = guest.invitationGroup || 'other';
  if (!groups[group]) {
    groups[group] = [];
  }
  groups[group].push(guest);
  return groups;
}, {} as Record<string, IndividualGuest[]>);

// Statistics
export const guestStats = {
  total: individualGuests.length,
  withPlusOne: individualGuests.filter(g => g.plusOneEligible).length,
  withoutPlusOne: individualGuests.filter(g => !g.plusOneEligible).length,
  maxPossibleAttendees: individualGuests.reduce((total, guest) => {
    return total + (guest.plusOneEligible ? 2 : 1);
  }, 0),
  byGroup: Object.keys(guestsByGroup).reduce((stats, group) => {
    stats[group] = guestsByGroup[group].length;
    return stats;
  }, {} as Record<string, number>)
};
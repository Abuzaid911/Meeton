import { User, Event, Attendee, RSVP, EventPhoto, Comment, Notification, NotificationSourceType } from '../types';

// Mock Users with diverse profile photos
export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Andre Lorico',
    email: 'andre@meeton.app',
    username: 'andrelorico',
    bio: 'Event enthusiast and party host extraordinaire! 🎉',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    location: 'Brooklyn, NY',
    interests: ['Parties', 'Music', 'Food', 'Photography'],
    onboardingCompleted: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-06-20'),
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    username: 'sarahj',
    bio: 'Always up for a good time! Love meeting new people.',
    image: 'https://images.unsplash.com/photo-1494790108755-2616b612b1e5?w=150&h=150&fit=crop&crop=face',
    location: 'Manhattan, NY',
    interests: ['Art', 'Music', 'Travel', 'Food'],
    onboardingCompleted: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-06-15'),
  },
  {
    id: '3',
    name: 'Michael Chen',
    email: 'michael@example.com',
    username: 'mikec',
    bio: 'Tech professional who loves networking events.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    location: 'San Francisco, CA',
    interests: ['Technology', 'Business', 'Coffee', 'Hiking'],
    onboardingCompleted: true,
    createdAt: new Date('2024-01-30'),
    updatedAt: new Date('2024-06-18'),
  },
  {
    id: '4',
    name: 'Emily Rodriguez',
    email: 'emily@example.com',
    username: 'emilyr',
    bio: 'Fitness enthusiast and social butterfly! 💪',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    location: 'Los Angeles, CA',
    interests: ['Fitness', 'Health', 'Outdoor Activities', 'Dancing'],
    onboardingCompleted: true,
    createdAt: new Date('2024-03-10'),
    updatedAt: new Date('2024-06-22'),
  },
  {
    id: '5',
    name: 'David Kim',
    email: 'david@example.com',
    username: 'davidk',
    bio: 'Music lover and concert organizer.',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    location: 'Austin, TX',
    interests: ['Music', 'Concerts', 'Guitar', 'Recording'],
    onboardingCompleted: true,
    createdAt: new Date('2024-02-20'),
    updatedAt: new Date('2024-06-25'),
  },
  {
    id: '6',
    name: 'Jessica Williams',
    email: 'jessica@example.com',
    username: 'jessw',
    bio: 'Travel blogger and adventure seeker! ✈️',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    location: 'Miami, FL',
    interests: ['Travel', 'Photography', 'Writing', 'Adventure'],
    onboardingCompleted: true,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-06-18'),
  },
  {
    id: '7',
    name: 'Marcus Thompson',
    email: 'marcus@example.com',
    username: 'marct',
    bio: 'Chef and foodie extraordinaire! 👨‍🍳',
    image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=150&h=150&fit=crop&crop=face',
    location: 'Chicago, IL',
    interests: ['Cooking', 'Food', 'Restaurants', 'Wine'],
    onboardingCompleted: true,
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-06-20'),
  },
  {
    id: '8',
    name: 'Lisa Park',
    email: 'lisa@example.com',
    username: 'lisap',
    bio: 'Designer who loves beautiful spaces and events! 🎨',
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
    location: 'Seattle, WA',
    interests: ['Design', 'Art', 'Interior Design', 'Photography'],
    onboardingCompleted: true,
    createdAt: new Date('2024-01-25'),
    updatedAt: new Date('2024-06-22'),
  },
  {
    id: '9',
    name: 'Alex Rivera',
    email: 'alex@example.com',
    username: 'alexr',
    bio: 'Startup founder and tech enthusiast! 🚀',
    image: 'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face',
    location: 'Austin, TX',
    interests: ['Startups', 'Technology', 'Innovation', 'Networking'],
    onboardingCompleted: true,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-06-19'),
  },
  {
    id: '10',
    name: 'Nina Patel',
    email: 'nina@example.com',
    username: 'ninap',
    bio: 'Yoga instructor and wellness advocate! 🧘‍♀️',
    image: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face',
    location: 'San Diego, CA',
    interests: ['Yoga', 'Wellness', 'Meditation', 'Health'],
    onboardingCompleted: true,
    createdAt: new Date('2024-02-14'),
    updatedAt: new Date('2024-06-21'),
  },
  {
    id: '11',
    name: 'Jordan Brooks',
    email: 'jordan@example.com',
    username: 'jordanb',
    bio: 'Sports fan and weekend warrior! ⚽',
    image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face',
    location: 'Boston, MA',
    interests: ['Sports', 'Fitness', 'Outdoor Activities', 'Soccer'],
    onboardingCompleted: true,
    createdAt: new Date('2024-02-28'),
    updatedAt: new Date('2024-06-17'),
  },
  {
    id: '12',
    name: 'Maya Singh',
    email: 'maya@example.com',
    username: 'mayas',
    bio: 'Book lover and coffee enthusiast! ☕📚',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face',
    location: 'Portland, OR',
    interests: ['Reading', 'Coffee', 'Writing', 'Literature'],
    onboardingCompleted: true,
    createdAt: new Date('2024-01-18'),
    updatedAt: new Date('2024-06-23'),
  },
  {
    id: '13',
    name: 'Tyler Anderson',
    email: 'tyler@example.com',
    username: 'tylera',
    bio: 'Photographer and adventure lover! 📸',
    image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
    location: 'Seattle, WA',
    interests: ['Photography', 'Travel', 'Hiking', 'Art'],
    onboardingCompleted: true,
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-06-20'),
  },
  {
    id: '14',
    name: 'Rachel Green',
    email: 'rachel@example.com',
    username: 'rachelg',
    bio: 'Marketing professional and social butterfly! 🦋',
    image: 'https://images.unsplash.com/photo-1494790108755-2616b612b1e5?w=150&h=150&fit=crop&crop=face',
    location: 'Los Angeles, CA',
    interests: ['Marketing', 'Social Media', 'Fashion', 'Networking'],
    onboardingCompleted: true,
    createdAt: new Date('2024-01-22'),
    updatedAt: new Date('2024-06-19'),
  },
  {
    id: '15',
    name: 'James Wilson',
    email: 'james@example.com',
    username: 'jamesw',
    bio: 'Musician and sound engineer! 🎵',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    location: 'Nashville, TN',
    interests: ['Music', 'Guitar', 'Recording', 'Live Music'],
    onboardingCompleted: true,
    createdAt: new Date('2024-02-15'),
    updatedAt: new Date('2024-06-21'),
  },
  {
    id: '16',
    name: 'Amanda Foster',
    email: 'amanda@example.com',
    username: 'amandaf',
    bio: 'Yoga instructor and wellness coach! 🧘‍♀️',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    location: 'San Diego, CA',
    interests: ['Yoga', 'Meditation', 'Wellness', 'Nutrition'],
    onboardingCompleted: true,
    createdAt: new Date('2024-01-28'),
    updatedAt: new Date('2024-06-18'),
  },
  {
    id: '17',
    name: 'Robert Torres',
    email: 'robert@example.com',
    username: 'robertt',
    bio: 'Software engineer and tech enthusiast! 💻',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    location: 'Austin, TX',
    interests: ['Coding', 'Technology', 'Gaming', 'Innovation'],
    onboardingCompleted: true,
    createdAt: new Date('2024-02-08'),
    updatedAt: new Date('2024-06-22'),
  },
  {
    id: '18',
    name: 'Samantha Lee',
    email: 'samantha@example.com',
    username: 'samanthal',
    bio: 'Event planner and party enthusiast! 🎉',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    location: 'Chicago, IL',
    interests: ['Events', 'Planning', 'Parties', 'Coordination'],
    onboardingCompleted: true,
    createdAt: new Date('2024-01-12'),
    updatedAt: new Date('2024-06-17'),
  },
  {
    id: '19',
    name: 'Christopher Davis',
    email: 'chris@example.com',
    username: 'chrisd',
    bio: 'Fitness trainer and health advocate! 💪',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    location: 'Miami, FL',
    interests: ['Fitness', 'Training', 'Health', 'Nutrition'],
    onboardingCompleted: true,
    createdAt: new Date('2024-02-03'),
    updatedAt: new Date('2024-06-16'),
  },
  {
    id: '20',
    name: 'Nicole Martinez',
    email: 'nicole@example.com',
    username: 'nicolem',
    bio: 'Artist and creative soul! 🎨',
    image: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face',
    location: 'Denver, CO',
    interests: ['Art', 'Painting', 'Creativity', 'Galleries'],
    onboardingCompleted: true,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-06-24'),
  },
  {
    id: '21',
    name: 'Kevin Brown',
    email: 'kevin@example.com',
    username: 'kevinb',
    bio: 'Chef and culinary artist! 👨‍🍳',
    image: 'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=150&h=150&fit=crop&crop=face',
    location: 'New Orleans, LA',
    interests: ['Cooking', 'Culinary Arts', 'Food', 'Restaurants'],
    onboardingCompleted: true,
    createdAt: new Date('2024-02-12'),
    updatedAt: new Date('2024-06-15'),
  },
  {
    id: '22',
    name: 'Michelle Taylor',
    email: 'michelle@example.com',
    username: 'michellet',
    bio: 'Travel blogger and adventure seeker! ✈️',
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
    location: 'San Francisco, CA',
    interests: ['Travel', 'Blogging', 'Adventure', 'Photography'],
    onboardingCompleted: true,
    createdAt: new Date('2024-01-08'),
    updatedAt: new Date('2024-06-13'),
  },
  {
    id: '23',
    name: 'Daniel Garcia',
    email: 'daniel@example.com',
    username: 'danielg',
    bio: 'Basketball player and sports fan! 🏀',
    image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&h=150&fit=crop&crop=face',
    location: 'Los Angeles, CA',
    interests: ['Basketball', 'Sports', 'Fitness', 'Competition'],
    onboardingCompleted: true,
    createdAt: new Date('2024-02-05'),
    updatedAt: new Date('2024-06-14'),
  },
  {
    id: '24',
    name: 'Lauren White',
    email: 'lauren@example.com',
    username: 'laurenw',
    bio: 'Designer and creative professional! 🎨',
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face',
    location: 'Portland, OR',
    interests: ['Design', 'UI/UX', 'Art', 'Innovation'],
    onboardingCompleted: true,
    createdAt: new Date('2024-01-24'),
    updatedAt: new Date('2024-06-12'),
  },
];

// Get dates that are definitely in the future
const getNextWeek = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
};

const getNextMonth = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date;
};

const getTwoWeeksFromNow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date;
};

const getThreeWeeksFromNow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 21);
  return date;
};

const getFiveWeeksFromNow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 35);
  return date;
};

const getSixWeeksFromNow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 42);
  return date;
};

const getSevenWeeksFromNow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 49);
  return date;
};

const getEightWeeksFromNow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 56);
  return date;
};

const getTenWeeksFromNow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 70);
  return date;
};

const getTwelveWeeksFromNow = () => {
  const date = new Date();
  date.setDate(date.getDate() + 84);
  return date;
};

// Mock Events with more variety
export const mockEvents: Event[] = [
  {
    id: '1',
    name: 'Tyler Turns 3!',
    date: getNextWeek(),
    time: '3:00 PM',
    location: 'Chicago, IL',
    lat: 41.8781,
    lng: -87.6298,
    description: "Join us for Tyler's third birthday party! There will be cake, games, and lots of fun for the whole family.",
    duration: 180, // 3 hours
    capacity: 25,
    headerType: 'image',
    headerImageUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=300&fit=crop',
    category: 'Birthday',
    tags: ['Family-friendly', 'Kids', 'Celebration'],
    privacyLevel: 'FRIENDS_ONLY',
    isArchived: false,
    viewCount: 45,
    shareCount: 8,
    hostId: '1',
    host: mockUsers[0],
    createdAt: new Date('2024-05-15'),
    updatedAt: new Date('2024-06-01'),
  },
  {
    id: '2',
    name: 'Housewarming Party',
    date: getTwoWeeksFromNow(),
    time: '8:00 PM',
    location: '1559 Audubon Ave, New York, NY',
    lat: 40.7128,
    lng: -74.0060,
    description: "We've just moved to New York, and warmer weather means housewarming! We'll have light refreshments, drinks, and BBQ'ing in the evening. Come by to hang out, catch up, and meet friends!",
    duration: 240, // 4 hours
    capacity: 40,
    headerType: 'image',
    headerImageUrl: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
    category: 'Party',
    tags: ['Housewarming', 'BBQ', 'Social', 'Food', 'Drinks'],
    privacyLevel: 'FRIENDS_ONLY',
    isArchived: false,
    viewCount: 73,
    shareCount: 12,
    hostId: '1',
    host: mockUsers[0],
    createdAt: new Date('2024-08-01'),
    updatedAt: new Date('2024-08-20'),
  },
  {
    id: '3',
    name: 'Summer BBQ & Pool Party',
    date: getThreeWeeksFromNow(),
    time: '2:00 PM',
    location: 'Central Park, New York, NY',
    lat: 40.7829,
    lng: -73.9654,
    description: 'Beat the summer heat with our pool party! Bring your swimwear, sunscreen, and appetite for great food and fun.',
    duration: 300, // 5 hours
    capacity: 60,
    headerType: 'color',
    headerColor: '#4ECDC4',
    category: 'Party',
    tags: ['Summer', 'Pool', 'BBQ', 'Outdoor', 'Swimming'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 156,
    shareCount: 23,
    hostId: '2',
    host: mockUsers[1],
    createdAt: new Date('2024-06-20'),
    updatedAt: new Date('2024-07-05'),
  },
  {
    id: '4',
    name: 'Tech Networking Mixer',
    date: getNextMonth(),
    time: '6:30 PM',
    location: 'WeWork, San Francisco, CA',
    lat: 37.7749,
    lng: -122.4194,
    description: 'Join fellow tech professionals for an evening of networking, conversations, and light refreshments.',
    duration: 150, // 2.5 hours
    capacity: 80,
    headerType: 'color',
    headerColor: '#667eea',
    category: 'Business',
    tags: ['Networking', 'Tech', 'Professional', 'Career'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 234,
    shareCount: 45,
    hostId: '3',
    host: mockUsers[2],
    createdAt: new Date('2024-06-25'),
    updatedAt: new Date('2024-07-10'),
  },
  {
    id: '5',
    name: 'Rooftop Sunset Yoga',
    date: getTwoWeeksFromNow(),
    time: '6:00 PM',
    location: 'Downtown LA Rooftop, Los Angeles, CA',
    lat: 34.0522,
    lng: -118.2437,
    description: 'Join us for a peaceful sunset yoga session with breathtaking city views. All levels welcome! Mats provided.',
    duration: 90,
    capacity: 25,
    headerType: 'image',
    headerImageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    category: 'Wellness',
    tags: ['Yoga', 'Sunset', 'Wellness', 'Meditation', 'Rooftop'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 89,
    shareCount: 15,
    hostId: '10',
    host: mockUsers[9],
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2024-06-18'),
  },
  {
    id: '6',
    name: 'Jazz Night at Blue Note',
    date: getThreeWeeksFromNow(),
    time: '9:00 PM',
    location: 'Blue Note Jazz Club, New York, NY',
    lat: 40.7282,
    lng: -74.0021,
    description: 'An intimate evening of smooth jazz featuring local artists. Cocktails and small plates available.',
    duration: 180,
    capacity: 50,
    headerType: 'image',
    headerImageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
    category: 'Music',
    tags: ['Jazz', 'Music', 'Nightlife', 'Cocktails', 'Live Music'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 142,
    shareCount: 28,
    hostId: '5',
    host: mockUsers[4],
    createdAt: new Date('2024-06-22'),
    updatedAt: new Date('2024-06-25'),
  },
  {
    id: '7',
    name: 'Food Truck Festival',
    date: getFiveWeeksFromNow(),
    time: '12:00 PM',
    location: 'Millennium Park, Chicago, IL',
    lat: 41.8826,
    lng: -87.6226,
    description: 'A delicious celebration featuring 20+ food trucks, live music, and family activities. Come hungry!',
    duration: 360, // 6 hours
    capacity: 200,
    headerType: 'image',
    headerImageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop',
    category: 'Food',
    tags: ['Food', 'Festival', 'Family', 'Music', 'Outdoor'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 312,
    shareCount: 67,
    hostId: '7',
    host: mockUsers[6],
    createdAt: new Date('2024-06-10'),
    updatedAt: new Date('2024-06-12'),
  },
  {
    id: '8',
    name: 'Beach Volleyball Tournament',
    date: getSixWeeksFromNow(),
    time: '10:00 AM',
    location: 'Manhattan Beach, Los Angeles, CA',
    lat: 33.8848,
    lng: -118.4068,
    description: 'Competitive and recreational beach volleyball tournament. Teams of 4, prizes for winners!',
    duration: 480, // 8 hours
    capacity: 64,
    headerType: 'image',
    headerImageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=300&fit=crop',
    category: 'Sports',
    tags: ['Volleyball', 'Beach', 'Tournament', 'Sports', 'Competition'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 198,
    shareCount: 34,
    hostId: '11',
    host: mockUsers[10],
    createdAt: new Date('2024-06-08'),
    updatedAt: new Date('2024-06-15'),
  },
  {
    id: '9',
    name: 'Wine Tasting Experience',
    date: getSevenWeeksFromNow(),
    time: '7:00 PM',
    location: 'Napa Valley, CA',
    lat: 38.2975,
    lng: -122.2869,
    description: 'An elegant evening of wine tasting featuring local vintages and gourmet appetizers. Expert sommelier guided experience.',
    duration: 120,
    capacity: 30,
    headerType: 'image',
    headerImageUrl: 'https://images.unsplash.com/photo-1506377585622-bedcbb027afc?w=400&h=300&fit=crop',
    category: 'Food',
    tags: ['Wine', 'Tasting', 'Elegant', 'Gourmet', 'Sophisticated'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 89,
    shareCount: 18,
    hostId: '7',
    host: mockUsers[6],
    createdAt: new Date('2024-06-25'),
    updatedAt: new Date('2024-06-28'),
  },
  {
    id: '10',
    name: 'Art Gallery Opening',
    date: getEightWeeksFromNow(),
    time: '6:30 PM',
    location: 'MOMA, New York, NY',
    lat: 40.7614,
    lng: -73.9776,
    description: 'Exclusive opening of contemporary art exhibition featuring emerging artists. Cocktails and networking with art enthusiasts.',
    duration: 180,
    capacity: 75,
    headerType: 'image',
    headerImageUrl: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop',
    category: 'Art',
    tags: ['Art', 'Gallery', 'Contemporary', 'Culture', 'Networking'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 124,
    shareCount: 22,
    hostId: '8',
    host: mockUsers[7],
    createdAt: new Date('2024-07-01'),
    updatedAt: new Date('2024-07-03'),
  },
  {
    id: '11',
    name: 'Outdoor Movie Night',
    date: getTwoWeeksFromNow(),
    time: '8:30 PM',
    location: 'Prospect Park, Brooklyn, NY',
    lat: 40.6602,
    lng: -73.9690,
    description: 'Classic movie under the stars! Bring blankets and snacks. Popcorn and drinks available for purchase.',
    duration: 150,
    capacity: 100,
    headerType: 'color',
    headerColor: '#134e5e',
    category: 'Entertainment',
    tags: ['Movie', 'Outdoor', 'Family', 'Summer', 'Stars'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 167,
    shareCount: 31,
    hostId: '6',
    host: mockUsers[5],
    createdAt: new Date('2024-06-20'),
    updatedAt: new Date('2024-06-22'),
  },
  {
    id: '12',
    name: 'Cooking Masterclass',
    date: getThreeWeeksFromNow(),
    time: '2:00 PM',
    location: 'Culinary Institute, Chicago, IL',
    lat: 41.8781,
    lng: -87.6298,
    description: 'Learn to cook authentic Italian cuisine with Chef Marcus! Hands-on class includes 3-course meal and wine pairing.',
    duration: 240,
    capacity: 20,
    headerType: 'image',
    headerImageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop',
    category: 'Food',
    tags: ['Cooking', 'Italian', 'Masterclass', 'Wine', 'Learning'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 98,
    shareCount: 15,
    hostId: '7',
    host: mockUsers[6],
    createdAt: new Date('2024-06-18'),
    updatedAt: new Date('2024-06-20'),
  },
  {
    id: '13',
    name: 'Startup Pitch Night',
    date: getNextMonth(),
    time: '7:00 PM',
    location: 'TechHub Austin, TX',
    lat: 30.2672,
    lng: -97.7431,
    description: 'Watch innovative startups pitch their ideas to investors. Networking session and happy hour to follow!',
    duration: 180,
    capacity: 120,
    headerType: 'color',
    headerColor: '#667eea',
    category: 'Business',
    tags: ['Startup', 'Pitch', 'Investors', 'Innovation', 'Networking'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 245,
    shareCount: 42,
    hostId: '9',
    host: mockUsers[8],
    createdAt: new Date('2024-07-05'),
    updatedAt: new Date('2024-07-08'),
  },
  {
    id: '14',
    name: 'Charity 5K Run',
    date: getTenWeeksFromNow(),
    time: '8:00 AM',
    location: 'Golden Gate Park, San Francisco, CA',
    lat: 37.7694,
    lng: -122.4862,
    description: 'Join us for a fun run supporting local children\'s charities. All fitness levels welcome! Post-run breakfast included.',
    duration: 120,
    capacity: 200,
    headerType: 'image',
    headerImageUrl: 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=400&h=300&fit=crop',
    category: 'Sports',
    tags: ['Running', 'Charity', 'Fitness', 'Community', 'Health'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 178,
    shareCount: 28,
    hostId: '11',
    host: mockUsers[10],
    createdAt: new Date('2024-07-10'),
    updatedAt: new Date('2024-07-12'),
  },
  {
    id: '15',
    name: 'Coffee & Book Club',
    date: getNextWeek(),
    time: '10:00 AM',
    location: 'Powell\'s Books, Portland, OR',
    lat: 45.5152,
    lng: -122.6784,
    description: 'Monthly book discussion over specialty coffee. This month: "The Seven Husbands of Evelyn Hugo". New members welcome!',
    duration: 90,
    capacity: 15,
    headerType: 'color',
    headerColor: '#8B4513',
    category: 'Culture',
    tags: ['Books', 'Coffee', 'Discussion', 'Literature', 'Community'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 67,
    shareCount: 12,
    hostId: '12',
    host: mockUsers[11],
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2024-06-17'),
  },
  {
    id: '16',
    name: 'Photography Walk',
    date: getFiveWeeksFromNow(),
    time: '6:00 AM',
    location: 'Brooklyn Bridge, New York, NY',
    lat: 40.7061,
    lng: -73.9969,
    description: 'Capture the sunrise over Manhattan! Photography walk for all skill levels. Tips and tricks shared throughout.',
    duration: 180,
    capacity: 25,
    headerType: 'image',
    headerImageUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=300&fit=crop',
    category: 'Art',
    tags: ['Photography', 'Sunrise', 'Bridge', 'Learning', 'Capture'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 93,
    shareCount: 19,
    hostId: '6',
    host: mockUsers[5],
    createdAt: new Date('2024-06-30'),
    updatedAt: new Date('2024-07-02'),
  },
  {
    id: '17',
    name: 'Meditation & Mindfulness Retreat',
    date: getTwelveWeeksFromNow(),
    time: '9:00 AM',
    location: 'Marin Headlands, CA',
    lat: 37.8330,
    lng: -122.4969,
    description: 'One-day mindfulness retreat in nature. Guided meditation, breathing exercises, and peaceful reflection time.',
    duration: 360,
    capacity: 40,
    headerType: 'image',
    headerImageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    category: 'Wellness',
    tags: ['Meditation', 'Mindfulness', 'Retreat', 'Nature', 'Peace'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 156,
    shareCount: 25,
    hostId: '10',
    host: mockUsers[9],
    createdAt: new Date('2024-07-15'),
    updatedAt: new Date('2024-07-18'),
  },
  {
    id: '18',
    name: 'Game Night Extravaganza',
    date: getThreeWeeksFromNow(),
    time: '7:30 PM',
    location: 'Community Center, Austin, TX',
    lat: 30.2672,
    lng: -97.7431,
    description: 'Board games, video games, and friendly competition! Pizza and drinks provided. Bring your favorite games to share.',
    duration: 240,
    capacity: 50,
    headerType: 'color',
    headerColor: '#FF6B6B',
    category: 'Entertainment',
    tags: ['Games', 'Board Games', 'Video Games', 'Fun', 'Social'],
    privacyLevel: 'PUBLIC',
    isArchived: false,
    viewCount: 134,
    shareCount: 23,
    hostId: '9',
    host: mockUsers[8],
    createdAt: new Date('2024-06-28'),
    updatedAt: new Date('2024-06-30'),
  },
];

// Mock Attendees with diverse combinations for beautiful avatar circles
export const mockAttendees: Attendee[] = [
  // Tyler's Birthday Party - Family and close friends
  {
    id: '1',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 3,
    userId: '2',
    eventId: '1',
    user: mockUsers[1], // Sarah Johnson
    event: mockEvents[0],
    createdAt: new Date('2024-05-20'),
    updatedAt: new Date('2024-05-20'),
  },
  {
    id: '2',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '3',
    eventId: '1',
    user: mockUsers[2], // Michael Chen
    event: mockEvents[0],
    createdAt: new Date('2024-05-22'),
    updatedAt: new Date('2024-06-01'),
  },
  {
    id: '3',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '4',
    eventId: '1',
    user: mockUsers[3], // Emily Rodriguez
    event: mockEvents[0],
    createdAt: new Date('2024-05-23'),
    updatedAt: new Date('2024-05-23'),
  },
  {
    id: '4',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '7',
    eventId: '1',
    user: mockUsers[6], // Marcus Thompson
    event: mockEvents[0],
    createdAt: new Date('2024-05-24'),
    updatedAt: new Date('2024-05-24'),
  },
  {
    id: '5',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '8',
    eventId: '1',
    user: mockUsers[7], // Lisa Park
    event: mockEvents[0],
    createdAt: new Date('2024-05-25'),
    updatedAt: new Date('2024-05-25'),
  },
  {
    id: '6',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '12',
    eventId: '1',
    user: mockUsers[11], // Maya Singh
    event: mockEvents[0],
    createdAt: new Date('2024-05-26'),
    updatedAt: new Date('2024-05-26'),
  },

  // Housewarming Party - Social crowd
  {
    id: '7',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '2',
    eventId: '2',
    user: mockUsers[1], // Sarah Johnson
    event: mockEvents[1],
    createdAt: new Date('2024-08-05'),
    updatedAt: new Date('2024-08-15'),
  },
  {
    id: '8',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '4',
    eventId: '2',
    user: mockUsers[3], // Emily Rodriguez
    event: mockEvents[1],
    createdAt: new Date('2024-08-03'),
    updatedAt: new Date('2024-08-03'),
  },
  {
    id: '9',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 3,
    userId: '6',
    eventId: '2',
    user: mockUsers[5], // Jessica Williams
    event: mockEvents[1],
    createdAt: new Date('2024-08-04'),
    updatedAt: new Date('2024-08-04'),
  },
  {
    id: '10',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '8',
    eventId: '2',
    user: mockUsers[7], // Lisa Park
    event: mockEvents[1],
    createdAt: new Date('2024-08-06'),
    updatedAt: new Date('2024-08-06'),
  },
  {
    id: '11',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '9',
    eventId: '2',
    user: mockUsers[8], // Alex Rivera
    event: mockEvents[1],
    createdAt: new Date('2024-08-07'),
    updatedAt: new Date('2024-08-07'),
  },
  {
    id: '12',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '11',
    eventId: '2',
    user: mockUsers[10], // Jordan Brooks
    event: mockEvents[1],
    createdAt: new Date('2024-08-08'),
    updatedAt: new Date('2024-08-08'),
  },
  {
    id: '13',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '12',
    eventId: '2',
    user: mockUsers[11], // Maya Singh
    event: mockEvents[1],
    createdAt: new Date('2024-08-09'),
    updatedAt: new Date('2024-08-09'),
  },

  // Summer BBQ & Pool Party - Large social gathering
  {
    id: '14',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '1',
    eventId: '3',
    user: mockUsers[0], // Andre Lorico
    event: mockEvents[2],
    createdAt: new Date('2024-06-21'),
    updatedAt: new Date('2024-06-21'),
  },
  {
    id: '15',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '3',
    eventId: '3',
    user: mockUsers[2], // Michael Chen
    event: mockEvents[2],
    createdAt: new Date('2024-06-22'),
    updatedAt: new Date('2024-06-22'),
  },
  {
    id: '16',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '4',
    eventId: '3',
    user: mockUsers[3], // Emily Rodriguez
    event: mockEvents[2],
    createdAt: new Date('2024-06-23'),
    updatedAt: new Date('2024-06-23'),
  },
  {
    id: '17',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '5',
    eventId: '3',
    user: mockUsers[4], // David Kim
    event: mockEvents[2],
    createdAt: new Date('2024-06-24'),
    updatedAt: new Date('2024-06-24'),
  },
  {
    id: '18',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '6',
    eventId: '3',
    user: mockUsers[5], // Jessica Williams
    event: mockEvents[2],
    createdAt: new Date('2024-06-25'),
    updatedAt: new Date('2024-06-25'),
  },
  {
    id: '19',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 3,
    userId: '10',
    eventId: '3',
    user: mockUsers[9], // Nina Patel
    event: mockEvents[2],
    createdAt: new Date('2024-06-26'),
    updatedAt: new Date('2024-06-26'),
  },
  {
    id: '20',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '11',
    eventId: '3',
    user: mockUsers[10], // Jordan Brooks
    event: mockEvents[2],
    createdAt: new Date('2024-06-27'),
    updatedAt: new Date('2024-06-27'),
  },

  // Tech Networking Mixer - Professional crowd
  {
    id: '21',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '1',
    eventId: '4',
    user: mockUsers[0], // Andre Lorico
    event: mockEvents[3],
    createdAt: new Date('2024-06-28'),
    updatedAt: new Date('2024-06-28'),
  },
  {
    id: '22',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '8',
    eventId: '4',
    user: mockUsers[7], // Lisa Park
    event: mockEvents[3],
    createdAt: new Date('2024-06-29'),
    updatedAt: new Date('2024-06-29'),
  },
  {
    id: '23',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 3,
    userId: '9',
    eventId: '4',
    user: mockUsers[8], // Alex Rivera
    event: mockEvents[3],
    createdAt: new Date('2024-06-30'),
    updatedAt: new Date('2024-06-30'),
  },
  {
    id: '24',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '2',
    eventId: '4',
    user: mockUsers[1], // Sarah Johnson
    event: mockEvents[3],
    createdAt: new Date('2024-07-01'),
    updatedAt: new Date('2024-07-01'),
  },
  {
    id: '25',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '12',
    eventId: '4',
    user: mockUsers[11], // Maya Singh
    event: mockEvents[3],
    createdAt: new Date('2024-07-02'),
    updatedAt: new Date('2024-07-02'),
  },

  // Rooftop Sunset Yoga - Wellness enthusiasts
  {
    id: '26',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '2',
    eventId: '5',
    user: mockUsers[1], // Sarah Johnson
    event: mockEvents[4],
    createdAt: new Date('2024-06-16'),
    updatedAt: new Date('2024-06-16'),
  },
  {
    id: '27',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '4',
    eventId: '5',
    user: mockUsers[3], // Emily Rodriguez
    event: mockEvents[4],
    createdAt: new Date('2024-06-17'),
    updatedAt: new Date('2024-06-17'),
  },
  {
    id: '28',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '6',
    eventId: '5',
    user: mockUsers[5], // Jessica Williams
    event: mockEvents[4],
    createdAt: new Date('2024-06-18'),
    updatedAt: new Date('2024-06-18'),
  },
  {
    id: '29',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 3,
    userId: '8',
    eventId: '5',
    user: mockUsers[7], // Lisa Park
    event: mockEvents[4],
    createdAt: new Date('2024-06-19'),
    updatedAt: new Date('2024-06-19'),
  },
  {
    id: '30',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '12',
    eventId: '5',
    user: mockUsers[11], // Maya Singh
    event: mockEvents[4],
    createdAt: new Date('2024-06-20'),
    updatedAt: new Date('2024-06-20'),
  },

  // Jazz Night at Blue Note - Music lovers
  {
    id: '31',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '1',
    eventId: '6',
    user: mockUsers[0], // Andre Lorico
    event: mockEvents[5],
    createdAt: new Date('2024-06-23'),
    updatedAt: new Date('2024-06-23'),
  },
  {
    id: '32',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '2',
    eventId: '6',
    user: mockUsers[1], // Sarah Johnson
    event: mockEvents[5],
    createdAt: new Date('2024-06-24'),
    updatedAt: new Date('2024-06-24'),
  },
  {
    id: '33',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 3,
    userId: '7',
    eventId: '6',
    user: mockUsers[6], // Marcus Thompson
    event: mockEvents[5],
    createdAt: new Date('2024-06-25'),
    updatedAt: new Date('2024-06-25'),
  },
  {
    id: '34',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '9',
    eventId: '6',
    user: mockUsers[8], // Alex Rivera
    event: mockEvents[5],
    createdAt: new Date('2024-06-26'),
    updatedAt: new Date('2024-06-26'),
  },
  {
    id: '35',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '12',
    eventId: '6',
    user: mockUsers[11], // Maya Singh
    event: mockEvents[5],
    createdAt: new Date('2024-06-27'),
    updatedAt: new Date('2024-06-27'),
  },

  // Food Truck Festival - Food enthusiasts
  {
    id: '36',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '1',
    eventId: '7',
    user: mockUsers[0], // Andre Lorico
    event: mockEvents[6],
    createdAt: new Date('2024-06-11'),
    updatedAt: new Date('2024-06-11'),
  },
  {
    id: '37',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '2',
    eventId: '7',
    user: mockUsers[1], // Sarah Johnson
    event: mockEvents[6],
    createdAt: new Date('2024-06-12'),
    updatedAt: new Date('2024-06-12'),
  },
  {
    id: '38',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '3',
    eventId: '7',
    user: mockUsers[2], // Michael Chen
    event: mockEvents[6],
    createdAt: new Date('2024-06-13'),
    updatedAt: new Date('2024-06-13'),
  },
  {
    id: '39',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 3,
    userId: '6',
    eventId: '7',
    user: mockUsers[5], // Jessica Williams
    event: mockEvents[6],
    createdAt: new Date('2024-06-14'),
    updatedAt: new Date('2024-06-14'),
  },
  {
    id: '40',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '8',
    eventId: '7',
    user: mockUsers[7], // Lisa Park
    event: mockEvents[6],
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2024-06-15'),
  },
  {
    id: '41',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '10',
    eventId: '7',
    user: mockUsers[9], // Nina Patel
    event: mockEvents[6],
    createdAt: new Date('2024-06-16'),
    updatedAt: new Date('2024-06-16'),
  },
  {
    id: '42',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '12',
    eventId: '7',
    user: mockUsers[11], // Maya Singh
    event: mockEvents[6],
    createdAt: new Date('2024-06-17'),
    updatedAt: new Date('2024-06-17'),
  },

  // Beach Volleyball Tournament - Sports enthusiasts
  {
    id: '43',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '4',
    eventId: '8',
    user: mockUsers[3], // Emily Rodriguez
    event: mockEvents[7],
    createdAt: new Date('2024-06-09'),
    updatedAt: new Date('2024-06-09'),
  },
  {
    id: '44',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '5',
    eventId: '8',
    user: mockUsers[4], // David Kim
    event: mockEvents[7],
    createdAt: new Date('2024-06-10'),
    updatedAt: new Date('2024-06-10'),
  },
  {
    id: '45',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 3,
    userId: '6',
    eventId: '8',
    user: mockUsers[5], // Jessica Williams
    event: mockEvents[7],
    createdAt: new Date('2024-06-11'),
    updatedAt: new Date('2024-06-11'),
  },
  {
    id: '46',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '9',
    eventId: '8',
    user: mockUsers[8], // Alex Rivera
    event: mockEvents[7],
    createdAt: new Date('2024-06-12'),
    updatedAt: new Date('2024-06-12'),
  },
  {
    id: '47',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '10',
    eventId: '8',
    user: mockUsers[9], // Nina Patel
    event: mockEvents[7],
    createdAt: new Date('2024-06-13'),
    updatedAt: new Date('2024-06-13'),
  },
  {
    id: '48',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '1',
    eventId: '8',
    user: mockUsers[0], // Andre Lorico
    event: mockEvents[7],
    createdAt: new Date('2024-06-14'),
    updatedAt: new Date('2024-06-14'),
  },

  // Additional attendees to make fuller circles
  // More Tyler's Birthday Party attendees
  {
    id: '49',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '5',
    eventId: '1',
    user: mockUsers[4], // David Kim
    event: mockEvents[0],
    createdAt: new Date('2024-05-27'),
    updatedAt: new Date('2024-05-27'),
  },
  {
    id: '50',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '6',
    eventId: '1',
    user: mockUsers[5], // Jessica Williams
    event: mockEvents[0],
    createdAt: new Date('2024-05-28'),
    updatedAt: new Date('2024-05-28'),
  },

  // More Summer BBQ & Pool Party attendees (make it a big event)
  {
    id: '51',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '7',
    eventId: '3',
    user: mockUsers[6], // Marcus Thompson
    event: mockEvents[2],
    createdAt: new Date('2024-06-28'),
    updatedAt: new Date('2024-06-28'),
  },
  {
    id: '52',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '8',
    eventId: '3',
    user: mockUsers[7], // Lisa Park
    event: mockEvents[2],
    createdAt: new Date('2024-06-29'),
    updatedAt: new Date('2024-06-29'),
  },
  {
    id: '53',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '12',
    eventId: '3',
    user: mockUsers[11], // Maya Singh
    event: mockEvents[2],
    createdAt: new Date('2024-06-30'),
    updatedAt: new Date('2024-06-30'),
  },

  // More Tech Networking Mixer attendees
  {
    id: '54',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '4',
    eventId: '4',
    user: mockUsers[3], // Emily Rodriguez
    event: mockEvents[3],
    createdAt: new Date('2024-07-03'),
    updatedAt: new Date('2024-07-03'),
  },
  {
    id: '55',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 3,
    userId: '6',
    eventId: '4',
    user: mockUsers[5], // Jessica Williams
    event: mockEvents[3],
    createdAt: new Date('2024-07-04'),
    updatedAt: new Date('2024-07-04'),
  },
  {
    id: '56',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '7',
    eventId: '4',
    user: mockUsers[6], // Marcus Thompson
    event: mockEvents[3],
    createdAt: new Date('2024-07-05'),
    updatedAt: new Date('2024-07-05'),
  },

  // More Rooftop Sunset Yoga attendees
  {
    id: '57',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '1',
    eventId: '5',
    user: mockUsers[0], // Andre Lorico
    event: mockEvents[4],
    createdAt: new Date('2024-06-21'),
    updatedAt: new Date('2024-06-21'),
  },
  {
    id: '58',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '7',
    eventId: '5',
    user: mockUsers[6], // Marcus Thompson
    event: mockEvents[4],
    createdAt: new Date('2024-06-22'),
    updatedAt: new Date('2024-06-22'),
  },
  {
    id: '59',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '11',
    eventId: '5',
    user: mockUsers[10], // Jordan Brooks
    event: mockEvents[4],
    createdAt: new Date('2024-06-23'),
    updatedAt: new Date('2024-06-23'),
  },

  // More Jazz Night attendees
  {
    id: '60',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '3',
    eventId: '6',
    user: mockUsers[2], // Michael Chen
    event: mockEvents[5],
    createdAt: new Date('2024-06-28'),
    updatedAt: new Date('2024-06-28'),
  },
  {
    id: '61',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '6',
    eventId: '6',
    user: mockUsers[5], // Jessica Williams
    event: mockEvents[5],
    createdAt: new Date('2024-06-29'),
    updatedAt: new Date('2024-06-29'),
  },
  {
    id: '62',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '11',
    eventId: '6',
    user: mockUsers[10], // Jordan Brooks
    event: mockEvents[5],
    createdAt: new Date('2024-06-30'),
    updatedAt: new Date('2024-06-30'),
  },

  // More Food Truck Festival attendees (big public event)
  {
    id: '63',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '4',
    eventId: '7',
    user: mockUsers[3], // Emily Rodriguez
    event: mockEvents[6],
    createdAt: new Date('2024-06-18'),
    updatedAt: new Date('2024-06-18'),
  },
  {
    id: '64',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '5',
    eventId: '7',
    user: mockUsers[4], // David Kim
    event: mockEvents[6],
    createdAt: new Date('2024-06-19'),
    updatedAt: new Date('2024-06-19'),
  },
  {
    id: '65',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '9',
    eventId: '7',
    user: mockUsers[8], // Alex Rivera
    event: mockEvents[6],
    createdAt: new Date('2024-06-20'),
    updatedAt: new Date('2024-06-20'),
  },
  {
    id: '66',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 3,
    userId: '11',
    eventId: '7',
    user: mockUsers[10], // Jordan Brooks
    event: mockEvents[6],
    createdAt: new Date('2024-06-21'),
    updatedAt: new Date('2024-06-21'),
  },

  // More Beach Volleyball Tournament attendees
  {
    id: '67',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '2',
    eventId: '8',
    user: mockUsers[1], // Sarah Johnson
    event: mockEvents[7],
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2024-06-15'),
  },
  {
    id: '68',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '7',
    eventId: '8',
    user: mockUsers[6], // Marcus Thompson
    event: mockEvents[7],
    createdAt: new Date('2024-06-16'),
    updatedAt: new Date('2024-06-16'),
  },
  {
    id: '69',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '8',
    eventId: '8',
    user: mockUsers[7], // Lisa Park
    event: mockEvents[7],
    createdAt: new Date('2024-06-17'),
    updatedAt: new Date('2024-06-17'),
  },

  // Extra attendees for Housewarming Party
  {
    id: '70',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '3',
    eventId: '2',
    user: mockUsers[2], // Michael Chen
    event: mockEvents[1],
    createdAt: new Date('2024-08-10'),
    updatedAt: new Date('2024-08-10'),
  },
  {
    id: '71',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '5',
    eventId: '2',
    user: mockUsers[4], // David Kim
    event: mockEvents[1],
    createdAt: new Date('2024-08-11'),
    updatedAt: new Date('2024-08-11'),
  },
  {
    id: '72',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '10',
    eventId: '2',
    user: mockUsers[9], // Nina Patel
    event: mockEvents[1],
    createdAt: new Date('2024-08-12'),
    updatedAt: new Date('2024-08-12'),
  },

  // Additional attendees for Tyler's Birthday Party (Event 1)
  {
    id: '73',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '13',
    eventId: '1',
    user: mockUsers[12], // Tyler Anderson
    event: mockEvents[0],
    createdAt: new Date('2024-05-21'),
    updatedAt: new Date('2024-05-21'),
  },
  {
    id: '74',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '14',
    eventId: '1',
    user: mockUsers[13], // Rachel Green
    event: mockEvents[0],
    createdAt: new Date('2024-05-22'),
    updatedAt: new Date('2024-05-22'),
  },
  {
    id: '75',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '15',
    eventId: '1',
    user: mockUsers[14], // James Wilson
    event: mockEvents[0],
    createdAt: new Date('2024-05-23'),
    updatedAt: new Date('2024-05-23'),
  },
  {
    id: '76',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '16',
    eventId: '1',
    user: mockUsers[15], // Amanda Foster
    event: mockEvents[0],
    createdAt: new Date('2024-05-24'),
    updatedAt: new Date('2024-05-24'),
  },
  {
    id: '77',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '17',
    eventId: '1',
    user: mockUsers[16], // Robert Torres
    event: mockEvents[0],
    createdAt: new Date('2024-05-25'),
    updatedAt: new Date('2024-05-25'),
  },

  // Additional attendees for Housewarming Party (Event 2)
  {
    id: '78',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '18',
    eventId: '2',
    user: mockUsers[17], // Samantha Lee
    event: mockEvents[1],
    createdAt: new Date('2024-08-05'),
    updatedAt: new Date('2024-08-05'),
  },
  {
    id: '79',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 3,
    userId: '19',
    eventId: '2',
    user: mockUsers[18], // Christopher Davis
    event: mockEvents[1],
    createdAt: new Date('2024-08-06'),
    updatedAt: new Date('2024-08-06'),
  },
  {
    id: '80',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '20',
    eventId: '2',
    user: mockUsers[19], // Nicole Martinez
    event: mockEvents[1],
    createdAt: new Date('2024-08-07'),
    updatedAt: new Date('2024-08-07'),
  },
  {
    id: '81',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '21',
    eventId: '2',
    user: mockUsers[20], // Kevin Brown
    event: mockEvents[1],
    createdAt: new Date('2024-08-08'),
    updatedAt: new Date('2024-08-08'),
  },
  {
    id: '82',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '22',
    eventId: '2',
    user: mockUsers[21], // Michelle Taylor
    event: mockEvents[1],
    createdAt: new Date('2024-08-09'),
    updatedAt: new Date('2024-08-09'),
  },
  {
    id: '83',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '23',
    eventId: '2',
    user: mockUsers[22], // Daniel Garcia
    event: mockEvents[1],
    createdAt: new Date('2024-08-10'),
    updatedAt: new Date('2024-08-10'),
  },

  // Additional attendees for Summer BBQ & Pool Party (Event 3)
  {
    id: '84',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '7',
    eventId: '3',
    user: mockUsers[6], // Marcus Thompson
    event: mockEvents[2],
    createdAt: new Date('2024-06-28'),
    updatedAt: new Date('2024-06-28'),
  },
  {
    id: '85',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '8',
    eventId: '3',
    user: mockUsers[7], // Lisa Park
    event: mockEvents[2],
    createdAt: new Date('2024-06-29'),
    updatedAt: new Date('2024-06-29'),
  },
  {
    id: '86',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '13',
    eventId: '3',
    user: mockUsers[12], // Tyler Anderson
    event: mockEvents[2],
    createdAt: new Date('2024-06-30'),
    updatedAt: new Date('2024-06-30'),
  },
  {
    id: '87',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '14',
    eventId: '3',
    user: mockUsers[13], // Rachel Green
    event: mockEvents[2],
    createdAt: new Date('2024-07-01'),
    updatedAt: new Date('2024-07-01'),
  },
  {
    id: '88',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '19',
    eventId: '3',
    user: mockUsers[18], // Christopher Davis
    event: mockEvents[2],
    createdAt: new Date('2024-07-02'),
    updatedAt: new Date('2024-07-02'),
  },
  {
    id: '89',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '23',
    eventId: '3',
    user: mockUsers[22], // Daniel Garcia
    event: mockEvents[2],
    createdAt: new Date('2024-07-03'),
    updatedAt: new Date('2024-07-03'),
  },

  // Additional attendees for Tech Networking Mixer (Event 4)
  {
    id: '90',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '17',
    eventId: '4',
    user: mockUsers[16], // Robert Torres
    event: mockEvents[3],
    createdAt: new Date('2024-07-03'),
    updatedAt: new Date('2024-07-03'),
  },
  {
    id: '91',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '14',
    eventId: '4',
    user: mockUsers[13], // Rachel Green
    event: mockEvents[3],
    createdAt: new Date('2024-07-04'),
    updatedAt: new Date('2024-07-04'),
  },
  {
    id: '92',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '18',
    eventId: '4',
    user: mockUsers[17], // Samantha Lee
    event: mockEvents[3],
    createdAt: new Date('2024-07-05'),
    updatedAt: new Date('2024-07-05'),
  },
  {
    id: '93',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 3,
    userId: '24',
    eventId: '4',
    user: mockUsers[23], // Lauren White
    event: mockEvents[3],
    createdAt: new Date('2024-07-06'),
    updatedAt: new Date('2024-07-06'),
  },
  {
    id: '94',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '13',
    eventId: '4',
    user: mockUsers[12], // Tyler Anderson
    event: mockEvents[3],
    createdAt: new Date('2024-07-07'),
    updatedAt: new Date('2024-07-07'),
  },

  // Additional attendees for Rooftop Sunset Yoga (Event 5)
  {
    id: '95',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '16',
    eventId: '5',
    user: mockUsers[15], // Amanda Foster
    event: mockEvents[4],
    createdAt: new Date('2024-06-21'),
    updatedAt: new Date('2024-06-21'),
  },
  {
    id: '96',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '19',
    eventId: '5',
    user: mockUsers[18], // Christopher Davis
    event: mockEvents[4],
    createdAt: new Date('2024-06-22'),
    updatedAt: new Date('2024-06-22'),
  },
  {
    id: '97',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '20',
    eventId: '5',
    user: mockUsers[19], // Nicole Martinez
    event: mockEvents[4],
    createdAt: new Date('2024-06-23'),
    updatedAt: new Date('2024-06-23'),
  },

  // Additional attendees for Jazz Night at Blue Note (Event 6)
  {
    id: '98',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '15',
    eventId: '6',
    user: mockUsers[14], // James Wilson
    event: mockEvents[5],
    createdAt: new Date('2024-06-28'),
    updatedAt: new Date('2024-06-28'),
  },
  {
    id: '99',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '21',
    eventId: '6',
    user: mockUsers[20], // Kevin Brown
    event: mockEvents[5],
    createdAt: new Date('2024-06-29'),
    updatedAt: new Date('2024-06-29'),
  },
  {
    id: '100',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '22',
    eventId: '6',
    user: mockUsers[21], // Michelle Taylor
    event: mockEvents[5],
    createdAt: new Date('2024-06-30'),
    updatedAt: new Date('2024-06-30'),
  },
  {
    id: '101',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '24',
    eventId: '6',
    user: mockUsers[23], // Lauren White
    event: mockEvents[5],
    createdAt: new Date('2024-07-01'),
    updatedAt: new Date('2024-07-01'),
  },

  // Additional attendees for Food Truck Festival (Event 7)
  {
    id: '102',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '4',
    eventId: '7',
    user: mockUsers[3], // Emily Rodriguez
    event: mockEvents[6],
    createdAt: new Date('2024-06-18'),
    updatedAt: new Date('2024-06-18'),
  },
  {
    id: '103',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '11',
    eventId: '7',
    user: mockUsers[10], // Jordan Brooks
    event: mockEvents[6],
    createdAt: new Date('2024-06-19'),
    updatedAt: new Date('2024-06-19'),
  },
  {
    id: '104',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '13',
    eventId: '7',
    user: mockUsers[12], // Tyler Anderson
    event: mockEvents[6],
    createdAt: new Date('2024-06-20'),
    updatedAt: new Date('2024-06-20'),
  },
  {
    id: '105',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 3,
    userId: '15',
    eventId: '7',
    user: mockUsers[14], // James Wilson
    event: mockEvents[6],
    createdAt: new Date('2024-06-21'),
    updatedAt: new Date('2024-06-21'),
  },
  {
    id: '106',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '17',
    eventId: '7',
    user: mockUsers[16], // Robert Torres
    event: mockEvents[6],
    createdAt: new Date('2024-06-22'),
    updatedAt: new Date('2024-06-22'),
  },
  {
    id: '107',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '18',
    eventId: '7',
    user: mockUsers[17], // Samantha Lee
    event: mockEvents[6],
    createdAt: new Date('2024-06-23'),
    updatedAt: new Date('2024-06-23'),
  },
  {
    id: '108',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '20',
    eventId: '7',
    user: mockUsers[19], // Nicole Martinez
    event: mockEvents[6],
    createdAt: new Date('2024-06-24'),
    updatedAt: new Date('2024-06-24'),
  },
  {
    id: '109',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '22',
    eventId: '7',
    user: mockUsers[21], // Michelle Taylor
    event: mockEvents[6],
    createdAt: new Date('2024-06-25'),
    updatedAt: new Date('2024-06-25'),
  },

  // Additional attendees for Beach Volleyball Tournament (Event 8)
  {
    id: '110',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '1',
    eventId: '8',
    user: mockUsers[0], // Andre Lorico
    event: mockEvents[7],
    createdAt: new Date('2024-06-18'),
    updatedAt: new Date('2024-06-18'),
  },
  {
    id: '111',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '3',
    eventId: '8',
    user: mockUsers[2], // Michael Chen
    event: mockEvents[7],
    createdAt: new Date('2024-06-19'),
    updatedAt: new Date('2024-06-19'),
  },
  {
    id: '112',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '12',
    eventId: '8',
    user: mockUsers[11], // Maya Singh
    event: mockEvents[7],
    createdAt: new Date('2024-06-20'),
    updatedAt: new Date('2024-06-20'),
  },
  {
    id: '113',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '13',
    eventId: '8',
    user: mockUsers[12], // Tyler Anderson
    event: mockEvents[7],
    createdAt: new Date('2024-06-21'),
    updatedAt: new Date('2024-06-21'),
  },
  {
    id: '114',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 2,
    userId: '14',
    eventId: '8',
    user: mockUsers[13], // Rachel Green
    event: mockEvents[7],
    createdAt: new Date('2024-06-22'),
    updatedAt: new Date('2024-06-22'),
  },
  {
    id: '115',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '19',
    eventId: '8',
    user: mockUsers[18], // Christopher Davis
    event: mockEvents[7],
    createdAt: new Date('2024-06-23'),
    updatedAt: new Date('2024-06-23'),
  },
  {
    id: '116',
    rsvp: RSVP.YES,
    checkedIn: false,
    inviteOpenCount: 3,
    userId: '23',
    eventId: '8',
    user: mockUsers[22], // Daniel Garcia
    event: mockEvents[7],
    createdAt: new Date('2024-06-24'),
    updatedAt: new Date('2024-06-24'),
  },
  {
    id: '117',
    rsvp: RSVP.MAYBE,
    checkedIn: false,
    inviteOpenCount: 1,
    userId: '16',
    eventId: '8',
    user: mockUsers[15], // Amanda Foster
    event: mockEvents[7],
    createdAt: new Date('2024-06-25'),
    updatedAt: new Date('2024-06-25'),
  },
];

// Mock Event Photos
export const mockEventPhotos: EventPhoto[] = [
  {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=300&fit=crop',
    caption: 'Great time at the party!',
    uploadedAt: new Date('2024-06-15'),
    eventId: '1',
    userId: '2',
    user: mockUsers[1],
    event: mockEvents[0],
    likeCount: 12,
  },
  {
    id: '2',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400&h=300&fit=crop',
    caption: 'Birthday cake was amazing!',
    uploadedAt: new Date('2024-06-15'),
    eventId: '1',
    userId: '1',
    user: mockUsers[0],
    event: mockEvents[0],
    likeCount: 18,
  },
];

// Mock Comments
export const mockComments: Comment[] = [
  {
    id: '1',
    text: "Can't wait to be there! 🎉",
    attachments: [],
    mentions: [],
    createdAt: new Date('2024-08-10'),
    updatedAt: new Date('2024-08-10'),
    userId: '2',
    eventId: '2',
    user: mockUsers[1],
    event: mockEvents[1],
  },
  {
    id: '2',
    text: 'Should I bring anything? Looking forward to meeting everyone!',
    attachments: [],
    mentions: [],
    createdAt: new Date('2024-08-12'),
    updatedAt: new Date('2024-08-12'),
    userId: '4',
    eventId: '2',
    user: mockUsers[3],
    event: mockEvents[1],
  },
];

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: '1',
    message: 'Sarah Johnson is going to your Housewarming Party',
    sourceType: NotificationSourceType.ATTENDEE,
    isRead: false,
    priority: 1,
    targetUserId: '1',
    targetUser: mockUsers[0],
    createdAt: new Date('2024-08-15'),
  },
  {
    id: '2',
    message: 'Emily Rodriguez commented on your event',
    sourceType: NotificationSourceType.COMMENT,
    isRead: false,
    priority: 1,
    targetUserId: '1',
    targetUser: mockUsers[0],
    createdAt: new Date('2024-08-12'),
  },
  {
    id: '3',
    message: 'Your event "Housewarming Party" is tomorrow!',
    sourceType: NotificationSourceType.EVENT_REMINDER,
    isRead: true,
    readAt: new Date('2024-08-20'),
    priority: 2,
    targetUserId: '1',
    targetUser: mockUsers[0],
    createdAt: new Date('2024-09-01'),
  },
];

// Current user (for demo purposes)
export const currentUser = mockUsers[0];

// Helper functions to simulate API calls
export const mockApiDelay = (ms: number = 500) => 
  new Promise(resolve => setTimeout(resolve, ms));

export const getMockEvents = async (): Promise<Event[]> => {
  await mockApiDelay();
  return mockEvents;
};

export const getMockEvent = async (id: string): Promise<Event | null> => {
  await mockApiDelay();
  return mockEvents.find(event => event.id === id) || null;
};

export const getMockAttendees = async (eventId: string): Promise<Attendee[]> => {
  await mockApiDelay();
  return mockAttendees.filter(attendee => attendee.eventId === eventId);
};

export const getMockEventPhotos = async (eventId: string): Promise<EventPhoto[]> => {
  await mockApiDelay();
  return mockEventPhotos.filter(photo => photo.eventId === eventId);
};

export const getMockComments = async (eventId: string): Promise<Comment[]> => {
  await mockApiDelay();
  return mockComments.filter(comment => comment.eventId === eventId);
};

export const getMockNotifications = async (userId: string): Promise<Notification[]> => {
  await mockApiDelay();
  return mockNotifications.filter(notification => notification.targetUserId === userId);
};

// Function to create a new event
export const createMockEvent = async (eventData: {
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  coordinates?: { latitude: number; longitude: number } | null;
  category: string;
  privacy: 'PUBLIC' | 'PRIVATE';
  color?: string;
  image?: string | null;
  maxGuests?: number;
  invitedFriends?: string[];
}): Promise<Event> => {
  await mockApiDelay();
  
  // Generate a new ID based on existing events
  const newId = (mockEvents.length + 1).toString();
  
  // Parse the date string to create a proper Date object
  const eventDate = new Date(eventData.date + ' ' + eventData.time);
  
  // Create the new event
  const newEvent: Event = {
    id: newId,
    name: eventData.name,
    date: eventDate,
    time: eventData.time,
    location: eventData.location,
    lat: eventData.coordinates?.latitude || 40.7128,
    lng: eventData.coordinates?.longitude || -74.0060,
    description: eventData.description,
    duration: 180, // Default 3 hours
    capacity: eventData.maxGuests || 50,
    headerType: eventData.image ? 'image' : 'color',
    headerImageUrl: eventData.image || undefined,
    headerColor: eventData.color || '#667eea',
    category: eventData.category,
    tags: [eventData.category],
    privacyLevel: eventData.privacy === 'PUBLIC' ? 'PUBLIC' : 'FRIENDS_ONLY',
    isArchived: false,
    viewCount: 0,
    shareCount: 0,
    hostId: currentUser.id,
    host: currentUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  // Add the new event to the beginning of the array (most recent first)
  mockEvents.unshift(newEvent);
  
  // If there are invited friends, create attendee records for them
  if (eventData.invitedFriends && eventData.invitedFriends.length > 0) {
    eventData.invitedFriends.forEach((friendId, index) => {
      const friend = mockUsers.find(user => user.id === friendId);
      if (friend) {
        const attendeeId = (mockAttendees.length + index + 1).toString();
        const newAttendee: Attendee = {
          id: attendeeId,
          rsvp: RSVP.MAYBE, // Default to maybe for invited friends
          checkedIn: false,
          inviteOpenCount: 0,
          userId: friendId,
          eventId: newId,
          user: friend,
          event: newEvent,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockAttendees.push(newAttendee);
      }
    });
  }
  
  return newEvent;
}; 
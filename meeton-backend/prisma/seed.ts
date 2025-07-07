import { PrismaClient, RSVP, PrivacyLevel, ProfileVisibility, NotificationSourceType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data
  console.log('🧹 Cleaning existing data...');
  await prisma.notification.deleteMany();
  await prisma.attendee.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  console.log('👥 Creating users...');
  
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: 'andrelorico',
        name: 'Andre Lorico',
        email: 'andre@meeton.app',
        passwordHash,
        bio: 'Event enthusiast and party host extraordinaire! 🎉',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        location: 'Brooklyn, NY',
        interests: ['Parties', 'Music', 'Food', 'Photography'],
        onboardingCompleted: true,
        profileVisibility: ProfileVisibility.PUBLIC,
      },
    }),
    prisma.user.create({
      data: {
        username: 'sarahcooper',
        name: 'Sarah Cooper',
        email: 'sarah@meeton.app',
        passwordHash,
        bio: 'Coffee enthusiast ☕ | Adventure seeker 🗻 | Always up for new experiences!',
        image: 'https://images.unsplash.com/photo-1494790108755-2616b612b5bd?w=150&h=150&fit=crop&crop=face',
        location: 'San Francisco, CA',
        interests: ['Coffee', 'Hiking', 'Photography', 'Travel'],
        onboardingCompleted: true,
        profileVisibility: ProfileVisibility.PUBLIC,
      },
    }),
    prisma.user.create({
      data: {
        username: 'mikejohnson',
        name: 'Mike Johnson',
        email: 'mike@meeton.app',
        passwordHash,
        bio: 'Tech enthusiast | Startup founder | Networking events lover',
        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        location: 'Austin, TX',
        interests: ['Technology', 'Startups', 'Networking', 'Basketball'],
        onboardingCompleted: true,
        profileVisibility: ProfileVisibility.PUBLIC,
      },
    }),
    prisma.user.create({
      data: {
        username: 'emilydavis',
        name: 'Emily Davis',
        email: 'emily@meeton.app',
        passwordHash,
        bio: 'Yoga instructor 🧘‍♀️ | Wellness advocate | Plant-based foodie 🌱',
        image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        location: 'Los Angeles, CA',
        interests: ['Yoga', 'Wellness', 'Cooking', 'Meditation'],
        onboardingCompleted: true,
        profileVisibility: ProfileVisibility.PUBLIC,
      },
    }),
    prisma.user.create({
      data: {
        username: 'davidchen',
        name: 'David Chen',
        email: 'david@meeton.app',
        passwordHash,
        bio: 'Jazz musician 🎷 | Music producer | Night owl who loves late concerts',
        image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
        location: 'Chicago, IL',
        interests: ['Jazz', 'Music Production', 'Concerts', 'Vinyl Records'],
        onboardingCompleted: true,
        profileVisibility: ProfileVisibility.PUBLIC,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create events
  console.log('🎉 Creating events...');
  
  const futureDate1 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 1 week from now
  const futureDate2 = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 2 weeks from now
  const futureDate3 = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000); // 3 weeks from now

  const events = await Promise.all([
    prisma.event.create({
      data: {
        name: "Andre's 25th Birthday Bash 🎂",
        date: futureDate1,
        time: '7:00 PM',
        location: 'Rooftop Bar Brooklyn',
        lat: 40.6892,
        lng: -74.0445,
        image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=300&fit=crop',
        description: 'Join me for an epic birthday celebration with amazing views, great music, and even better company! 🎉',
        duration: 240,
        capacity: 50,
        headerType: 'image',
        headerImageUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&h=300&fit=crop',
        category: 'Birthday',
        tags: ['Birthday', 'Party', 'Rooftop', 'Music'],
        privacyLevel: PrivacyLevel.PUBLIC,
        hostId: users[0].id,
        weather: {
          temperature: 72,
          condition: 'Clear',
          icon: 'sunny'
        }
      },
    }),
    prisma.event.create({
      data: {
        name: 'Coffee & Code Meetup ☕',
        date: futureDate1,
        time: '10:00 AM',
        location: 'Blue Bottle Coffee, Hayes Valley',
        lat: 37.7749,
        lng: -122.4194,
        image: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=400&h=300&fit=crop',
        description: 'Weekly meetup for developers and coffee lovers. Bring your laptop and favorite project!',
        duration: 180,
        capacity: 20,
        headerType: 'color',
        headerColor: '#8B4513',
        category: 'Professional',
        tags: ['Coffee', 'Programming', 'Networking', 'Tech'],
        privacyLevel: PrivacyLevel.PUBLIC,
        hostId: users[1].id,
        weather: {
          temperature: 65,
          condition: 'Partly Cloudy',
          icon: 'partly_cloudy'
        }
      },
    }),
    prisma.event.create({
      data: {
        name: 'Tech Startup Pitch Night 🚀',
        date: futureDate2,
        time: '6:30 PM',
        location: 'Capital Factory, Austin',
        lat: 30.2672,
        lng: -97.7431,
        image: 'https://images.unsplash.com/photo-1559223607-d9176c6d8a14?w=400&h=300&fit=crop',
        description: 'Join local entrepreneurs and investors for an evening of startup pitches and networking.',
        duration: 150,
        capacity: 100,
        headerType: 'image',
        headerImageUrl: 'https://images.unsplash.com/photo-1559223607-d9176c6d8a14?w=400&h=300&fit=crop',
        category: 'Business',
        tags: ['Startups', 'Pitching', 'Networking', 'Investment'],
        privacyLevel: PrivacyLevel.PUBLIC,
        hostId: users[2].id,
        weather: {
          temperature: 78,
          condition: 'Clear',
          icon: 'sunny'
        }
      },
    }),
    prisma.event.create({
      data: {
        name: 'Sunset Yoga in the Park 🧘‍♀️',
        date: futureDate2,
        time: '6:00 PM',
        location: 'Griffith Park, Los Angeles',
        lat: 34.1365,
        lng: -118.2940,
        image: 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&h=300&fit=crop',
        description: 'Unwind with a peaceful yoga session as we watch the sunset over the city.',
        duration: 90,
        capacity: 30,
        headerType: 'color',
        headerColor: '#FF6B6B',
        category: 'Wellness',
        tags: ['Yoga', 'Sunset', 'Meditation', 'Outdoor'],
        privacyLevel: PrivacyLevel.PUBLIC,
        hostId: users[3].id,
        weather: {
          temperature: 75,
          condition: 'Clear',
          icon: 'sunny'
        }
      },
    }),
    prisma.event.create({
      data: {
        name: 'Jazz Night at Blue Note 🎷',
        date: futureDate3,
        time: '8:00 PM',
        location: 'Blue Chicago, River North',
        lat: 41.8919,
        lng: -87.6278,
        image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
        description: 'An intimate evening of smooth jazz featuring local musicians and great atmosphere.',
        duration: 180,
        capacity: 60,
        headerType: 'image',
        headerImageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
        category: 'Music',
        tags: ['Jazz', 'Live Music', 'Evening', 'Intimate'],
        privacyLevel: PrivacyLevel.PUBLIC,
        hostId: users[4].id,
        weather: {
          temperature: 68,
          condition: 'Clear',
          icon: 'clear_night'
        }
      },
    }),
  ]);

  console.log(`✅ Created ${events.length} events`);

  // Create attendees (RSVPs)
  console.log('👫 Creating attendees...');
  
  const attendees = [];
  
  // Andre's Birthday - all users attending
  for (let i = 1; i < users.length; i++) {
    attendees.push(
      prisma.attendee.create({
        data: {
          userId: users[i].id,
          eventId: events[0].id,
          rsvp: i === 1 ? RSVP.YES : i === 2 ? RSVP.MAYBE : RSVP.YES,
          responseTime: new Date(),
          inviteMethod: 'in_app',
        }
      })
    );
  }

  // Coffee & Code - some users attending
  attendees.push(
    prisma.attendee.create({
      data: {
        userId: users[0].id,
        eventId: events[1].id,
        rsvp: RSVP.YES,
        responseTime: new Date(),
        inviteMethod: 'in_app',
      }
    }),
    prisma.attendee.create({
      data: {
        userId: users[2].id,
        eventId: events[1].id,
        rsvp: RSVP.MAYBE,
        responseTime: new Date(),
        inviteMethod: 'in_app',
      }
    })
  );

  // Startup Pitch Night
  attendees.push(
    prisma.attendee.create({
      data: {
        userId: users[0].id,
        eventId: events[2].id,
        rsvp: RSVP.YES,
        responseTime: new Date(),
        inviteMethod: 'in_app',
      }
    }),
    prisma.attendee.create({
      data: {
        userId: users[1].id,
        eventId: events[2].id,
        rsvp: RSVP.YES,
        responseTime: new Date(),
        inviteMethod: 'in_app',
      }
    })
  );

  // Yoga in the Park
  attendees.push(
    prisma.attendee.create({
      data: {
        userId: users[1].id,
        eventId: events[3].id,
        rsvp: RSVP.YES,
        responseTime: new Date(),
        inviteMethod: 'in_app',
      }
    }),
    prisma.attendee.create({
      data: {
        userId: users[4].id,
        eventId: events[3].id,
        rsvp: RSVP.YES,
        responseTime: new Date(),
        inviteMethod: 'in_app',
      }
    })
  );

  // Jazz Night
  attendees.push(
    prisma.attendee.create({
      data: {
        userId: users[0].id,
        eventId: events[4].id,
        rsvp: RSVP.MAYBE,
        responseTime: new Date(),
        inviteMethod: 'in_app',
      }
    }),
    prisma.attendee.create({
      data: {
        userId: users[2].id,
        eventId: events[4].id,
        rsvp: RSVP.YES,
        responseTime: new Date(),
        inviteMethod: 'in_app',
      }
    })
  );

  await Promise.all(attendees);

  console.log(`✅ Created ${attendees.length} attendee records`);

  // Skip sample notifications for production
  console.log('🔔 Skipping sample notifications (production mode)');

  // Create system settings
  console.log('⚙️ Creating system settings...');
  
  const systemSettings = [
    {
      key: 'app_version',
      value: '1.0.0',
      description: 'Current application version'
    },
    {
      key: 'maintenance_mode',
      value: 'false',
      description: 'Enable/disable maintenance mode'
    },
    {
      key: 'max_events_per_user',
      value: '50',
      description: 'Maximum events a user can create'
    },
    {
      key: 'max_attendees_per_event',
      value: '500',
      description: 'Maximum attendees per event'
    }
  ];

  for (const setting of systemSettings) {
    await prisma.systemSettings.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: setting,
    });
  }

  console.log('✅ Created system settings');

  console.log('\n🎉 Database seeding completed successfully!');
  console.log(`
📊 Summary:
- Users: ${users.length}
- Events: ${events.length}
- Attendees: ${attendees.length}
- Notifications: 0 (production mode)
- System Settings: 4
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 
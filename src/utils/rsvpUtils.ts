import { RSVP } from '../types';

/**
 * Utility functions for RSVP management
 */

export const getRSVPDisplayText = (rsvp: RSVP): string => {
  switch (rsvp) {
    case RSVP.YES:
      return 'Going';
    case RSVP.MAYBE:
      return 'Maybe';
    case RSVP.NO:
      return 'Not Going';
    case RSVP.PENDING:
      return 'Pending';
    default:
      return 'Not Responded';
  }
};

export const getRSVPColor = (rsvp: RSVP): string => {
  switch (rsvp) {
    case RSVP.YES:
      return '#34C759'; // Green
    case RSVP.MAYBE:
      return '#FF9500'; // Orange
    case RSVP.NO:
      return '#FF3B30'; // Red
    case RSVP.PENDING:
      return '#8E8E93'; // Gray
    default:
      return '#8E8E93'; // Gray
  }
};

export const getRSVPIcon = (rsvp: RSVP): string => {
  switch (rsvp) {
    case RSVP.YES:
      return 'checkmark-circle';
    case RSVP.MAYBE:
      return 'help-circle';
    case RSVP.NO:
      return 'close-circle';
    case RSVP.PENDING:
      return 'time';
    default:
      return 'ellipse';
  }
};

export const getRSVPStats = (attendees: Array<{ rsvp: RSVP }>) => {
  const stats = {
    going: 0,
    maybe: 0,
    notGoing: 0,
    pending: 0,
    total: attendees.length,
  };

  attendees.forEach(attendee => {
    switch (attendee.rsvp) {
      case RSVP.YES:
        stats.going++;
        break;
      case RSVP.MAYBE:
        stats.maybe++;
        break;
      case RSVP.NO:
        stats.notGoing++;
        break;
      case RSVP.PENDING:
        stats.pending++;
        break;
    }
  });

  return stats;
};

export const getConfirmedAttendees = (attendees: Array<{ rsvp: RSVP; user: any }>) => {
  return attendees.filter(attendee => 
    attendee.rsvp === RSVP.YES || attendee.rsvp === RSVP.MAYBE
  );
};

export const isUserAttending = (attendees: Array<{ rsvp: RSVP; user: { id: string } }>, userId: string): boolean => {
  const userAttendee = attendees.find(attendee => attendee.user.id === userId);
  return userAttendee?.rsvp === RSVP.YES;
};

export const canUserUploadPhotos = (attendees: Array<{ rsvp: RSVP; user: { id: string } }>, userId: string): boolean => {
  const userAttendee = attendees.find(attendee => attendee.user.id === userId);
  return userAttendee?.rsvp === RSVP.YES || userAttendee?.rsvp === RSVP.MAYBE;
};

export const getUserRSVPStatus = (attendees: Array<{ rsvp: RSVP; user: { id: string } }>, userId: string): RSVP => {
  const userAttendee = attendees.find(attendee => attendee.user.id === userId);
  return userAttendee?.rsvp || RSVP.NO;
}; 
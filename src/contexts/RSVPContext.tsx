import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { RSVP } from '../types';
import APIService from '../services/api';
import { useAuth } from './AuthContext';

interface RSVPState {
  [eventId: string]: RSVP;
}

interface RSVPContextType {
  userRSVP: (eventId: string) => RSVP;
  updateRSVP: (eventId: string, rsvp: RSVP) => Promise<boolean>;
  setEventRSVP: (eventId: string, rsvp: RSVP) => void;
  clearEventRSVP: (eventId: string) => void;
  clearAllRSVPs: () => void;
}

const RSVPContext = createContext<RSVPContextType | undefined>(undefined);

export const useRSVP = () => {
  const context = useContext(RSVPContext);
  if (!context) {
    throw new Error('useRSVP must be used within an RSVPProvider');
  }
  return context;
};

interface RSVPProviderProps {
  children: React.ReactNode;
}

export const RSVPProvider: React.FC<RSVPProviderProps> = ({ children }) => {
  const [rsvpState, setRSVPState] = useState<RSVPState>({});
  const { user } = useAuth();

  // Debug log state changes
  useEffect(() => {
    console.log('🎯 [RSVP CONTEXT] State changed:', rsvpState);
  }, [rsvpState]);

  // Update RSVP state for a specific event
  const setEventRSVP = useCallback((eventId: string, rsvp: RSVP) => {
    console.log('🎯 [RSVP CONTEXT] setEventRSVP called for event:', eventId, 'with RSVP:', rsvp);
    setRSVPState(prev => {
      const previousRSVP = prev[eventId];
      console.log('🎯 [RSVP CONTEXT] Previous RSVP:', previousRSVP, 'New RSVP:', rsvp);
      
      const newState = {
        ...prev,
        [eventId]: rsvp
      };
      
      console.log('🎯 [RSVP CONTEXT] State updated for event:', eventId);
      return newState;
    });
  }, []);

  // Get user's RSVP for a specific event
  const userRSVP = useCallback((eventId: string): RSVP => {
    const rsvp = rsvpState[eventId] || RSVP.NO;
    console.log('🔍 [RSVP CONTEXT] userRSVP called for event:', eventId, 'returning:', rsvp);
    return rsvp;
  }, [rsvpState]);

  // Update RSVP via API and local state
  const updateRSVP = useCallback(async (eventId: string, rsvp: RSVP): Promise<boolean> => {
    try {
      const success = await APIService.rsvpToEvent(eventId, rsvp);
      if (success) {
        setEventRSVP(eventId, rsvp);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update RSVP:', error);
      return false;
    }
  }, [setEventRSVP]);

  // Clear RSVP for a specific event
  const clearEventRSVP = useCallback((eventId: string) => {
    setRSVPState(prev => {
      const newState = { ...prev };
      delete newState[eventId];
      return newState;
    });
  }, []);

  // Clear all RSVP state
  const clearAllRSVPs = useCallback(() => {
    setRSVPState({});
  }, []);

  // Clear RSVP state when user changes
  useEffect(() => {
    if (!user) {
      clearAllRSVPs();
    }
  }, [user, clearAllRSVPs]);

  const value: RSVPContextType = {
    userRSVP,
    updateRSVP,
    setEventRSVP,
    clearEventRSVP,
    clearAllRSVPs,
  };

  return (
    <RSVPContext.Provider value={value}>
      {children}
    </RSVPContext.Provider>
  );
}; 
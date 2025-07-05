import { PrismaClient } from '@prisma/client';
import DatabaseManager from '../config/database';
import axios from 'axios';

/**
 * Location Service
 * Handles geocoding, reverse geocoding, and location-based features
 */

interface LocationCoordinates {
  lat: number;
  lng: number;
}

interface LocationDetails {
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  formatted: string;
  coordinates: LocationCoordinates;
  placeId?: string;
  types?: string[];
}

interface NearbyEventsOptions {
  lat: number;
  lng: number;
  radius: number; // in kilometers
  limit?: number;
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

interface PopularLocation {
  name: string;
  address: string;
  coordinates: LocationCoordinates;
  eventCount: number;
  category: string;
}

export class LocationService {
  private prisma: PrismaClient;
  private googleApiKey: string;
  private baseUrl: string;

  constructor() {
    this.prisma = DatabaseManager.getInstance();
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
  }

  /**
   * Geocode an address to coordinates
   */
  async geocodeAddress(address: string): Promise<LocationDetails | null> {
    try {
      if (!this.googleApiKey) {
        console.warn('Google Maps API key not configured, using mock geocoding');
        return this.getMockLocationDetails(address);
      }

      const url = `${this.baseUrl}/geocode/json?address=${encodeURIComponent(address)}&key=${this.googleApiKey}`;
      const response = await axios.get(url);
      const data: any = response.data;

      if (data && data.results && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry?.location;
        return this.parseGeocodingResult(result);
      }
      console.warn('Geocoding failed:', data?.status);
      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return this.getMockLocationDetails(address);
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<LocationDetails | null> {
    try {
      if (!this.googleApiKey) {
        console.warn('Google Maps API key not configured, using mock reverse geocoding');
        return this.getMockLocationDetails(`${lat}, ${lng}`);
      }

      const url = `${this.baseUrl}/geocode/json?latlng=${lat},${lng}&key=${this.googleApiKey}`;
      const response = await axios.get(url);
      const data: any = response.data;

      if (data && data.results && data.results.length > 0) {
        const result = data.results[0];
        return this.parseGeocodingResult(result);
      }
      console.warn('Reverse geocoding failed:', data?.status);
      return null;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return this.getMockLocationDetails(`${lat}, ${lng}`);
    }
  }

  /**
   * Get location suggestions/autocomplete
   */
  async getLocationSuggestions(query: string, limit: number = 5): Promise<LocationDetails[]> {
    try {
      if (!this.googleApiKey) {
        console.warn('Google Maps API key not configured, using mock suggestions');
        return this.getMockLocationSuggestions(query, limit);
      }

      const url = `${this.baseUrl}/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${this.googleApiKey}&types=establishment|geocode`;
      const response = await axios.get(url);
      const data: any = response.data;

      if (data && data.predictions && data.predictions.length > 0) {
        const suggestions: LocationDetails[] = [];
        
        for (const prediction of data.predictions.slice(0, limit)) {
          const details = await this.getPlaceDetails(prediction.place_id);
          if (details) {
            suggestions.push(details);
          }
        }

        return suggestions;
      }
      console.warn('Places autocomplete failed:', data?.status);
      return [];
    } catch (error) {
      console.error('Error getting location suggestions:', error);
      return this.getMockLocationSuggestions(query, limit);
    }
  }

  /**
   * Get place details by place ID
   */
  async getPlaceDetails(placeId: string): Promise<LocationDetails | null> {
    try {
      if (!this.googleApiKey) {
        return null;
      }

      const url = `${this.baseUrl}/place/details/json?place_id=${placeId}&key=${this.googleApiKey}&fields=formatted_address,geometry,address_components,types`;
      const response = await axios.get(url);
      const data: any = response.data;

      if (data && data.result) {
        return this.parseGeocodingResult(data.result);
      }
      console.warn('Place details failed:', data?.status);
      return null;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  /**
   * Find nearby events
   */
  async findNearbyEvents(options: NearbyEventsOptions): Promise<any[]> {
    try {
      const { lat, lng, radius, limit = 20, category, dateRange } = options;

      // Calculate bounding box for efficient database query
      const earthRadius = 6371; // km
      const latDelta = (radius / earthRadius) * (180 / Math.PI);
      const lngDelta = (radius / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);

      const minLat = lat - latDelta;
      const maxLat = lat + latDelta;
      const minLng = lng - lngDelta;
      const maxLng = lng + lngDelta;

      // Build query conditions
      const whereConditions: any = {
        lat: { gte: minLat, lte: maxLat },
        lng: { gte: minLng, lte: maxLng },
        isArchived: false,
        privacyLevel: 'PUBLIC', // Only show public events
      };

      if (category) {
        whereConditions.category = category;
      }

      if (dateRange) {
        whereConditions.date = {
          gte: dateRange.start,
          lte: dateRange.end,
        };
      } else {
        // Default to future events only
        whereConditions.date = { gte: new Date() };
      }

      const events = await this.prisma.event.findMany({
        where: whereConditions,
        include: {
          host: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            }
          },
          _count: {
            select: {
              attendees: true,
            }
          }
        },
        take: limit * 2, // Get more results to filter by distance
        orderBy: [
          { date: 'asc' },
          { viewCount: 'desc' }
        ]
      });

      // Calculate actual distances and filter
      const nearbyEvents = events
        .map(event => {
          if (!event.lat || !event.lng) return null;
          
          const distance = this.calculateDistance(lat, lng, event.lat, event.lng);
          
          if (distance <= radius) {
            return {
              ...event,
              distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
            };
          }
          
          return null;
        })
        .filter(event => event !== null)
        .sort((a, b) => a!.distance - b!.distance) // Sort by distance
        .slice(0, limit);

      return nearbyEvents;
    } catch (error) {
      console.error('Error finding nearby events:', error);
      return [];
    }
  }

  /**
   * Get popular locations for events
   */
  async getPopularLocations(limit: number = 10): Promise<PopularLocation[]> {
    try {
      // Aggregate events by location to find popular venues
      const locationCounts = await this.prisma.event.groupBy({
        by: ['location', 'lat', 'lng'],
        where: {
          isArchived: false,
          lat: { not: null },
          lng: { not: null },
          date: { gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }, // Last year
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          }
        },
        take: limit,
      });

      return locationCounts.map(location => ({
        name: this.extractLocationName(location.location),
        address: location.location,
        coordinates: {
          lat: location.lat!,
          lng: location.lng!,
        },
        eventCount: location._count.id,
        category: 'venue', // Could be enhanced to detect category
      }));
    } catch (error) {
      console.error('Error getting popular locations:', error);
      return [];
    }
  }

  /**
   * Get events by city
   */
  async getEventsByCity(city: string, limit: number = 20): Promise<any[]> {
    try {
      const events = await this.prisma.event.findMany({
        where: {
          location: {
            contains: city,
            mode: 'insensitive',
          },
          isArchived: false,
          privacyLevel: 'PUBLIC',
          date: { gte: new Date() },
        },
        include: {
          host: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            }
          },
          _count: {
            select: {
              attendees: true,
            }
          }
        },
        orderBy: [
          { date: 'asc' },
          { viewCount: 'desc' }
        ],
        take: limit,
      });

      return events;
    } catch (error) {
      console.error('Error getting events by city:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Parse geocoding API result
   */
  private parseGeocodingResult(result: any): LocationDetails {
    const components = result.address_components || [];
    
    let city = '';
    let state = '';
    let country = '';
    let postalCode = '';

    for (const component of components) {
      const types = component.types;
      
      if (types.includes('locality')) {
        city = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        state = component.long_name;
      } else if (types.includes('country')) {
        country = component.long_name;
      } else if (types.includes('postal_code')) {
        postalCode = component.long_name;
      }
    }

    return {
      address: result.formatted_address,
      city,
      state,
      country,
      postalCode: postalCode || undefined,
      formatted: result.formatted_address,
      coordinates: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      },
      placeId: result.place_id,
      types: result.types,
    };
  }

  /**
   * Extract location name from full address
   */
  private extractLocationName(fullAddress: string): string {
    // Simple extraction - take first part before comma
    const parts = fullAddress.split(',');
    return parts[0].trim();
  }

  /**
   * Generate mock location details when API is not available
   */
  private getMockLocationDetails(query: string): LocationDetails {
    // Generate somewhat realistic mock data
    const cities = [
      { name: 'New York', state: 'NY', country: 'USA', lat: 40.7128, lng: -74.0060 },
      { name: 'San Francisco', state: 'CA', country: 'USA', lat: 37.7749, lng: -122.4194 },
      { name: 'Los Angeles', state: 'CA', country: 'USA', lat: 34.0522, lng: -118.2437 },
      { name: 'Chicago', state: 'IL', country: 'USA', lat: 41.8781, lng: -87.6298 },
      { name: 'Austin', state: 'TX', country: 'USA', lat: 30.2672, lng: -97.7431 },
    ];

    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    
    // Add some variation to coordinates
    const latVariation = (Math.random() - 0.5) * 0.1;
    const lngVariation = (Math.random() - 0.5) * 0.1;

    return {
      address: query,
      city: randomCity.name,
      state: randomCity.state,
      country: randomCity.country,
      formatted: `${query}, ${randomCity.name}, ${randomCity.state}, ${randomCity.country}`,
      coordinates: {
        lat: randomCity.lat + latVariation,
        lng: randomCity.lng + lngVariation,
      },
      types: ['establishment'],
    };
  }

  /**
   * Generate mock location suggestions
   */
  private getMockLocationSuggestions(query: string, limit: number): LocationDetails[] {
    const suggestions: LocationDetails[] = [];
    
    const venues = [
      'Community Center',
      'Public Library',
      'City Park',
      'Coffee Shop',
      'Restaurant',
      'Event Hall',
      'Conference Center',
      'Museum',
    ];

    for (let i = 0; i < Math.min(limit, venues.length); i++) {
      const venue = venues[i];
      const mockLocation = this.getMockLocationDetails(`${venue} - ${query}`);
      suggestions.push(mockLocation);
    }

    return suggestions;
  }

  /**
   * Update event location details
   */
  async updateEventLocationDetails(eventId: string, location: string): Promise<LocationDetails | null> {
    try {
      const locationDetails = await this.geocodeAddress(location);
      
      if (locationDetails) {
        await this.prisma.event.update({
          where: { id: eventId },
          data: {
            location,
            lat: locationDetails.coordinates.lat,
            lng: locationDetails.coordinates.lng,
            locationDetails: locationDetails as any,
          }
        });

        console.log(`Location details updated for event ${eventId}`);
      }

      return locationDetails;
    } catch (error) {
      console.error(`Error updating location for event ${eventId}:`, error);
      return null;
    }
  }

  /**
   * Get timezone for coordinates
   */
  async getTimezone(lat: number, lng: number): Promise<string | null> {
    try {
      if (!this.googleApiKey) {
        return null;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const url = `${this.baseUrl}/timezone/json?location=${lat},${lng}&timestamp=${timestamp}&key=${this.googleApiKey}`;
      const response = await axios.get(url);
      const data: any = response.data;

      if (data && data.status === 'OK') {
        return data.timeZoneId;
      }
      console.warn('Timezone lookup failed:', data?.status);
      return null;
    } catch (error) {
      console.error('Error getting timezone:', error);
      return null;
    }
  }
}

export const locationService = new LocationService(); 
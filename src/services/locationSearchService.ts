interface LocationSuggestion {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface GooglePlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface GooglePlaceDetails {
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  formatted_address: string;
  name: string;
}

import ENV from '../config/env';

class LocationSearchService {
  private readonly GOOGLE_PLACES_API_KEY = ENV.GOOGLE_PLACES_API_KEY;
  private readonly AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
  private readonly PLACE_DETAILS_URL = 'https://maps.googleapis.com/maps/api/place/details/json';

  /**
   * Search for location suggestions based on user input
   */
  async searchLocations(query: string, limit: number = 5): Promise<LocationSuggestion[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    try {
      // Step 1: Get place predictions from Google Places Autocomplete
      const predictions = await this.getPlacePredictions(query, limit);
      
      if (predictions.length === 0) {
        return [];
      }

      // Step 2: Get detailed information for each place
      const locationSuggestions: LocationSuggestion[] = [];
      
      for (const prediction of predictions) {
        try {
          const placeDetails = await this.getPlaceDetails(prediction.place_id);
          
          if (placeDetails) {
            locationSuggestions.push({
              id: prediction.place_id,
              name: prediction.structured_formatting.main_text,
              address: placeDetails.formatted_address,
              latitude: placeDetails.geometry.location.lat,
              longitude: placeDetails.geometry.location.lng,
            });
          }
        } catch (error) {
          console.error('Error getting place details for:', prediction.place_id, error);
          // Continue with other predictions even if one fails
        }
      }

      return locationSuggestions;
    } catch (error) {
      console.error('Error searching locations:', error);
      throw new Error('Failed to search locations. Please try again.');
    }
  }

  /**
   * Get place predictions from Google Places Autocomplete API
   */
  private async getPlacePredictions(query: string, limit: number): Promise<GooglePlacePrediction[]> {
    const params = new URLSearchParams({
      input: query,
      key: this.GOOGLE_PLACES_API_KEY,
      types: 'establishment|geocode', // Include both businesses and addresses
      language: 'en', // Set language preference
    });

    const response = await fetch(`${this.AUTOCOMPLETE_URL}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Google Places API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status}`);
    }

    return (data.predictions || []).slice(0, limit);
  }

  /**
   * Get detailed place information including coordinates
   */
  private async getPlaceDetails(placeId: string): Promise<GooglePlaceDetails | null> {
    const params = new URLSearchParams({
      place_id: placeId,
      key: this.GOOGLE_PLACES_API_KEY,
      fields: 'geometry,formatted_address,name', // Only request needed fields
    });

    const response = await fetch(`${this.PLACE_DETAILS_URL}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Google Places Details API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.status !== 'OK') {
      throw new Error(`Google Places Details API error: ${data.status}`);
    }

    return data.result || null;
  }

  /**
   * Reverse geocode coordinates to get address information
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<LocationSuggestion | null> {
    try {
      const GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
      
      const params = new URLSearchParams({
        latlng: `${latitude},${longitude}`,
        key: this.GOOGLE_PLACES_API_KEY,
        result_type: 'street_address|premise|point_of_interest',
      });

      const response = await fetch(`${GEOCODING_URL}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        return null;
      }

      const result = data.results[0];
      
      return {
        id: `reverse-${Date.now()}`,
        name: result.name || 'Selected Location',
        address: result.formatted_address,
        latitude,
        longitude,
      };
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return this.GOOGLE_PLACES_API_KEY !== 'YOUR_GOOGLE_PLACES_API_KEY' && 
           this.GOOGLE_PLACES_API_KEY.length > 0 &&
           ENV.ENABLE_REAL_LOCATION_SEARCH;
  }
}

// Export singleton instance
export const locationSearchService = new LocationSearchService();
export type { LocationSuggestion }; 
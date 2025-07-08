import { ENV } from '../config/env';
import { VoiceEventData, VoiceTranscriptionResult } from '../types';

/**
 * Voice Event Service
 * Handles voice recording, transcription, and event data extraction using OpenAI APIs
 */
export class VoiceEventService {
  private static readonly OPENAI_TRANSCRIPTION_URL = 'https://api.openai.com/v1/audio/transcriptions';
  private static readonly OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';

  /**
   * Transcribe audio file using OpenAI Whisper API
   */
  static async transcribeAudio(audioUri: string): Promise<VoiceTranscriptionResult> {
    try {
      if (!ENV.OPENAI_API_KEY || !ENV.OPENAI_API_KEY.startsWith('sk-')) {
        throw new Error('OpenAI API key not configured properly. Please set EXPO_PUBLIC_OPENAI_API_KEY in your environment.');
      }

      console.log('🎤 Starting audio transcription...');

      // Create form data for the audio file
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      } as any);
      formData.append('model', ENV.OPENAI_WHISPER_MODEL);
      formData.append('language', 'en'); // Can be made configurable
      formData.append('response_format', 'json');
      formData.append('temperature', '0.2'); // Lower temperature for more accurate transcription

      const response = await fetch(this.OPENAI_TRANSCRIPTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ENV.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Transcription API Error:', errorText);
        throw new Error(`Transcription failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Transcription received:', result.text);

      return {
        text: result.text,
        language: result.language || 'en',
      };
    } catch (error) {
      console.error('❌ Error in transcribeAudio:', error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse event details from transcribed text using GPT
   */
  static async parseEventFromText(transcription: string): Promise<VoiceEventData> {
    try {
      if (!ENV.OPENAI_API_KEY || !ENV.OPENAI_API_KEY.startsWith('sk-')) {
        throw new Error('OpenAI API key not configured properly');
      }

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      const currentDay = currentDate.getDate();
      const currentTime = currentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const prompt = `You are an intelligent event planning assistant. Extract structured event details from this voice command: "${transcription}"

Current context:
- Today's date: ${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}
- Current time: ${currentTime}

Return ONLY a valid JSON object with these fields (include only fields that are clearly mentioned):
{
  "name": "clear event title",
  "description": "brief description of the event", 
  "date": "YYYY-MM-DD format",
  "time": "HH:MM AM/PM format",
  "location": "event location or venue",
  "type": "birthday|party|networking|sports|food|other",
  "duration": 180
}

Smart date conversion rules:
- "tomorrow" = ${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay + 1).padStart(2, '0')}
- "next Friday", "this weekend" = calculate actual dates
- "in 3 days", "next week" = calculate from today
- If no time specified, suggest reasonable default (7 PM for parties, 2 PM for casual events)

Event type classification:
- birthday, anniversary = "birthday"
- party, celebration, gathering = "party" 
- meeting, conference, networking = "networking"
- sports, game, workout = "sports"
- dinner, lunch, meal = "food"
- everything else = "other"

Example outputs:
Input: "Create a birthday party for Sarah tomorrow at 7 PM at Central Park"
Output: {"name":"Sarah's Birthday Party","date":"2025-01-09","time":"7:00 PM","location":"Central Park","type":"birthday"}

Input: "Schedule a team meeting next Friday at 2 PM in the conference room"
Output: {"name":"Team Meeting","date":"2025-01-10","time":"2:00 PM","location":"Conference Room","type":"networking"}

Voice command to parse: "${transcription}"`;

      console.log('🧠 Parsing event details with GPT...');

      const response = await fetch(this.OPENAI_CHAT_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ENV.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ENV.OPENAI_GPT_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an expert event planning assistant. Return only valid JSON responses without any additional text, markdown, or formatting. Be precise and only include fields that are clearly mentioned in the voice command.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Event parsing API Error:', errorText);
        throw new Error(`Event parsing failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from GPT API');
      }

      console.log('📝 Raw GPT response:', content);

      // Try to parse the JSON response
      let eventData: VoiceEventData;
      try {
        // Clean the response in case GPT added extra formatting
        const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();
        eventData = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error('❌ Failed to parse GPT response as JSON:', content);
        throw new Error('Failed to parse event details from voice command. Please try speaking more clearly.');
      }

      console.log('✅ Parsed event data:', eventData);
      return eventData;

    } catch (error) {
      console.error('❌ Error in parseEventFromText:', error);
      throw new Error(`Failed to parse event details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process voice recording to extract event data
   * Main method that combines transcription and parsing
   */
  static async processVoiceToEvent(audioUri: string): Promise<VoiceEventData> {
    try {
      console.log('🎬 Starting voice-to-event processing...');
      
      // Step 1: Transcribe audio to text
      const transcriptionResult = await this.transcribeAudio(audioUri);
      
      if (!transcriptionResult.text.trim()) {
        throw new Error('No speech detected in the audio recording. Please try again.');
      }

      console.log('📝 Transcribed text:', transcriptionResult.text);

      // Step 2: Parse event details from transcription
      const eventData = await this.parseEventFromText(transcriptionResult.text);
      
      console.log('🎉 Voice processing completed successfully');
      return eventData;

    } catch (error) {
      console.error('❌ Error in processVoiceToEvent:', error);
      throw error; // Re-throw to let the component handle the error
    }
  }

  /**
   * Validate if the OpenAI service is properly configured
   */
  static isConfigured(): boolean {
    return ENV.ENABLE_VOICE_EVENTS && 
           ENV.OPENAI_API_KEY && 
           ENV.OPENAI_API_KEY.startsWith('sk-');
  }

  /**
   * Get example voice commands for user guidance
   */
  static getExampleCommands(): string[] {
    return [
      "Create a birthday party for Sarah tomorrow at 7 PM at Central Park",
      "Schedule a networking event next Friday at 6 PM at the office",
      "Add a sports meetup this Saturday morning at the park",
      "Plan a dinner party next week at my house",
      "Create a team meeting on Monday at 2 PM in the conference room",
      "Organize a game night this Friday at 8 PM at my place"
    ];
  }

  /**
   * Get helpful tips for better voice recognition
   */
  static getVoiceTips(): string[] {
    return [
      "Speak clearly and at a normal pace",
      "Include key details: event name, date/time, location",
      "Use natural language like 'tomorrow', 'next Friday'",
      "Mention the type of event (party, meeting, dinner, etc.)",
      "Keep background noise to a minimum"
    ];
  }

  /**
   * Enhance a basic event description with AI
   */
  static async enhanceEventDescription(basicDescription: string, eventType: string, eventName: string): Promise<string> {
    try {
      if (!ENV.OPENAI_API_KEY || !ENV.OPENAI_API_KEY.startsWith('sk-')) {
        return basicDescription; // Return original if no API key
      }

      const prompt = `You are an expert event planner. Enhance this basic event description to make it more engaging and appealing, while keeping it concise (2-3 sentences max).

Event Name: ${eventName}
Event Type: ${eventType}
Current Description: ${basicDescription}

Guidelines:
- Keep the same core information
- Make it more exciting and engaging
- Add appropriate enthusiasm for the event type
- Keep it under 150 characters for mobile display
- Use action words and positive language

Enhanced description:`;

      const response = await fetch(this.OPENAI_CHAT_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ENV.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are a creative event planner. Always respond with just the enhanced description, no extra text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 100,
        }),
      });

      if (!response.ok) {
        console.warn('Failed to enhance description:', response.statusText);
        return basicDescription;
      }

      const result = await response.json();
      const enhancedDescription = result.choices?.[0]?.message?.content?.trim();

      return enhancedDescription && enhancedDescription.length > 0 ? enhancedDescription : basicDescription;

    } catch (error) {
      console.error('Error enhancing description:', error);
      return basicDescription; // Fallback to original
    }
  }

  /**
   * Generate AI-powered event header image using DALL-E
   */
  static async generateEventHeader(eventName: string, eventType: string, location?: string): Promise<string | null> {
    try {
      if (!ENV.OPENAI_API_KEY || !ENV.OPENAI_API_KEY.startsWith('sk-')) {
        console.warn('OpenAI API key not configured for image generation');
        return null;
      }

      console.log('🎨 Generating AI header image...');

      // Create a descriptive prompt for the event
      const locationText = location ? ` in ${location}` : '';
      const prompt = this.createImagePrompt(eventName, eventType, locationText);

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ENV.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'dall-e-3',
          prompt: prompt,
          n: 1,
          size: '1792x1024', // Perfect for event headers
          quality: 'standard',
          style: 'vivid'
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ DALL-E API Error:', errorText);
        return null;
      }

      const result = await response.json();
      const imageUrl = result.data?.[0]?.url;

      if (imageUrl) {
        console.log('✅ AI header image generated successfully');
        return imageUrl;
      } else {
        console.warn('⚠️ No image URL in DALL-E response');
        return null;
      }

    } catch (error) {
      console.error('❌ Error generating AI header:', error);
      return null;
    }
  }

  /**
   * Create optimized prompts for different event types
   */
  private static createImagePrompt(eventName: string, eventType: string, locationText: string): string {
    const baseStyle = "Create a beautiful, vibrant, and celebratory event header image";
    
    const typePrompts = {
      birthday: `${baseStyle} for a birthday party${locationText}. Include birthday cake, balloons, confetti, warm lighting, and festive decorations. Style: modern, joyful, colorful with pink and gold accents.`,
      
      party: `${baseStyle} for a social party${locationText}. Include disco lights, dancing silhouettes, vibrant colors, music elements, and energetic atmosphere. Style: dynamic, modern, with neon accents.`,
      
      networking: `${baseStyle} for a professional networking event${locationText}. Include modern office space, people connecting, handshakes, laptops, clean design, and professional atmosphere. Style: clean, modern, business-friendly with blue and white tones.`,
      
      sports: `${baseStyle} for a sports event${locationText}. Include athletic equipment, stadium elements, action poses, team spirit, and energetic vibes. Style: dynamic, energetic with bold colors.`,
      
      food: `${baseStyle} for a food-related event${locationText}. Include delicious food, elegant table settings, warm ambiance, chef elements, and appetizing presentation. Style: warm, inviting, with rich colors.`,
      
      other: `${baseStyle} for "${eventName}"${locationText}. Include celebration elements, people gathering, warm lighting, and festive atmosphere. Style: versatile, welcoming, with pleasant colors.`
    };

    const prompt = typePrompts[eventType as keyof typeof typePrompts] || typePrompts.other;
    
    return `${prompt} No text or words in the image. Professional quality, suitable for mobile app header.`;
  }

  /**
   * Get fallback gradient colors for event types when AI generation isn't available
   */
  static getEventTypeGradient(eventType: string): string[] {
    const gradients = {
      birthday: ['#FF6B9D', '#E06B9D', '#FF8E9B'],
      party: ['#A8EDEA', '#FAD0C4', '#FFD5E1'],
      networking: ['#4ECDC4', '#44A08D', '#5CB3CC'],
      sports: ['#96CEB4', '#FFECD2', '#B8E6B8'],
      food: ['#FFB75E', '#ED8F03', '#FFD89B'],
      other: ['#667eea', '#764ba2', '#8B7ED8']
    };
    
    return gradients[eventType as keyof typeof gradients] || gradients.other;
  }
}

// Convenience export for the main processing function
export const processVoiceToEvent = VoiceEventService.processVoiceToEvent; 
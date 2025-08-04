import axios from 'axios';
import type { GoogleSheetsConfig, RSVPFormData, RSVPSubmission, APIResponse } from '../types';

class GoogleSheetsAPI {
  private config: GoogleSheetsConfig;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
  }

  private getBaseUrl(): string {
    return `https://sheets.googleapis.com/v4/spreadsheets/${this.config.sheetId}`;
  }

  async submitRSVP(rsvpData: RSVPFormData): Promise<APIResponse<boolean>> {
    try {
      const timestamp = new Date().toISOString();
      const values = [
        [
          timestamp,
          rsvpData.guestToken,
          rsvpData.isAttending ? 'Yes' : 'No',
          rsvpData.guestCount.toString(),
          rsvpData.guestNames.join(', '),
          rsvpData.dietaryRestrictions.join(', '),
          JSON.stringify(rsvpData.mealChoices),
          rsvpData.songRequest || '',
          rsvpData.specialRequests || '',
          rsvpData.email,
          rsvpData.phone || ''
        ]
      ];

      const response = await axios.post(
        `${this.getBaseUrl()}/values/${this.config.range}:append`,
        {
          values,
          majorDimension: 'ROWS',
          insertDataOption: 'INSERT_ROWS',
          valueInputOption: 'USER_ENTERED'
        },
        {
          params: {
            key: this.config.apiKey
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        return { success: true, data: true };
      } else {
        return { success: false, error: 'Failed to submit RSVP' };
      }
    } catch (error) {
      console.error('Error submitting RSVP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async checkExistingRSVP(guestToken: string): Promise<APIResponse<RSVPFormData | null>> {
    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/values/${this.config.range}`,
        {
          params: {
            key: this.config.apiKey
          }
        }
      );

      if (response.data && response.data.values) {
        const rows = response.data.values;
        const existingRSVP = rows.find((row: string[]) => row[1] === guestToken);

        if (existingRSVP) {
          const [
            ,
            token,
            attending,
            guestCount,
            guestNames,
            dietaryRestrictions,
            mealChoices,
            songRequest,
            specialRequests,
            email,
            phone
          ] = existingRSVP;

          const rsvpData: RSVPFormData = {
            guestToken: token,
            isAttending: attending === 'Yes',
            guestCount: parseInt(guestCount),
            guestNames: guestNames ? guestNames.split(', ') : [],
            dietaryRestrictions: dietaryRestrictions ? dietaryRestrictions.split(', ') : [],
            mealChoices: mealChoices ? JSON.parse(mealChoices) : [],
            songRequest: songRequest || undefined,
            specialRequests: specialRequests || undefined,
            email: email,
            phone: phone || undefined
          };

          return { success: true, data: rsvpData };
        }
      }

      return { success: true, data: null };
    } catch (error) {
      console.error('Error checking existing RSVP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async updateRSVP(guestToken: string, rsvpData: RSVPFormData): Promise<APIResponse<boolean>> {
    try {
      const existingResponse = await this.checkExistingRSVP(guestToken);
      
      if (!existingResponse.success) {
        return { success: false, error: existingResponse.error };
      }

      if (existingResponse.data) {
        const response = await axios.get(
          `${this.getBaseUrl()}/values/${this.config.range}`,
          {
            params: {
              key: this.config.apiKey
            }
          }
        );

        if (response.data && response.data.values) {
          const rows = response.data.values;
          const rowIndex = rows.findIndex((row: string[]) => row[1] === guestToken);

          if (rowIndex !== -1) {
            const actualRowNumber = rowIndex + 1;
            const timestamp = new Date().toISOString();
            const values = [
              timestamp,
              rsvpData.guestToken,
              rsvpData.isAttending ? 'Yes' : 'No',
              rsvpData.guestCount.toString(),
              rsvpData.guestNames.join(', '),
              rsvpData.dietaryRestrictions.join(', '),
              JSON.stringify(rsvpData.mealChoices),
              rsvpData.songRequest || '',
              rsvpData.specialRequests || '',
              rsvpData.email,
              rsvpData.phone || ''
            ];

            const updateResponse = await axios.put(
              `${this.getBaseUrl()}/values/${this.config.range.split(':')[0]}${actualRowNumber}:${this.config.range.split(':')[1]}${actualRowNumber}`,
              {
                values: [values],
                majorDimension: 'ROWS'
              },
              {
                params: {
                  key: this.config.apiKey,
                  valueInputOption: 'USER_ENTERED'
                }
              }
            );

            return { success: updateResponse.status === 200, data: true };
          }
        }
      }

      return await this.submitRSVP(rsvpData);
    } catch (error) {
      console.error('Error updating RSVP:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // New methods for RSVPSubmission interface
  async saveRSVPSubmission(rsvpData: RSVPSubmission): Promise<APIResponse<boolean>> {
    try {
      const values = [
        [
          rsvpData.submittedAt,
          rsvpData.token,
          rsvpData.guestName,
          rsvpData.email || '',
          rsvpData.isAttending ? 'Yes' : 'No',
          rsvpData.mealChoice || '',
          rsvpData.dietaryRestrictions || '',
          rsvpData.plusOneName || '',
          rsvpData.plusOneMealChoice || '',
          rsvpData.plusOneDietaryRestrictions || '',
          rsvpData.wantsEmailConfirmation ? 'Yes' : 'No',
          rsvpData.specialRequests || ''
        ]
      ];

      const response = await axios.post(
        `${this.getBaseUrl()}/values/${this.config.range}:append`,
        {
          values,
          majorDimension: 'ROWS'
        },
        {
          params: {
            key: this.config.apiKey,
            valueInputOption: 'USER_ENTERED'
          }
        }
      );

      return { success: response.status === 200, data: true };
    } catch (error) {
      console.error('Error saving RSVP submission:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async updateRSVPSubmission(rsvpData: RSVPSubmission): Promise<APIResponse<boolean>> {
    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/values/${this.config.range}`,
        {
          params: {
            key: this.config.apiKey
          }
        }
      );

      if (response.data && response.data.values) {
        const rows = response.data.values;
        const rowIndex = rows.findIndex((row: string[]) => row[1] === rsvpData.token);

        if (rowIndex !== -1) {
          const actualRowNumber = rowIndex + 1;
          const values = [
            rsvpData.submittedAt,
            rsvpData.token,
            rsvpData.guestName,
            rsvpData.email || '',
            rsvpData.isAttending ? 'Yes' : 'No',
            rsvpData.mealChoice || '',
            rsvpData.dietaryRestrictions || '',
            rsvpData.plusOneName || '',
            rsvpData.plusOneMealChoice || '',
            rsvpData.plusOneDietaryRestrictions || '',
            rsvpData.wantsEmailConfirmation ? 'Yes' : 'No',
            rsvpData.specialRequests || ''
          ];

          const updateResponse = await axios.put(
            `${this.getBaseUrl()}/values/${this.config.range.split(':')[0]}${actualRowNumber}:${this.config.range.split(':')[1]}${actualRowNumber}`,
            {
              values: [values],
              majorDimension: 'ROWS'
            },
            {
              params: {
                key: this.config.apiKey,
                valueInputOption: 'USER_ENTERED'
              }
            }
          );

          return { success: updateResponse.status === 200, data: true };
        }
      }

      // If not found, create new entry
      return await this.saveRSVPSubmission(rsvpData);
    } catch (error) {
      console.error('Error updating RSVP submission:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getRSVPSubmission(token: string): Promise<APIResponse<RSVPSubmission | null>> {
    try {
      const response = await axios.get(
        `${this.getBaseUrl()}/values/${this.config.range}`,
        {
          params: {
            key: this.config.apiKey
          }
        }
      );

      if (response.data && response.data.values) {
        const rows = response.data.values;
        const existingRSVP = rows.find((row: string[]) => row[1] === token);

        if (existingRSVP) {
          const [
            submittedAt,
            guestToken,
            guestName,
            email,
            attending,
            mealChoice,
            dietaryRestrictions,
            plusOneName,
            plusOneMealChoice,
            plusOneDietaryRestrictions,
            wantsEmailConfirmation,
            specialRequests
          ] = existingRSVP;

          const rsvpData: RSVPSubmission = {
            submittedAt: submittedAt,
            token: guestToken,
            guestName: guestName,
            email: email || undefined,
            isAttending: attending === 'Yes',
            mealChoice: mealChoice || undefined,
            dietaryRestrictions: dietaryRestrictions || undefined,
            plusOneName: plusOneName || undefined,
            plusOneMealChoice: plusOneMealChoice || undefined,
            plusOneDietaryRestrictions: plusOneDietaryRestrictions || undefined,
            wantsEmailConfirmation: wantsEmailConfirmation === 'Yes',
            specialRequests: specialRequests || undefined
          };

          return { success: true, data: rsvpData };
        }
      }

      return { success: true, data: null };
    } catch (error) {
      console.error('Error getting RSVP submission:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}

export default GoogleSheetsAPI;

// Convenience functions for the new RSVP service
const defaultConfig: GoogleSheetsConfig = {
  sheetId: process.env.REACT_APP_GOOGLE_SHEET_ID || '',
  apiKey: process.env.REACT_APP_GOOGLE_API_KEY || '',
  range: 'RSVP!A2:L'
};

const sheetsAPI = new GoogleSheetsAPI(defaultConfig);

export async function saveRSVPToSheets(rsvpData: RSVPSubmission): Promise<void> {
  const result = await sheetsAPI.saveRSVPSubmission(rsvpData);
  if (!result.success) {
    throw new Error(result.error || 'Failed to save RSVP to sheets');
  }
}

export async function updateRSVPInSheets(rsvpData: RSVPSubmission): Promise<void> {
  const result = await sheetsAPI.updateRSVPSubmission(rsvpData);
  if (!result.success) {
    throw new Error(result.error || 'Failed to update RSVP in sheets');
  }
}

export async function getRSVPFromSheets(token: string): Promise<RSVPSubmission | null> {
  const result = await sheetsAPI.getRSVPSubmission(token);
  if (!result.success) {
    throw new Error(result.error || 'Failed to get RSVP from sheets');
  }
  return result.data || null;
}
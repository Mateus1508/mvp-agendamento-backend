import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { calendar_v3, google } from 'googleapis';
import {
  CalendarEvent,
  CalendarEventInput,
  CalendarEventUpdateInput,
  ListCalendarEventsParams,
} from './calendar.types';

@Injectable()
export class GoogleCalendarProvider {
  private readonly calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary';
  private readonly clientId = process.env.GOOGLE_CLIENT_ID;
  private readonly clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  private readonly refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  async createEvent(input: CalendarEventInput): Promise<CalendarEvent> {
    const calendar = this.getCalendarClient();
    const response = await calendar.events.insert({
      calendarId: this.calendarId,
      requestBody: this.toGoogleEvent(input),
    });

    const event = this.toCalendarEvent(response.data);

    if (!event) {
      throw new Error('Google Calendar retornou um evento inválido');
    }

    return event;
  }

  async updateEvent(
    eventId: string,
    input: CalendarEventUpdateInput,
  ): Promise<CalendarEvent> {
    const calendar = this.getCalendarClient();
    const current = await calendar.events.get({
      calendarId: this.calendarId,
      eventId,
    });

    const response = await calendar.events.patch({
      calendarId: this.calendarId,
      eventId,
      requestBody: this.toGoogleEventUpdate(input, current.data),
    });

    const event = this.toCalendarEvent(response.data);

    if (!event) {
      throw new Error('Google Calendar retornou um evento inválido');
    }

    return event;
  }

  async deleteEvent(eventId: string): Promise<void> {
    const calendar = this.getCalendarClient();

    await calendar.events.delete({
      calendarId: this.calendarId,
      eventId,
    });
  }

  async getEvent(eventId: string): Promise<CalendarEvent | null> {
    try {
      const calendar = this.getCalendarClient();
      const response = await calendar.events.get({
        calendarId: this.calendarId,
        eventId,
      });

      return this.toCalendarEvent(response.data);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: number }).code === 404
      ) {
        return null;
      }

      throw error;
    }
  }

  async listEvents(
    params: ListCalendarEventsParams = {},
  ): Promise<CalendarEvent[]> {
    const calendar = this.getCalendarClient();
    const response = await calendar.events.list({
      calendarId: this.calendarId,
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      privateExtendedProperty: params.customerId
        ? [`customerId=${params.customerId}`]
        : undefined,
    });

    return (response.data.items ?? [])
      .map((event) => this.toCalendarEvent(event))
      .filter((event): event is CalendarEvent => event !== null);
  }

  private getCalendarClient(): calendar_v3.Calendar {
    if (!this.clientId || !this.clientSecret || !this.refreshToken) {
      throw new ServiceUnavailableException(
        'Integração com Google Calendar não configurada. Defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REFRESH_TOKEN.',
      );
    }

    const auth = new google.auth.OAuth2(this.clientId, this.clientSecret);
    auth.setCredentials({ refresh_token: this.refreshToken });

    return google.calendar({ version: 'v3', auth });
  }

  private toGoogleEvent(input: CalendarEventInput): calendar_v3.Schema$Event {
    return {
      summary: input.summary,
      description: input.description,
      start: {
        dateTime: input.start,
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: input.end,
        timeZone: 'America/Sao_Paulo',
      },
      extendedProperties: {
        private: {
          customerId: input.customerId,
        },
      },
    };
  }

  private toGoogleEventUpdate(
    input: CalendarEventUpdateInput,
    current: calendar_v3.Schema$Event,
  ): calendar_v3.Schema$Event {
    const customerId =
      input.customerId ?? current.extendedProperties?.private?.customerId;

    return {
      summary: input.summary,
      description: input.description,
      start: input.start
        ? { dateTime: input.start, timeZone: 'America/Sao_Paulo' }
        : undefined,
      end: input.end
        ? { dateTime: input.end, timeZone: 'America/Sao_Paulo' }
        : undefined,
      extendedProperties: customerId ? { private: { customerId } } : undefined,
    };
  }

  private toCalendarEvent(
    event: calendar_v3.Schema$Event,
  ): CalendarEvent | null {
    const start = event.start?.dateTime ?? event.start?.date;
    const end = event.end?.dateTime ?? event.end?.date;
    const customerId = event.extendedProperties?.private?.customerId;

    if (!event.id || !event.summary || !start || !end || !customerId) {
      return null;
    }

    return {
      id: event.id,
      summary: event.summary,
      description: event.description ?? undefined,
      start,
      end,
      customerId,
      htmlLink: event.htmlLink ?? undefined,
    };
  }
}

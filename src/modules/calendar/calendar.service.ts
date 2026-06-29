import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CustomersService } from '../customers/customers.service';
import { CalendarEvent } from './calendar.types';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { ListCalendarEventsDto } from './dto/list-calendar-events.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { GoogleCalendarProvider } from './google-calendar.provider';

@Injectable()
export class CalendarService {
  constructor(
    private readonly googleCalendarProvider: GoogleCalendarProvider,
    private readonly customersService: CustomersService,
  ) {}

  async createEvent(
    createCalendarEventDto: CreateCalendarEventDto,
  ): Promise<CalendarEvent> {
    await this.ensureCustomerExists(createCalendarEventDto.customerId);
    this.validateDateRange(
      createCalendarEventDto.start,
      createCalendarEventDto.end,
    );

    return this.googleCalendarProvider.createEvent(createCalendarEventDto);
  }

  async updateEvent(
    eventId: string,
    updateCalendarEventDto: UpdateCalendarEventDto,
  ): Promise<CalendarEvent> {
    if (updateCalendarEventDto.customerId) {
      await this.ensureCustomerExists(updateCalendarEventDto.customerId);
    }

    if (updateCalendarEventDto.start || updateCalendarEventDto.end) {
      this.validateDateRange(
        updateCalendarEventDto.start,
        updateCalendarEventDto.end,
      );
    }

    try {
      return await this.googleCalendarProvider.updateEvent(
        eventId,
        updateCalendarEventDto,
      );
    } catch (error) {
      this.handleProviderNotFound(eventId, error);
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<CalendarEvent> {
    const event = await this.googleCalendarProvider.getEvent(eventId);

    if (!event) {
      throw new NotFoundException(`Evento com id "${eventId}" não encontrado`);
    }

    await this.googleCalendarProvider.deleteEvent(eventId);
    return event;
  }

  async listEvents(
    listCalendarEventsDto: ListCalendarEventsDto = {},
  ): Promise<CalendarEvent[]> {
    if (listCalendarEventsDto.customerId) {
      await this.ensureCustomerExists(listCalendarEventsDto.customerId);
    }

    if (listCalendarEventsDto.timeMin || listCalendarEventsDto.timeMax) {
      this.validateDateRange(
        listCalendarEventsDto.timeMin,
        listCalendarEventsDto.timeMax,
      );
    }

    return this.googleCalendarProvider.listEvents(listCalendarEventsDto);
  }

  private async ensureCustomerExists(customerId: string) {
    await this.customersService.findOne(customerId);
  }

  private validateDateRange(start?: string, end?: string) {
    if (start) {
      const parsedStart = new Date(start);
      if (Number.isNaN(parsedStart.getTime())) {
        throw new BadRequestException('Data de início inválida');
      }
    }

    if (end) {
      const parsedEnd = new Date(end);
      if (Number.isNaN(parsedEnd.getTime())) {
        throw new BadRequestException('Data de fim inválida');
      }
    }

    if (start && end) {
      const parsedStart = new Date(start);
      const parsedEnd = new Date(end);

      if (parsedStart >= parsedEnd) {
        throw new BadRequestException(
          'A data de início deve ser anterior à data de fim',
        );
      }
    }
  }

  private handleProviderNotFound(eventId: string, error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code?: number }).code === 404
    ) {
      throw new NotFoundException(`Evento com id "${eventId}" não encontrado`);
    }
  }
}

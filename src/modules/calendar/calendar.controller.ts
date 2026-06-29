import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { ListCalendarEventsDto } from './dto/list-calendar-events.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';

@Controller('calendar/events')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  createEvent(@Body() createCalendarEventDto: CreateCalendarEventDto) {
    return this.calendarService.createEvent(createCalendarEventDto);
  }

  @Get()
  listEvents(@Query() listCalendarEventsDto: ListCalendarEventsDto) {
    return this.calendarService.listEvents(listCalendarEventsDto);
  }

  @Patch(':id')
  updateEvent(
    @Param('id') id: string,
    @Body() updateCalendarEventDto: UpdateCalendarEventDto,
  ) {
    return this.calendarService.updateEvent(id, updateCalendarEventDto);
  }

  @Delete(':id')
  deleteEvent(@Param('id') id: string) {
    return this.calendarService.deleteEvent(id);
  }
}

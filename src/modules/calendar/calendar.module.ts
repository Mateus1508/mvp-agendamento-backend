import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { GoogleCalendarProvider } from './google-calendar.provider';

@Module({
  imports: [CustomersModule],
  controllers: [CalendarController],
  providers: [CalendarService, GoogleCalendarProvider],
  exports: [CalendarService],
})
export class CalendarModule {}

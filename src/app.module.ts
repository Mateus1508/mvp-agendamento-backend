import { Module } from '@nestjs/common';
import { AgentModule } from './modules/agent/agent.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomersModule } from './modules/customers/customers.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    CustomersModule,
    AppointmentsModule,
    CalendarModule,
    AgentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

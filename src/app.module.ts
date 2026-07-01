import { Module } from '@nestjs/common';
import { AgentModule } from './modules/agent/agent.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { AuthModule } from './modules/auth/auth.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from './cache/cache.module';
import { CustomersModule } from './modules/customers/customers.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    CacheModule,
    AuthModule,
    CompaniesModule,
    CustomersModule,
    AppointmentsModule,
    CalendarModule,
    AgentModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

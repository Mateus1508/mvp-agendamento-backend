import { Module } from '@nestjs/common';
import { ClientAuthGuard } from '../auth/guards/client-auth.guard';
import { AppointmentsModule } from '../appointments/appointments.module';
import { CalendarModule } from '../calendar/calendar.module';
import { CompaniesModule } from '../companies/companies.module';
import { CustomersModule } from '../customers/customers.module';
import { LlmModule } from '../llm/llm.module';
import { AgentMemoryService } from './memory/agent-memory.service';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { AgentToolsService } from './tools/agent-tools.service';
import { AppointmentsTools } from './tools/appointments.tools';
import { CalendarTools } from './tools/calendar.tools';
import { CustomersTools } from './tools/customers.tools';

@Module({
  imports: [
    LlmModule,
    CustomersModule,
    AppointmentsModule,
    CalendarModule,
    CompaniesModule,
  ],
  controllers: [AgentController, DiscoveryController],
  providers: [
    AgentService,
    DiscoveryService,
    AgentMemoryService,
    AgentToolsService,
    CustomersTools,
    AppointmentsTools,
    CalendarTools,
    ClientAuthGuard,
  ],
})
export class AgentModule {}

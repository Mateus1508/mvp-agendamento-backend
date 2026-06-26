import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { CustomersModule } from '../customers/customers.module';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { AgentToolsService } from './tools/agent-tools.service';
import { AppointmentsTools } from './tools/appointments.tools';
import { CustomersTools } from './tools/customers.tools';

@Module({
  imports: [CustomersModule, AppointmentsModule],
  controllers: [AgentController],
  providers: [
    AgentService,
    AgentToolsService,
    CustomersTools,
    AppointmentsTools,
  ],
})
export class AgentModule {}

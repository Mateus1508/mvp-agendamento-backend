import { BadRequestException, Injectable } from '@nestjs/common';
import { AgentToolDefinition } from './agent-tool.types';
import {
  APPOINTMENT_TOOL_NAMES,
  AppointmentsTools,
  appointmentTools,
} from './appointments.tools';
import {
  CUSTOMER_TOOL_NAMES,
  CustomersTools,
  customerTools,
} from './customers.tools';

@Injectable()
export class AgentToolsService {
  private readonly toolHandlers = new Map<
    string,
    (args: Record<string, unknown>) => Promise<unknown>
  >();
  private readonly toolDefinitions: AgentToolDefinition[] = [];

  constructor(
    private readonly customersTools: CustomersTools,
    private readonly appointmentsTools: AppointmentsTools,
  ) {
    this.registerModule(customerTools, CUSTOMER_TOOL_NAMES, (name, args) =>
      this.customersTools.execute(name, args),
    );

    this.registerModule(
      appointmentTools,
      APPOINTMENT_TOOL_NAMES,
      (name, args) => this.appointmentsTools.execute(name, args),
    );
  }

  getDefinitions(): AgentToolDefinition[] {
    return this.toolDefinitions;
  }

  async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const handler = this.toolHandlers.get(name);

    if (!handler) {
      throw new BadRequestException(`Tool desconhecida: ${name}`);
    }

    return handler(args);
  }

  private registerModule<T extends readonly string[]>(
    definitions: AgentToolDefinition[],
    names: T,
    handlerFactory: (
      name: T[number],
      args: Record<string, unknown>,
    ) => Promise<unknown>,
  ) {
    this.toolDefinitions.push(...definitions);

    for (const name of names) {
      this.toolHandlers.set(name, (args) => handlerFactory(name, args));
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { parseAppointmentDate } from './validators/appointment-date.validator';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAppointmentDto: CreateAppointmentDto) {
    await this.ensureCustomerExists(createAppointmentDto.customerId);

    const date = parseAppointmentDate(createAppointmentDto.date);

    return this.prisma.appointment.create({
      data: {
        customerId: createAppointmentDto.customerId,
        date,
      },
      include: { customer: true },
    });
  }

  findAll() {
    return this.prisma.appointment.findMany({
      include: { customer: true },
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!appointment) {
      throw new NotFoundException(`Agendamento com id "${id}" não encontrado`);
    }

    return appointment;
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto) {
    await this.findOne(id);

    if (updateAppointmentDto.customerId) {
      await this.ensureCustomerExists(updateAppointmentDto.customerId);
    }

    if (updateAppointmentDto.date) {
      parseAppointmentDate(updateAppointmentDto.date);
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        customerId: updateAppointmentDto.customerId,
        date: updateAppointmentDto.date
          ? parseAppointmentDate(updateAppointmentDto.date)
          : undefined,
      },
      include: { customer: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.appointment.delete({
      where: { id },
    });
  }

  private async ensureCustomerExists(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException(
        `Cliente com id "${customerId}" não encontrado`,
      );
    }
  }
}

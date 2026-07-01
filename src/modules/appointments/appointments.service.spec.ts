import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { AppointmentsService } from './appointments.service';

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  const prisma = {
    appointment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
  };

  const customer = {
    id: 'customer-1',
    name: 'Maria Silva',
    phone: '11999999999',
  };

  const appointment = {
    id: 'appointment-1',
    date: new Date('2026-06-27T14:00:00.000Z'),
    customerId: 'customer-1',
    createdAt: new Date('2026-06-26T14:00:00.000Z'),
    customer,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar um agendamento', async () => {
      const dto = {
        date: '2026-06-27T14:00:00.000Z',
        customerId: 'customer-1',
      };

      prisma.customer.findUnique.mockResolvedValue(customer);
      prisma.appointment.create.mockResolvedValue(appointment);

      const result = await service.create(dto);

      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
      });
      expect(prisma.appointment.create).toHaveBeenCalledWith({
        data: {
          customerId: 'customer-1',
          date: new Date('2026-06-27T14:00:00.000Z'),
        },
        include: { customer: true },
      });
      expect(result).toEqual(appointment);
    });

    it('deve lançar NotFoundException quando cliente não existir', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.create({
          date: '2026-06-27T14:00:00.000Z',
          customerId: 'inexistente',
        }),
      ).rejects.toThrow(
        new NotFoundException('Cliente com id "inexistente" não encontrado'),
      );
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando data for inválida', async () => {
      prisma.customer.findUnique.mockResolvedValue(customer);

      await expect(
        service.create({ date: 'data-invalida', customerId: 'customer-1' }),
      ).rejects.toThrow(new BadRequestException('Data inválida'));
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando horário não for hora cheia', async () => {
      prisma.customer.findUnique.mockResolvedValue(customer);

      await expect(
        service.create({
          date: '2026-06-27T11:30:00.000Z',
          customerId: 'customer-1',
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'O horário deve ser em horas cheias (ex: 08:00, 09:00)',
        ),
      );
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException quando horário estiver fora do intervalo permitido', async () => {
      prisma.customer.findUnique.mockResolvedValue(customer);

      await expect(
        service.create({
          date: '2026-06-27T21:00:00.000Z',
          customerId: 'customer-1',
        }),
      ).rejects.toThrow(
        new BadRequestException('O horário deve estar entre 08:00 e 17:00'),
      );
      expect(prisma.appointment.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deve listar agendamentos com cliente', async () => {
      prisma.appointment.findMany.mockResolvedValue([appointment]);

      const result = await service.findAll();

      expect(prisma.appointment.findMany).toHaveBeenCalledWith({
        include: { customer: true },
        orderBy: { date: 'asc' },
      });
      expect(result).toEqual([appointment]);
    });
  });

  describe('findOne', () => {
    it('deve retornar um agendamento pelo id', async () => {
      prisma.appointment.findUnique.mockResolvedValue(appointment);

      const result = await service.findOne('appointment-1');

      expect(prisma.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: 'appointment-1' },
        include: { customer: true },
      });
      expect(result).toEqual(appointment);
    });

    it('deve lançar NotFoundException quando agendamento não existir', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('inexistente')).rejects.toThrow(
        new NotFoundException(
          'Agendamento com id "inexistente" não encontrado',
        ),
      );
    });
  });

  describe('update', () => {
    it('deve atualizar um agendamento existente', async () => {
      const dto = { date: '2026-06-28T13:00:00.000Z' };
      const updated = {
        ...appointment,
        date: new Date('2026-06-28T13:00:00.000Z'),
      };

      prisma.appointment.findUnique.mockResolvedValue(appointment);
      prisma.appointment.update.mockResolvedValue(updated);

      const result = await service.update('appointment-1', dto);

      expect(prisma.appointment.update).toHaveBeenCalledWith({
        where: { id: 'appointment-1' },
        data: {
          customerId: undefined,
          date: new Date('2026-06-28T13:00:00.000Z'),
        },
        include: { customer: true },
      });
      expect(result).toEqual(updated);
    });

    it('deve validar cliente ao atualizar customerId', async () => {
      const dto = { customerId: 'customer-2' };

      prisma.appointment.findUnique.mockResolvedValue(appointment);
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.update('appointment-1', dto)).rejects.toThrow(
        new NotFoundException('Cliente com id "customer-2" não encontrado'),
      );
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it('deve lançar BadRequestException ao atualizar com data inválida', async () => {
      prisma.appointment.findUnique.mockResolvedValue(appointment);

      await expect(
        service.update('appointment-1', { date: 'data-invalida' }),
      ).rejects.toThrow(new BadRequestException('Data inválida'));
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });

    it('deve lançar NotFoundException ao atualizar agendamento inexistente', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(
        service.update('inexistente', { date: '2026-06-28T13:00:00.000Z' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.appointment.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deve remover um agendamento existente', async () => {
      prisma.appointment.findUnique.mockResolvedValue(appointment);
      prisma.appointment.delete.mockResolvedValue(appointment);

      const result = await service.remove('appointment-1');

      expect(prisma.appointment.delete).toHaveBeenCalledWith({
        where: { id: 'appointment-1' },
      });
      expect(result).toEqual(appointment);
    });

    it('deve lançar NotFoundException ao remover agendamento inexistente', async () => {
      prisma.appointment.findUnique.mockResolvedValue(null);

      await expect(service.remove('inexistente')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.appointment.delete).not.toHaveBeenCalled();
    });
  });
});

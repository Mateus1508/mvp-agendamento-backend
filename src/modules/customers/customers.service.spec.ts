import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CustomersService } from './customers.service';

describe('CustomersService', () => {
  let service: CustomersService;

  const prisma = {
    customer: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const customer = {
    id: 'customer-1',
    name: 'Maria Silva',
    phone: '11999999999',
    appointments: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar um cliente', async () => {
      const dto = { name: 'Maria Silva', phone: '11999999999' };
      prisma.customer.create.mockResolvedValue(customer);

      const result = await service.create(dto);

      expect(prisma.customer.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(customer);
    });
  });

  describe('findAll', () => {
    it('deve listar clientes com agendamentos', async () => {
      prisma.customer.findMany.mockResolvedValue([customer]);

      const result = await service.findAll();

      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        include: { appointments: true },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual([customer]);
    });
  });

  describe('findOne', () => {
    it('deve retornar um cliente pelo id', async () => {
      prisma.customer.findUnique.mockResolvedValue(customer);

      const result = await service.findOne('customer-1');

      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        include: { appointments: true },
      });
      expect(result).toEqual(customer);
    });

    it('deve lançar NotFoundException quando cliente não existir', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.findOne('inexistente')).rejects.toThrow(
        new NotFoundException('Cliente com id "inexistente" não encontrado'),
      );
    });
  });

  describe('update', () => {
    it('deve atualizar um cliente existente', async () => {
      const dto = { phone: '11888888888' };
      const updated = { ...customer, phone: '11888888888' };

      prisma.customer.findUnique.mockResolvedValue(customer);
      prisma.customer.update.mockResolvedValue(updated);

      const result = await service.update('customer-1', dto);

      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        data: dto,
      });
      expect(result).toEqual(updated);
    });

    it('deve lançar NotFoundException ao atualizar cliente inexistente', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.update('inexistente', { phone: '11888888888' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.customer.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deve remover um cliente existente', async () => {
      prisma.customer.findUnique.mockResolvedValue(customer);
      prisma.customer.delete.mockResolvedValue(customer);

      const result = await service.remove('customer-1');

      expect(prisma.customer.delete).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
      });
      expect(result).toEqual(customer);
    });

    it('deve lançar NotFoundException ao remover cliente inexistente', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.remove('inexistente')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.customer.delete).not.toHaveBeenCalled();
    });
  });
});

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ModelName = keyof Omit<
  PrismaService,
  'onModuleInit' | 'onModuleDestroy' | '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
>;

@Injectable()
export abstract class BaseService<T, CreateDto, UpdateDto> {
  protected model: ModelName;
  protected prisma: PrismaService;

  constructor(prisma: PrismaService, model: ModelName) {
    this.prisma = prisma;
    this.model = model;
  }

  async create(createDto: CreateDto): Promise<T> {
    // @ts-ignore
    return this.prisma[this.model].create({ data: createDto });
  }


  async findAll(params: {
    skip?: number;
    take?: number;
    cursor?: any;
    where?: any;
    orderBy?: any;
  }): Promise<T[]> {
    const { skip, take, cursor, where, orderBy } = params;
    // @ts-ignore
    return this.prisma[this.model].findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  async findOne(where: any): Promise<T | null> {
    // @ts-ignore
    return this.prisma[this.model].findUnique({ where });
  }


  async update(where: any, updateDto: UpdateDto): Promise<T> {
    // @ts-ignore
    return this.prisma[this.model].update({
      where,
      data: updateDto,
    });
  }

  async remove(where: any): Promise<T> {
    // @ts-ignore
    return this.prisma[this.model].delete({ where });
  }


  async count(where?: any): Promise<number> {
    // @ts-ignore
    return this.prisma[this.model].count({ where });
  }
}

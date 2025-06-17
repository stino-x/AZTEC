import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { AztecService } from './aztec.service';

@Controller('aztec')
export class AztecController {
  constructor(private readonly aztecService: AztecService) {}

  @Get('code/:studentId')
  async generateCode(@Param('studentId') studentId: string) {
    const image = await this.aztecService.generateAztecCode(studentId);
    return { image };
  }

  @Post('verify')
  async verifyCode(@Body() body: { data: string }) {
    return this.aztecService.verifyAndDecode(body.data);
  }
}
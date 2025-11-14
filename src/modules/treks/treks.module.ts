import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreksController } from './treks.controller';
import { TreksService } from './treks.service';

@Module({
  imports: [TypeOrmModule.forFeature([])],
  controllers: [TreksController],
  providers: [TreksService],
  exports: [TreksService],
})
export class TreksModule {}

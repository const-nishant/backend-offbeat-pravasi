import { PartialType } from '@nestjs/swagger';
import { CreateTrekDto } from './create-trek.dto';

export class UpdateTrekDto extends PartialType(CreateTrekDto) {}

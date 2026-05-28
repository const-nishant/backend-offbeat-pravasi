import { PartialType } from '@nestjs/mapped-types';
import { CreateTrekDto } from './create-trek.dto';

export class UpdateTrekDto extends PartialType(CreateTrekDto) {}

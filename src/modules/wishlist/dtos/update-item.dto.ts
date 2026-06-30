import { PartialType, OmitType } from '@nestjs/swagger';
import { AddToCollectionDto } from './add-to-collection.dto';

export class UpdateItemDto extends PartialType(
  OmitType(AddToCollectionDto, ['trekId'] as const),
) {}

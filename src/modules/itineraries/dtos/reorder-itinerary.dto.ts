import { IsArray, IsUUID } from 'class-validator';

export class ReorderItineraryDto {
  @IsArray()
  @IsUUID('4', { each: true })
  dayIds!: string[];
}

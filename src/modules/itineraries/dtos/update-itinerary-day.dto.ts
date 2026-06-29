import { PartialType } from '@nestjs/mapped-types';
import { CreateItineraryDayDto } from './create-itinerary-day.dto';

export class UpdateItineraryDayDto extends PartialType(CreateItineraryDayDto) {}

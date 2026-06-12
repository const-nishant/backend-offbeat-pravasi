import { IsObject, IsOptional } from 'class-validator';

export class UpdatePlatformSettingsDto {
  @IsObject()
  settings: any;

  @IsOptional()
  message?: string;
}

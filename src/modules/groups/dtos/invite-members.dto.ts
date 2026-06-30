import { IsArray, IsEmail, IsString, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class InviteEntryDto {
  @ApiProperty()
  @IsString()
  @IsEmail()
  email!: string;
}

export class InviteMembersDto {
  @ApiProperty({ type: [InviteEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InviteEntryDto)
  invites!: InviteEntryDto[];
}

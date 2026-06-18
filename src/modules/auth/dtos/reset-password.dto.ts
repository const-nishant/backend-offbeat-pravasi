import { IsEmail, IsString, MinLength, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  @Matches(/^\d+$/, { message: 'OTP must be 6 digits' })
  otp!: string;

  @ApiProperty({ example: 'newSecurePassword123' })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}

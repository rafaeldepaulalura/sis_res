import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/types/auth.types';
import { MAX_UPLOAD_BYTES, UploadsService } from './uploads.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  // Quem edita a marca ou o cardápio pode enviar imagem. O revendedor
  // também, para a marca branca do painel dele.
  @Roles(Role.ADMIN, Role.MANAGER, Role.RESELLER_ADMIN, Role.SUPER_ADMIN)
  @Post()
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } }),
  )
  create(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploads.create(
      { establishmentId: user.establishmentId, resellerId: user.resellerId },
      file,
    );
  }

  // Pública: a imagem aparece no cardápio online, que não tem login.
  @Public()
  @Get(':id')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async serve(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const upload = await this.uploads.serve(id);
    res.type(upload.mimeType).send(upload.data);
  }
}

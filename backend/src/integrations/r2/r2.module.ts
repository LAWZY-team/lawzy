import { Module } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { getR2Env, isR2Configured } from '../../config/env';
import { R2_S3_CLIENT } from './r2.constants';

@Module({
  providers: [
    {
      provide: R2_S3_CLIENT,
      useFactory: () => {
        if (!isR2Configured()) {
          return null;
        }
        const env = getR2Env();
        return new S3Client({
          endpoint: env.endpointUrl,
          region: env.region,
          credentials: {
            accessKeyId: env.accessKeyId,
            secretAccessKey: env.secretAccessKey,
          },
          forcePathStyle: true,
        });
      },
    },
  ],
  exports: [R2_S3_CLIENT],
})
export class R2Module {}

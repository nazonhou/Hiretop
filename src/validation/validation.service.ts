import { Injectable, OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { useContainer } from 'class-validator';

@Injectable()
export class ValidationService implements OnModuleInit {
  constructor(private moduleRef: ModuleRef) {}

  onModuleInit() {
    useContainer(this.moduleRef, { fallbackOnErrors: true });
  }
}

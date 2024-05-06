import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient()
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const TestingPrismaService = globalThis.prismaGlobal ?? prismaClientSingleton()

export default TestingPrismaService

globalThis.prismaGlobal = TestingPrismaService
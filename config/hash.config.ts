import { registerAs } from "@nestjs/config";

export default registerAs('hash', () => ({
  saltRounds: parseInt(process.env.HASH_SALT_ROUNDS)
}));
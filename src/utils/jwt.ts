import config from "config";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User, UserModel } from "../schema/user.schema";

const publicKey = Buffer.from(
  config.get<string>("publicKey"),
  "base64"
).toString("ascii");
const privateKey = Buffer.from(
  config.get<string>("privateKey"),
  "base64"
).toString("ascii");

export function signJwt(object: Object, options?: jwt.SignOptions | undefined) {
  return jwt.sign(object, privateKey, {
    ...(options && options),
    algorithm: "RS256",
  });
}

export async function verifyJwt<User>(token: string): Promise<User | null> {
  try {
    const decoded = <JwtPayload>jwt.verify(token, publicKey);
    const user = await UserModel.findById(decoded.sub) as User;
    return user;
  } catch (e) {
    return null;
  }
}

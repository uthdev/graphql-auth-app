import { ApolloError } from "apollo-server-errors";
import bcrypt from "bcrypt";
import { CreateUserInput, LoginInput, UpdateUserInput, UserModel } from "../schema/user.schema";
import Context from "../types/context";
import { signJwt } from "../utils/jwt";

class UserService {
  async createUser(input: CreateUserInput) {
    //Get user by email
    const user = await UserModel.find().findByEmail(input.email).lean();

    if (user) {
      throw new ApolloError("User with this email already exists");
    }

    return UserModel.create(input);
  }

  async login(input: LoginInput, context: Context) {
    const e = "Invalid email or password";

    // Get our user by email
    const user = await UserModel.find().findByEmail(input.email);

    if (!user) {
      throw new ApolloError(e);
    }

    // validate the password
    const passwordIsValid = await bcrypt.compare(input.password, user.password);

    if (!passwordIsValid) {
      throw new ApolloError(e);
    }

    // sign a jwt
    const token = signJwt({sub: user._id});

    // set a cookie for the jwt
    context.res.cookie("accessToken", token, {
      maxAge: 3.154e10, // 1 year
      httpOnly: true,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });

    user.lastLogin = new Date();
    await user.save();
    // return the jwt
    return token;
  }

  async updateUser(input: UpdateUserInput, context: Context) {
    const e = "You have to be logged in to update your account";

    const { user } = context;

    if(!user) {
      throw new ApolloError(e);
    }

    if(input.password) {
      const salt = await bcrypt.genSalt(10);
      const hash = bcrypt.hashSync(input.password, salt);
      input.password = hash;
    }

    if(input.email) {
      const user = await UserModel.find().findByEmail(input.email);
      if(user) {
        throw new ApolloError("User with this email already exists");
      }
    }

    const updatedUser = await UserModel.findByIdAndUpdate(user._id, input, { new: true });

    return updatedUser;
  }

  logout(context: Context) {
    //set context cookie to empty string
    context.res.cookie("accessToken", "", { maxAge: 1 })
    return true;
  }
}

export default UserService;

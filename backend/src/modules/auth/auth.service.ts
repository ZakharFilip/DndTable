import bcrypt from "bcrypt";
import { UserModel } from "../users/user.model";
import { RegisterDto, LoginDto } from "./auth.dto";

export class AuthService {
  static async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const username = dto.username.trim();

    // Check existing email
    const foundByEmail = await UserModel.findOne({ email });
    if (foundByEmail) {
      const err: any = new Error("EMAIL_ALREADY_EXISTS");
      err.status = 409;
      err.body = { success: false, error: "EMAIL_ALREADY_EXISTS", message: "Пользователь с такой почтой уже зарегистрирован", field: "email" };
      throw err;
    }

    // Check existing username
    const foundByUsername = await UserModel.findOne({ username });
    if (foundByUsername) {
      const err: any = new Error("USERNAME_ALREADY_EXISTS");
      err.status = 409;
      err.body = { success: false, error: "USERNAME_ALREADY_EXISTS", message: "Этот никнейм уже используется", field: "username" };
      throw err;
    }

    // Password policy check (server-side)
    if (!AuthService._isPasswordStrong(dto.password)) {
      const err: any = new Error("VALIDATION_ERROR");
      err.status = 400;
      err.body = {
        success: false,
        error: "VALIDATION_ERROR",
        message: "Ошибка валидации данных",
        details: [
          { field: "password", message: "Пароль должен содержать заглавную букву, строчную и цифру" }
        ]
      };
      throw err;
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await UserModel.create({
      email,
      username,
      passwordHash,
      avatar: "default-avatar.png"
    });

    return {
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          username: user.username,
          avatar: user.avatar
        }
      },
      message: "Регистрация прошла успешно"
    };
  }

  static async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();

    const user = await UserModel.findOne({ email });
    if (!user) {
      const err: any = new Error("INVALID_CREDENTIALS");
      err.status = 401;
      err.body = { success: false, error: "INVALID_CREDENTIALS", message: "Неверный логин или пароль" };
      throw err;
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      const err: any = new Error("INVALID_CREDENTIALS");
      err.status = 401;
      err.body = { success: false, error: "INVALID_CREDENTIALS", message: "Неверный логин или пароль" };
      throw err;
    }

    return {
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          username: user.username
        }
      }
    };
  }

  static _isPasswordStrong(password: string) {
    // Basic policy: length>=8, contains digit, uppercase, lowercase
    if (typeof password !== "string" || password.length < 8) return false;
    const upper = /[A-ZА-ЯЁ]/;
    const lower = /[a-zа-яё]/;
    const digit = /\d/;
    return upper.test(password) && lower.test(password) && digit.test(password);
  }
}

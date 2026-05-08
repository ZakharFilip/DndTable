import bcrypt from "bcrypt";
import { UserModel } from "../users/user.model";
import { RegisterDto, LoginDto } from "./auth.dto";
import { HttpError } from "../../shared/HttpError";

export class AuthService {
  static async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const username = dto.username.trim();

    const foundByEmail = await UserModel.findOne({ email });
    if (foundByEmail) {
      throw new HttpError(
        409,
        "EMAIL_ALREADY_EXISTS",
        "Пользователь с такой почтой уже зарегистрирован",
        { field: "email" }
      );
    }

    const foundByUsername = await UserModel.findOne({ username });
    if (foundByUsername) {
      throw new HttpError(
        409,
        "USERNAME_ALREADY_EXISTS",
        "Этот никнейм уже используется",
        { field: "username" }
      );
    }

    if (!AuthService._isPasswordStrong(dto.password)) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "Ошибка валидации данных",
        {
          details: [
            { field: "password", message: "Пароль должен содержать заглавную букву, строчную и цифру" },
          ],
        }
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await UserModel.create({
      email,
      username,
      passwordHash,
      avatar: "default-avatar.png",
    });

    return {
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          username: user.username,
          avatar: user.avatar,
        },
      },
      message: "Регистрация прошла успешно",
    };
  }

  static async login(dto: LoginDto) {
    const email = dto.email.toLowerCase().trim();

    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Неверный логин или пароль");
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Неверный логин или пароль");
    }

    return {
      success: true,
      data: {
        user: {
          id: String(user._id),
          email: user.email,
          username: user.username,
        },
      },
    };
  }

  static _isPasswordStrong(password: string) {
    if (typeof password !== "string" || password.length < 8) return false;
    const upper = /[A-ZА-ЯЁ]/;
    const lower = /[a-zа-яё]/;
    const digit = /\d/;
    return upper.test(password) && lower.test(password) && digit.test(password);
  }
}

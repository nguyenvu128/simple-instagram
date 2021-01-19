import * as bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import * as HttpStatus from 'http-status-codes';
import Joi from 'joi';
import * as jwt from 'jsonwebtoken';
import uniqueString from 'unique-string';
import { PASSWORD_LENGTH } from '../constant';
import { User, UserDoc, UserModel } from '../models/user.model';
import { sendMailVerify } from '../services/sendMailVerify';

type RegisterReqBody = {
    email: string;
    name?: string;
    password: string;
    confirmPassword: string;
};

type LoginReqBody = {
    email: string;
    password: string;
};

type LoginResSuccess = {
    message: string;
    token: string;
}
type UserResSuccess = {
    message: string;
};

type UserResError = {
    message: string;
};

type UpdateConfirm = {
    tokenRegister: string;
    status: number;
};

type ForgotPasswordReqBody = {
    email: string;
};

type UpdateForgetPassword = {
    forgetPasswordToken: string;
    status: number;
};

type ResetPasswordReqBody = {
    forgotPasswordToken: string;
    password: string;
    confirmPassword: string;
};

type ResetNewPassword = {
    hashedPassword: string;
    status: number;
    forgetPasswordToken: string;
};

export const isAlphabetAndNumber = (str: string): boolean => /[a-zA-Z0-9]+/.test(str);

export const registerJoiSchema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string(),
    password: Joi.string().required().min(PASSWORD_LENGTH),
    confirmPassword: Joi.any().valid(Joi.ref('password')).required().options({
        messages: {
            any: 'Two passwords is not match',
        },
    }),
});

export const loginJoiSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required().min(PASSWORD_LENGTH),
});

export const forgotPassJoiSchema = Joi.object({
    email: Joi.string().email().required(),
});

export const resetPassJoiSchema = Joi.object({
    forgotPasswordToken: Joi.string().required(),
    password: Joi.string().required().min(PASSWORD_LENGTH),
    confirmPassword: Joi.any().valid(Joi.ref('password')).required().messages(
        {
            'any.required': 'Two passwords is not match',
        },
    ),
});

class UserController {
    async registerNewUser(req: Request<any, any, RegisterReqBody>, res: Response<UserResSuccess | UserResError>): Promise<any> {
        const {
            email,
            name,
            password,
        } = req.body;

        const user: User | null = await UserModel.findOne({ email })
            .lean();

        if (user !== null) {
            res.status(HttpStatus.BAD_REQUEST).json({
                message: 'That Email is taken. Try another.',
            });

            return;
        }

        const tokenRegister = uniqueString();
        const saltRounds: string = bcrypt.genSaltSync(10);
        const hashedPassword: string = bcrypt.hashSync(password, saltRounds);

        const userDoc: UserDoc = new UserModel({
            email,
            name: name || '',
            passwordSalt: saltRounds,
            hashedPassword,
            tokenRegister,
            status: 2,
        });

        await userDoc.save();

        const mailOptions = {
            from: process.env.config_user,
            subject: 'Verification Email',
            to: email,
            html: `<a href="${process.env.client_url}/confirm?tokenRegister=${tokenRegister}">Click here to verify email</a>`,
        };

        await sendMailVerify(mailOptions);
        res.status(HttpStatus.OK).json({
            message: 'Successful. Please check email to verify.',
        });
    }

    async userLogin(req: Request<any, any, LoginReqBody>, res: Response<LoginResSuccess | UserResError>): Promise<any> {
        const { email, password } = req.body;

        const user: User | null = await UserModel.findOne({ email })
            .lean();

        if (user === null) {
            res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Email does not exist.',
            });

            return;
        }

        if (bcrypt.compareSync(password, user.hashedPassword) === false) {
            res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Incorrect Email or Password. Please try again.',
            });

            return;
        }

        if (user.status === 2) {
            res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Email does not exist.',
            });

            return;
        }

        const token: string = jwt.sign({ email: user.email }, process.env.private_key);
        res.status(HttpStatus.OK).json({
            message: 'Successful.',
            token,
        });
    }

    async confirmUser(req: Request<any, any, { tokenRegister: string }>, res: Response<UserResSuccess | UserResError>): Promise<any> {
        const { tokenRegister } = req.body;
        if (!tokenRegister) {
            res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Token is invalid.',
            });

            return;
        }

        const fieldUpdate: UpdateConfirm = {
            tokenRegister: '',
            status: 1,
        };
        const user: User | null = await UserModel.findOneAndUpdate({ tokenRegister }, fieldUpdate)
            .lean();
        if (!user) {
            res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Token is invalid.',
            });

            return;
        }

        res.status(HttpStatus.OK).json({
            message: 'Verify Successful.',
        });
    }

    async forgotPassword(req: Request<any, any, ForgotPasswordReqBody>, res: Response<UserResSuccess | UserResError>): Promise<any> {
        const { email } = req.body;

        const updateForgetPassword: UpdateForgetPassword = {
            forgetPasswordToken: uniqueString(),
            status: 2,
        };

        const user: User | null = await UserModel.findOneAndUpdate({ email }, updateForgetPassword)
            .lean();

        if (!user) {
            res.status(HttpStatus.BAD_REQUEST).json({
                message: 'No users found.',
            });

            return;
        }

        const mailOptions = {
            from: process.env.config_user,
            subject: 'no-reply email',
            to: email,
            html: `<a href="${process.env.client_url}/reset-password?forgotPasswordToken=${updateForgetPassword.forgetPasswordToken}">
                    Hi ${user.name},We got a request to reset your Instagram password.</a>`,
        };

        await sendMailVerify(mailOptions);
        res.status(HttpStatus.OK).json({
            message: `Thanks! Please check ${user.email} for a link to reset your password.`,
        });
    }

    async resetPassword(req: Request<any, any, ResetPasswordReqBody>, res: Response<UserResSuccess | UserResError>): Promise<any> {
        const { forgotPasswordToken, password } = req.body;

        const user: User | null = await UserModel.findOne({ forgetPasswordToken: forgotPasswordToken })
            .lean();

        if (!user) {
            res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Token is invalid.',
            });
            return;
        }

        if (user.status === 1) {
            res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Token is invalid.',
            });
            return;
        }

        if (bcrypt.compareSync(password, user.hashedPassword) === true) {
            res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Create a new password that isn\'t your current password.',
            });
            return;
        }
        const newHashedPassword: string = bcrypt.hashSync(password, user.passwordSalt);
        const resetNewPassword: ResetNewPassword = {
            hashedPassword: newHashedPassword,
            status: 1,
            forgetPasswordToken: '',
        };

        await UserModel.update({ _id: user._id }, resetNewPassword);

        res.status(HttpStatus.OK).json({
            message: 'Successfully',
        });
    }
}

export const userCtrl = new UserController();

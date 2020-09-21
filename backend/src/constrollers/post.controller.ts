import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import * as HttpStatus from 'http-status-codes';
import { IMAGE_JPG_TYPES, IMAGE_PNG_TYPES } from '../constant';
import { RequestCustom } from '../middleware/checkToken';
import { PostDoc, PostModel } from '../models/post.model';

type PostReqQuery = {
    title?: string;
};

type PostResSuccess = {
    message: string;
};

type PostResError = {
    message: string;
};

const removeImg = (req: Request<any, any, any, PostReqQuery>): void => {
    const imagePath = `/../public/tmp/${req.file.filename}`;
    fs.unlinkSync(path.join(__dirname, imagePath));
};

class PostController {
    async Post(req: RequestCustom<any, any, any, PostReqQuery>, res: Response<PostResSuccess | PostResError>): Promise<any> {
        const { title } = req.query;
        const image = req.file;
        if (!image) {
            res.status(HttpStatus.BAD_REQUEST).json({
                message: 'This field cannot empty.',
            });
        }

        if (image.mimetype !== IMAGE_JPG_TYPES && image.mimetype !== IMAGE_PNG_TYPES) {
            removeImg(req);
            return res.status(400).json({
                message: 'Type of image is invalid.',
            });
        }

        const oldPath = `/../public/tmp/${req.file.filename}`;
        const newPath = `/../public/uploads/${req.file.filename}`;
        const tmp = path.join(__dirname, oldPath);
        const uploads = path.join(__dirname, newPath);
        fs.renameSync(tmp, uploads);

        const postDoc: PostDoc = new PostModel({
            userId: req.user._id,
            title,
            image: `uploads/${req.file.filename}`,
        });

        await postDoc.save();
        return res.status(200).json({
            message: 'Success.',
        });
    }
}

export const postCtrl = new PostController();

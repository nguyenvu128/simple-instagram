import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import * as HttpStatus from 'http-status-codes';
import joi from 'joi';
import { IMAGE_JPG_TYPES, IMAGE_PNG_TYPES, SystemConfig } from '../constant';
import { Post, PostDoc, PostModel } from '../models/post.model';
import 'ts-mongoose/plugin';
import { UserDoc } from '../models/user.model';
// import { Types } from 'mongoose';

const POST_COLUMNS: string[] = Object.keys(PostModel.schema.paths);
const indexOfV: number = POST_COLUMNS.indexOf('__v');
POST_COLUMNS.splice(indexOfV, 1);

type PostReqQuery = {
    title?: string;
};

type PostResSuccess = {
    message: string;
};

type PostResError = {
    message: string | number;
};

type GetListPostReqQuery = {
    title?: string;
    userId?: string;
    limit?: string;
    page?: string;
    createdAt?: Date;
    sortBy?: string;
    sortDirection?: string;
};

type PostWithUser = Post & {
    userId: UserDoc;
};

type PostWithUserResponseDTO = Post & {
    user: Pick<UserDoc, '_id' | 'name' | 'avatar'>;
}

type GetListPostResSuccess = {
    total: number;
    listPost: PostWithUserResponseDTO[];
};

type SortObject = {
    [key: string]: string | number | SortObject;
};

type PaginationObj = {
    [key: string]: number;
};

type DeletePostParams = {
    postId: string;
}

const removeImg = (req: Request<any, any, any, PostReqQuery>): void => {
    fs.unlinkSync(path.join(SystemConfig.rootPath, 'public', 'tmp', req.file.filename));
};

export const extractPagination = (queryPagination: GetListPostReqQuery): PaginationObj => {
    const { limit, page } = queryPagination;
    const pagination: PaginationObj = {};
    if (limit) {
        pagination.limit = parseInt(limit, 10);
    } else {
        pagination.limit = 10;
    }

    if (page) {
        pagination.page = parseInt(page, 10);
    } else {
        pagination.page = 0;
    }

    return pagination;
};

export const extractSortObj = (querySortObj: GetListPostReqQuery): SortObject => {
    let { sortBy, sortDirection } = querySortObj;

    if (POST_COLUMNS.indexOf(sortBy) === -1) {
        sortBy = 'createdAt';
    }

    if (['asc', 'desc'].indexOf(sortDirection) === -1) {
        sortDirection = 'desc';
    }

    const sortObj: SortObject = {};
    sortObj[sortBy] = sortDirection === 'desc' ? -1 : 1;
    return sortObj;
};

export const getListJoiSchema = joi.object({
    sortBy: joi.string().valid(...POST_COLUMNS).default('createdAt'),
    sortDirection: joi.string().valid('desc', 'asc').default('desc'),
    limit: joi.number().default(10),
    page: joi.number().default(0),
});

export const deletePostJoiSchema = joi.object({
    postId: joi.string().required(),
});

class PostController {
    async Post(req: Request<any, any, PostReqQuery, never>, res: Response<PostResSuccess | PostResError>): Promise<any> {
        const { title } = req.body;
        let images: Express.Multer.File[] = [];
        if (Array.isArray(req.files)) {
            images = req.files;
        } else {
            images = req.files.images;
        }

        if (!images) {
            res.status(HttpStatus.BAD_REQUEST).json({
                message: 'This field cannot empty.',
            });
        }
        const invalidImages = images.filter((img) => img.mimetype !== IMAGE_JPG_TYPES && img.mimetype !== IMAGE_PNG_TYPES);
        if (invalidImages.length !== 0) {
            removeImg(req);
            return res.status(400).json({
                message: 'Type of image is invalid.',
            });
        }

        const imagesData: string[] = [];
        await Promise.all(images.map(async (img) => {
            const tmp = path.join(SystemConfig.rootPath, 'public', 'tmp', img.filename);
            const uploads = path.join(SystemConfig.rootPath, 'public', 'uploads', img.filename);
            fs.renameSync(tmp, uploads);
            imagesData.push(`uploads/${img.filename}`);
        }));

        const postDoc: PostDoc = new PostModel({
            userId: req.user._id,
            title,
            images: imagesData,
        });
        await postDoc.save();
        return res.status(200).json({
            message: 'Success.',
        });
    }

    async getListPost(
        req: Request<any, any, any, GetListPostReqQuery>,
        res: Response<GetListPostResSuccess | PostResError>,
    ): Promise<any> {
        const validateSortResult = getListJoiSchema.validate(req.query);
        if (validateSortResult.error) {
            return res.status(HttpStatus.BAD_REQUEST).json(validateSortResult.error);
        }

        const pagination: PaginationObj = extractPagination(req.query);
        const sortObj = extractSortObj(req.query);

        const posts: PostWithUser[] = await PostModel.find()
            .sort(sortObj)
            .skip(pagination.page * pagination.limit)
            .limit(pagination.limit)
            .populateTs('userId')
            .lean();

        const total = await PostModel.countDocuments();

        return res.status(HttpStatus.OK).json({
            total,
            listPost: posts.map((p) => {
                const { _id, name, avatar } = p.userId;
                return {
                    ...p,
                    user: { _id, name, avatar },
                    userId: undefined,
                };
            }),
        });
    }

    async deletePost(req: Request<DeletePostParams, any, any, any>, res: Response<PostResSuccess | PostResError>): Promise<any> {
        const { postId } = req.params;
        const userId = req.user._id;

        const authority: Post | null = await PostModel.findOne({ userId });
        if (authority === null) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'You have not permission to delete this post !!!',
            });
        }
        const updatePost: Post | null = await PostModel.findOneAndDelete({ _id: postId }).lean();
        if (updatePost === null) {
            return res.status(HttpStatus.BAD_REQUEST).json({
                message: 'Post does not exist',
            });
        }

        return res.status(HttpStatus.OK).json({
            message: 'Deleted !!!',
        });
    }
}

export const postCtrl = new PostController();

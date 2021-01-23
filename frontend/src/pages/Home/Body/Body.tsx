import axios, { AxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import React from 'react';
import * as API from '../../../constants/api';
import { Article } from './Article';
import styles from './Body.module.scss';
import { InputPost } from './InputPost';
import { Story } from './Story';

type GetListPostResSuccess = {
    listPost: PostData[];
    message: string;
}

type GetListPostResErr = {
    message: string;
}

type ListDataState = {
    listData: PostData[];
}

export type PostData = {
    _id: string;
    user: {
        name: string;
    };
    title: string;
    images: string[];
    createdAt: string;
};

export class Body extends React.Component<{ }, ListDataState> {
    state: ListDataState = {
        listData: [],
    }

    componentDidMount(): void {
        this.handleGetListPost();
    }

    handleGetListPost = (): void => {
        const token: string | undefined = Cookies.get('token');
        const config: AxiosRequestConfig = {
            headers: {
                token,
            },
        };

        axios.get<GetListPostResSuccess | GetListPostResErr>(API.PostImg, config)
            .then((res) => {
                if (res.status === 200) {
                    const db = res.data as GetListPostResSuccess;
                    this.setState((state) => {
                        const listData = state.listData.concat(db.listPost);

                        return {
                            ...state,
                            listData,
                        };
                    });
                } else {
                    const err = res.data as GetListPostResErr;
                    console.log(err.message);
                }
            });
    };

    render(): JSX.Element {
        const { listData } = this.state;
        return (
            <div className={styles.wrap}>
                <Story />
                <InputPost />
                {
                    listData.map((l: PostData) => (
                        <Article
                            onFinishDeleting={(): void => {
                                const listAfterDeleted = listData.filter((value) => value._id !== l._id);
                                this.setState({ listData: listAfterDeleted });
                            }}
                            key={l._id}
                            {...l}
                        />
                    ))
                }
            </div>
        );
    }
}

import React, {ChangeEvent} from 'react';
import axios from 'axios';
import './forgotPassword.css';
import * as API from '../../constants/api';
import {RouteComponentProps} from 'react-router-dom';
import {Footer} from "../../components";
import {AxiosResponse} from "axios";

interface ForgotPasswordProps extends RouteComponentProps {

}

type ForgotPasswordState = {
    email: string;
    successMessage: string;
    errorMessage: string;
};

type ForgotPasswordFormData = {
    email: string;
};

type ForgotPasswordResSuccess = {
    message: string;
};

type ForgotPasswordError = {
    message: string;
};


export class ForgotPassword extends React.Component<ForgotPasswordProps, ForgotPasswordState> {
    constructor(props: ForgotPasswordProps) {
        super(props);
        this.state = {
            email: '',
            successMessage: '',
            errorMessage: ''
        }
    }

    onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData: ForgotPasswordFormData = {
            email: this.state.email
        };

        axios.post<ForgotPasswordResSuccess, AxiosResponse<ForgotPasswordResSuccess | ForgotPasswordError>>(API.ForgotPass, formData)
            .then((res) => {
                this.setState({
                    successMessage: res.data.message
                });

                setTimeout(() => this.props.history.push('/'), 3000)
            })
            .catch((err) => {
                if (err) {
                    this.setState({
                       errorMessage: err.response.data.message
                    });
                } else {
                    alert(err);
                }
            })
    };


    handleChangeEmailInput = (event: ChangeEvent<HTMLInputElement>) => {
        this.setState({
            email: event.target.value
        })
    };

    render(): React.ReactElement {
        const {onSubmit, handleChangeEmailInput, state} = this;
        return (
            <div>
                <div className="main">
                    <div className="wrapper-sign-up">
                        <div className="right-content">
                            <div className="form-forgot-pass">
                                <div className="logo">
                                    <span className="block-logo"></span>
                                </div>
                                <div className="form-forgot-pass-child">
                                    <form className="form-forgot-input" onSubmit={onSubmit}>
                                        <h4 className="trouble-log-in">Trouble Logging In?</h4>
                                        <div className="description-forgot">
                                            Enter your username or email and we'll send you a link to get back into your
                                            account.
                                        </div>
                                        <div className="mg-input">
                                            <div className="input-forgot-pass">
                                                <input aria-label="Mobile number or email"
                                                       placeholder="Email, Phone, or Username"
                                                       name="email"
                                                       type="text"
                                                       className="input-text"
                                                       value={state.email}
                                                       onChange={handleChangeEmailInput}
                                                />
                                            </div>
                                        </div>
                                        <div className="btn-forgot-pass">
                                            <button type="submit" className="btn-forgot-pass-submit">Send Login Link
                                            </button>
                                        </div>
                                        <div className="submit-bottom">
                                            <div className="break-line"></div>
                                            <div className="or-text">or</div>
                                            <div className="break-line"></div>
                                        </div>
                                        <div className="sign-up-link">
                                            <a href="/register">Create New Account</a>
                                        </div>
                                    </form>
                                    <div className="back-log-in">
                                        <div className="back-log-in-child">
                                            <a href="/login">Back To Login</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer/>
            </div>
        );
    }
}
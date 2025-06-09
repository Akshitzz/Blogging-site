import { useContext, useRef } from "react";
import AnimationWrapper from "../common/page-animation";
import InputBox from "../components/input.component";
import { Toaster, toast } from "react-hot-toast";
import { UserContext } from "../App";
import axios from "axios";

const ChangePassword = () => {
    let { userAuth: { access_token } } = useContext(UserContext);
    let changePasswordForm = useRef();

    const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

    const handleSubmit = (e) => {
        e.preventDefault();

        let form = new FormData(changePasswordForm.current);
        let formData = {};

        for (let [key, value] of form.entries()) {
            formData[key] = value;
        }

        const { currentPassword, newPassword } = formData;

        if (!currentPassword || !newPassword) {
            return toast.error("Fill all the inputs");
        }

        if (!passwordRegex.test(currentPassword) || !passwordRegex.test(newPassword)) {
            return toast.error("Password should be 6 to 20 characters long with a numeric, 1 lowercase and 1 uppercase letters");
        }

        if (!access_token) {
            return toast.error("Please login to change password");
        }

        e.target.setAttribute("disabled", true);
        let loadingToast = toast.loading("Updating password...");

        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/change-password",
            { currentPassword, newPassword },
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                }
            }
        )
        .then(({ data }) => {
            console.log("Password change response:", data);
            toast.dismiss(loadingToast);
            e.target.removeAttribute("disabled");
            if (data.status === 'password changed') {
                toast.success("Password updated successfully!");
                changePasswordForm.current.reset();
            } else {
                toast.error("Failed to update password");
            }
        })
        .catch((error) => {
            console.error("Password change error:", error);
            toast.dismiss(loadingToast);
            e.target.removeAttribute("disabled");
            toast.error(error.response?.data?.error || "Failed to update password");
        });
    };

    return (
        <AnimationWrapper>
            <Toaster 
                position="top-center"
                reverseOrder={false}
                gutter={8}
                toastOptions={{
                    duration: 5000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },
                    success: {
                        duration: 3000,
                        style: {
                            background: '#22c55e',
                        },
                    },
                    error: {
                        duration: 3000,
                        style: {
                            background: '#ef4444',
                        },
                    },
                }}
            />
            <form ref={changePasswordForm}>
                <h1 className="max-md:hidden">Change Password</h1>
                <div className="py-10 w-full md:max-w-[400px]">
                    <InputBox 
                        name="currentPassword" 
                        type="password" 
                        className="profile-edit-input" 
                        placeholder="Current Password" 
                        icon="fi-rr-unlock"
                    />
                    <InputBox 
                        name="newPassword" 
                        type="password" 
                        className="profile-edit-input" 
                        placeholder="New Password" 
                        icon="fi-rr-unlock"
                    />

                    <button 
                        onClick={handleSubmit} 
                        className="btn-dark px-10" 
                        type="submit"
                    >
                        Change Password
                    </button>
                </div>
            </form>
        </AnimationWrapper>
    );
};

export default ChangePassword;
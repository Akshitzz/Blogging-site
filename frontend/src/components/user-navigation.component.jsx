import { useContext } from "react";
import AnimationWrapper from "../common/page-animation";
import { Link, useNavigate } from "react-router-dom";
import { UserContext } from "../App";
import { removeFromSession } from "../common/session";

const UserNavigationPanel = () => {
    const { userAuth: { username }, setUserAuth } = useContext(UserContext);
    const navigate = useNavigate();

    const SignOutUser = () => {
        removeFromSession("user");
        setUserAuth({ access_token: null });
        navigate("/signin");
    }

    return (
        <AnimationWrapper 
            className="absolute right-0 z-50"
            transition={{ duration: 0.2, y: 0.1 }}
        >
            <div className="bg-white absolute right-0 border border-grey w-60 rounded-lg shadow-lg">
                <Link to="/editor" className="flex gap-2 link md:hidden pl-8 py-4 hover:bg-grey w-full">
                    <i className="fi fi-rr-file-edit"></i>
                    <p>Write</p>
                </Link>

                <Link to={`/user/${username}`} className="flex gap-2 link pl-8 py-4 hover:bg-grey w-full">
                    <i className="fi fi-rr-user"></i>
                    <p>Profile</p>
                </Link>

                <Link to="/dashboard/blogs" className="flex gap-2 link pl-8 py-4 hover:bg-grey w-full">
                    <i className="fi fi-rr-dashboard"></i>
                    <p>Dashboard</p>
                </Link>

                <Link to="/dashboard/notification" className="flex gap-2 link pl-8 py-4 hover:bg-grey w-full">
                    <i className="fi fi-rr-bell"></i>
                    <p>Notifications</p>
                </Link>

                <Link to="/settings/edit-profile" className="flex gap-2 link pl-8 py-4 hover:bg-grey w-full">
                    <i className="fi fi-rr-settings"></i>
                    <p>Settings</p>
                </Link>

                <hr className="border-grey my-2" />

                <button 
                    onClick={SignOutUser}
                    className="flex gap-2 link pl-8 py-4 hover:bg-grey w-full text-left"
                >
                    <i className="fi fi-rr-sign-out"></i>
                    <div>
                        <p className="font-bold">Sign Out</p>
                        <p className="text-dark-grey text-sm">@{username}</p>
                    </div>
                </button>
            </div>
        </AnimationWrapper>
    )
}

export default UserNavigationPanel;
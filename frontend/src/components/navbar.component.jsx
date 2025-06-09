import {Link, Outlet, useNavigate, useLocation} from "react-router-dom"
import logo from "../imgs/logo.png"
import { useContext, useState, useRef, useEffect } from "react"
import { UserContext } from "../App"
import UserNavigationPanel from "./user-navigation.component"
import axios from "axios"

const Navbar = () => {
    const [searchBoxVisibility, setSearchBoxVisibility] = useState(false);
    const [userNavPanel, setUserNavPanel] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const { userAuth = {}, setUserAuth } = useContext(UserContext);
    const { access_token, profile_img } = userAuth;
    const navigate = useNavigate();
    const location = useLocation();
    const userNavRef = useRef(null);

    // Hide search on auth pages
    const isAuthPage = location.pathname.includes('/signin') || location.pathname.includes('/signup');

    useEffect(() => {
        if(access_token) {
            axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/get-notification", {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            })
            .then(({data}) => {
                setUserAuth({...userAuth, ...data});
            })
            .catch(err => {
                console.log(err);
            });
        }
    }, [access_token]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (userNavRef.current && !userNavRef.current.contains(event.target)) {
                setUserNavPanel(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSearch = (e) => {
        const query = e.target.value;
        setSearchQuery(query);
    }

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const trimmedQuery = searchQuery.trim();
        if(trimmedQuery.length > 0) {
            navigate(`/search/${trimmedQuery}`);
            setSearchBoxVisibility(false);
            setSearchQuery("");
        }
    }

    const handleUserNavPanel = () => {
        setUserNavPanel(currentVal => !currentVal);
    }

    return (
        <>
            <nav className="navbar z-50">
                <Link to="/">
                    <img src={logo} alt="leaf logo" className="flex-none w-10" />
                </Link>

                {!isAuthPage && (
                    <div className={"absolute bg-white w-full left-0 top-full mt-0.5 border-b border-grey py-4 px-[5vw] md:border-0 md:block md:relative md:inset-0 md:p-0 md:w-auto md:show " + (searchBoxVisibility ? "show" : "hide")}>
                        <form className="relative w-full" onSubmit={handleSearchSubmit}>
                            <input
                                type="text"
                                placeholder="Search"
                                value={searchQuery}
                                onChange={handleSearch}
                                className="w-full md:w-auto bg-grey p-4 pl-6 pr-[12%] md:pr-6 rounded-full md:pl-12 placeholder:text-dark-grey"
                            />
                            <button type="submit" className="absolute right-[10%] md:right-5 top-1/2 -translate-y-1/2 text-2xl text-dark-grey">
                                <i className="fi fi-rr-search"></i>
                            </button>
                        </form>
                    </div>
                )}

                <div className="flex items-center gap-3 md:gap-6 ml-auto">
                    {!isAuthPage && (
                        <button
                            className="md:hidden bg-grey w-12 h-12 rounded-full flex items-center justify-center"
                            onClick={() => setSearchBoxVisibility(currentVal => !currentVal)}
                        >
                            <i className="fi fi-rr-search text-xl"></i>
                        </button>
                    )}

                    <Link to="/editor" className="hidden md:flex gap-2 link">
                        <i className="fi fi-rr-file-edit"></i>
                        <p>Write</p>
                    </Link>

                    {access_token ? (
                        <>
                            <Link to="/dashboard/notification">
                                <button className="w-12 h-12 rounded-full bg-grey relative hover:bg-black/10">
                                    <i className="fi fi-rr-bell text-2xl block mt-1"></i>
                                </button>
                            </Link>

                            <div className="relative" ref={userNavRef}>
                                <button
                                    className="w-12 h-12 mt-1"
                                    onClick={handleUserNavPanel}
                                >
                                    <img
                                        src={profile_img}
                                        alt="user profile"
                                        className="w-full h-full object-cover rounded-full cursor-pointer"
                                    />
                                </button>
                                {userNavPanel && <UserNavigationPanel />}
                            </div>
                        </>
                    ) : (
                        <>
                            <Link className="btn-dark py-2" to="/signin">
                                Sign In
                            </Link>
                            <Link className="btn-light py-2 hidden md:block" to="/signup">
                                Sign Up
                            </Link>
                        </>
                    )}
                </div>
            </nav>
            <Outlet />
        </>
    );
}

export default Navbar;
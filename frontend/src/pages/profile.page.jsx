import { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AnimationWrapper from "../common/page-animation";
import Loader from "../components/loader.component";
import { UserContext } from "../App";
import AboutUser from "../components/about.component";
import { filterPaginationData } from "../common/filter-pagination-data";
import InpageNavigation from "../components/inpage-navigation.component";
import BLogPostCard from "../components/blog-post.component";
import NoDataMessage from "../components/nodata.component";
import LoadMoreButton from "../components/load-more.component";
import PageNotFound from "./404.page";
 export const profileDataStructure = {
    personal_info :{
        fullname: "",
        username : "",
        profile_img : "",
        bio : "",
    },
    account_info :{
        total_posts : 0,
        total_blogs :0 ,
    },
    social_links : { },
    joinedAt: " "
 }

 
 
 
 let { personal_info:{ fullname,username:profile_username,profile_img,bio},account_info:{total_posts,total_reads}, social_links,joinedat} =profile;
 
 let { userAuth :{username} } = useContext(UserContext) 
 
 const ProfilePage = () => {
     let {id:profileId} = useParams();
     let [profile,setProfile] = useState(profileDataStructure);
     let [loading,setloading] =useState(true);
     let [blogs,setBlogs] = useState(null);
     let [profileLoaded,setProfileLoaded] = useState();
     
     const getBlogs = ({page=1,user_id}) =>{
    
            user_id = user_id == undefined ? blogs.users._id : user_id;
    
    
            axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs",{
                author:user_id,
                page
            })
            .then(async({data})=>{
                    let formatedData = await filterPaginationData({
                        state :blogs,
                        data :data.blogs,
                        page,
                        countRoute : "/search-blogs-count",
                        data_to_send:{author :user_id}
                    })
    
                    formatedData.user_id = user_id;
    
                    setBlogs(formatedData);
            })
     }
 const fetchUserProfile = ()=>{
     axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/get-profile",{
            username:profileId
        })
        .then(({data:user})=>{
            if(user !==null){
                setProfile(user);
            }

            getBlogs({user_id:user._id})
            setProfile(user);
            setProfileLoaded(profileId)
            setloading(false);
        })
        .catch(err =>{
            console.log(err``)
        })
    }

    useEffect(()=>{

        if(profileId !== profileLoaded){
            setBlogs(null);
        }
        if(blogs == null){
            resetStates();
            fetchUserProfile();
        }

        resetStates();
        setBlogs(null);
        fetchUserProfile();
        setProfileLoaded("");

    },[profileId,blogs])


    return (

        <AnimationWrapper>
        {

            loading ? <Loader/>:
            profile_username.length ?
            <section className="h-cover md:flex flex-row-reverse items-start gap-5 min-[1100px]:gap-12">
                    <div className="flex flex-col max-md:items-center gap-5 min-w-[250px] md:w-[50%] md:pm-8 md:border-1 border-grey md:sticky md:top-[100px] md:py-10">
                        <img src={profile_img} alt="profile image" className="w-48 h-48 bg-grey rounded-full md:w-32 md:h-32" />
                        <h1 className="text-2xl font-medium">@{profile_username}</h1>
                        <p className="text-xl capitalize h-6">{fullname}</p>
                        <p>{total_posts.toLocaleString()} Blogs  - {total_reads.toLocaleString()}Reads</p>


                        <div className="flex gap-4 mt-2">
                            {
                                profileId ==username ?
                                <Link to="/settings/edit-profile"
                            className="btn-light rounded-md"
                            > Edit Profile
                            </Link> : ""
                             }
                            

                        </div>
                             <AboutUser  className="max-md:hidden" bio={bio} social_links={social_links} joinedAt= {joinedat}/>

                    </div>
                             <div className="max-md:mt-12 w-full ">
                               <InpageNavigation routes={["Blogs Published","About"]} defaultHidden={["About"]} >
        <>
        {
            blogs ===null ? <Loader/> :
            blogs.results.length ?
                blogs.results.map((blog,i)=>{
                    return <AnimationWrapper transition={{duration:1,delay: i*.1}} key={i}>
                        <BLogPostCard content={blog} author={blog.author.personal_info}/>
                    </AnimationWrapper>
                })
            : <NoDataMessage message="No blogs found"/>
        }
        <LoadMoreButton state={blogs} fetchData={getBlogs}/>
        </>
     <AboutUser bio={bio} social_links={social_links} joinedAt={joinedat}/>
                             </InpageNavigation>
                             </div>

            </section> : <PageNotFound/>

        }
        </AnimationWrapper>
    )

}

export default ProfilePage;
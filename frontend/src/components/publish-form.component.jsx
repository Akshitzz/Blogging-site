import { Toaster,toast } from "react-hot-toast";
import AnimationWrapper from "../common/page-animation";
import { useContext } from "react";
import { EditorContext } from "../pages/editor.pages";
import Tag from "./tags.component";
import axios from "axios";
import { UserContext } from "../App";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
const PublishForm = ()=>{
    let taglimit= 10
    let characterLimit = 200;

    let {blog_id} = useParams();


    let {blog, blog:{banner,content,title,tags,des},setEditorState ,setBlog} = useContext(EditorContext)

let { userAuth : {access_token} } = useContext(UserContext);
let navigate = useNavigate();

    const handleCloseEvent=()=>{
    setEditorState("editor")
    }
    const handleBlogTitleChange=(e)=>{
            let input = e.target;
            setBlog({...blog,title:input.value})
    }
    const handleBlogDesChange=(e)=>{
        let input = e.target
        setBlog({...blog,des:input.value})
    }
    const handleTitleKeyDown=(e)=>{
        if(e.keyCode == 13){
            e.preventDefault();
        }
    }
    const handleKeyDown=(e)=>{
        if(e.keyCode == 13 || e.keyCode == 188){
            e.preventDefault();

            let tag = e.target.value.trim();
            if(tag.length){
                if(tags.length < taglimit){
                    if(!tags.includes(tag)){
                        setBlog({ ...blog, tags: [...tags, tag] });
                        console.log("Tag added:", tag);
                    } else {
                        toast.error("Tag already exists");
                    }
                } else {
                    toast.error(`You can add max ${taglimit} Tags`);
                }
            }
            e.target.value = "";
        }
    }
    const publishBlog = (e)=>{
 if(e.target.className.includes("disable")){
    return ;
 }
            if(!title.length){
                return toast.error("Write your own title before publishing it")
            }
            if(!des.length || des.length>characterLimit){
                return toast.error(`Write a description about your blog within ${characterLimit} characters to publish`)
            }
            if(!tags.length){
                return toast.error("Enter at least 1 tag to help us rank your blog")
            }
    let loadingToast = toast.loading("Publishing... ");
    e.target.classList.add('disable');
            let blogObj = {
                title,banner,des,content,tags , draft : false
            }
            axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/create-blog",{...blogObj,id:blog_id},{
                headers :{
                    'Authorization' : `Bearer ${access_token}`

                }
            })
            .then(
                ()=>{
                    e.target.classList.remove('disable');
                    toast.dismiss(loadingToast);
                    toast.success("Published");
                    setTimeout(()=>{
                        navigate("/dashboard/blogs")
                    },500);
                }
            )
            .catch(({ response })=>{
                e.target.classList.remove('disable');
                toast.dismiss(loadingToast);
                return toast.error(response.data.error)
            })
    }

    const saveDraft = (e) => {
        if(e.target.className.includes("disable")){
            return;
        }

        let loadingToast = toast.loading("Saving draft...");
        e.target.classList.add('disable');

        let blogObj = {
            title: title || "Untitled",
            banner,
            des: des || "",
            content,
            tags,
            draft: true
        }

        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/create-blog", blogObj, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
        .then(() => {
            e.target.classList.remove('disable');
            toast.dismiss(loadingToast);
            toast.success("Draft saved");
            setTimeout(() => {
                navigate("/");
            }, 500);
        })
        .catch(({ response }) => {
            e.target.classList.remove('disable');
            toast.dismiss(loadingToast);
            return toast.error(response.data.error);
        });
    }

    return (
       <AnimationWrapper>
        <section className="w-screen min-h-screen grid items-center lg:grid-cols-2 py-16  lg:gap-4">
            <Toaster/>
                <button className="w-12 h-12 absolute right-[5vw] z-10 top-[5%] lg:top-[10%]"
                onClick={handleCloseEvent}
                >
                     <i className="fi fi-br-cross"></i>
                </button>
        <div className="max-w-[550px] center ">
            <p className="text-dark-grey mb-1 ">Preview</p>
            <div className="w-full aspect-video rounded-lg overflow-hidden bg-grey mt-4 ">
                <img src={banner} />
            </div>
            <h1 className="text-4xl font-medium leading-tight line-clamp-2">{title}</h1>
            <p className="font-gelasio line-clamp-2 text-xl mt-4">{des}</p>
        </div>
            <div className="border-grey lg:border-1 lg:pl-8">
                <p className="text-dark-grey mb-2 mt-9">Blog Title</p>
                <input type="text" placeholder="Blog Title" defaultValue={title} className="input-box pl-4 " onChange={handleBlogTitleChange} />

                <p className="text-dark-grey mb-2 mt-9">Short description about your blog</p>
               <textarea 
               maxLength={characterLimit}
               defaultValue={des}
                className="h-40 resize-none leading-7 input-box pl-4 "
               onChange={handleBlogDesChange}
               onKeyDown={handleTitleKeyDown}
               >


               </textarea>
               <p className="mt-1 text-dark-grey text-sm text-right">{characterLimit -  des.length } characters left</p>

            <p className="mt-1 text-dark-grey text-sm text-right">Topics - (Help is searching and ranking your blog post ) </p>
                <div className="relative input-box pl-2 py-2 pb-4">
                    <input type="text" placeholder="Topic" className="sticky input-box bg-white top-0 left-0 pl-4 mb-3 focus:bg-white"
                    onKeyDown={handleKeyDown}
                    />
                    <div className="flex flex-wrap gap-2">
                        {tags.map((tag, i) => (
                            <Tag tag={tag} tagIndex={i} key={i}/>
                        ))}
                    </div>
                    <p className="mt-1 mb-4 text-dark-grey text-right">{taglimit-tags.length} Tags left</p>
                    <div className="flex gap-4">
                        <button className="btn-dark px-8" onClick={publishBlog}>Publish</button>
                        <button className="btn-light px-8" onClick={saveDraft}>Save Draft</button>
                    </div>
                </div>
           
            </div>


        </section>
       </AnimationWrapper>
    )
    
}

export default PublishForm;
import defaultBanner from "../imgs/blog banner.png"
import { Link, useNavigate, useParams } from "react-router-dom";
import logo from "../imgs/logo.png"
import AnimationWrapper from "../common/page-animation";
import { uploadImage } from "../common/aws";
import { useContext, useEffect, useRef } from "react";
import {Toaster,toast} from "react-hot-toast"
import { EditorContext } from "../pages/editor.pages";
import  EditorJS from "@editorjs/editorjs"
import { tools } from "./tools.component";
import axios from "axios";
import { UserContext } from "../App";

const BlogEditor = ()=>{

let navigate = useNavigate()
let blogBannerRef= useRef()
let {blog,blog:{ title,banner,content,tags,des,author} ,setBlog,textEditor,setTextEditor,setEditorState}= useContext(EditorContext)
let {blog_id} = useParams();
let {userAuth :{access_token}} = useContext(UserContext)
// useeffect
useEffect(()=>{
    if(!textEditor.isReady){
        setTextEditor(new EditorJS({
            holder: "textEditor",
            data: Array.isArray(content) ? content[0] : content ,
            tools: tools,
            placeholder: "Let's write an awesome story"
        }))
    }
},[])
    const handleBannerUpload = async (e) => {
        let img = e.target.files[0];
        if(img){
            let loadingToast = toast.loading("Uploading..")

            try {
                const url = await uploadImage(img);
                toast.dismiss(loadingToast);
                toast.success("Uploaded 👍");
                
                if(blogBannerRef.current) {
                    blogBannerRef.current.src = url;
                }
                
                setBlog({...blog, banner: url});
            } catch (err) {
                toast.dismiss(loadingToast);
                toast.error(err.message);
            }
        }
    }
    
    const handleTitleKeyDown=(e)=>{
            if(e.keyCode == 13){
                // enter key
                e.preventDefault();
            }
    }
    const handleTitleChange=(e)=>{
        let input =e.target;

        input.style.height = 'auto';
        input.style.height = input.scrollHeight + "px";
        setBlog({ ...blog, title:input.value})
    }

    const handleDesChange=(e)=>{
        let input = e.target;
        setBlog({ ...blog, des:input.value})
    }

    const handleError = (e)=>{
        let img =e.target;
        img.src=defaultBanner;
    }

    const handlePublishEvent=()=>{
            if(!banner.length){
                return toast.error("Upload a Blog banner to publish it")
            } 

            if(!title.length){
                return toast.error("Write blog title to publish it") 
            }
            
            if(textEditor.isReady){
                textEditor.save().then(data=>{
                    if(data.blocks.length){
                    setBlog({ ...blog,content:data});
                    setEditorState("publish")
                    }else{
                        return toast.error("Write someThing in  your blog to publish it")
                    }
                }).catch((err)=>{
                    console.log(err);
                })
            }

    }

    const handlesaveDraft = (e)=>{
        if(e.target.className.includes("disable")){
            return ;
         }
                    if(!title.length){
                        return toast.error("Write your own title before saving it as a draft")
                    }
          
            let loadingToast = toast.loading("Saving draft... ");
            e.target.classList.add('disable');

            if(textEditor.isReady){
                textEditor.save().then(content=>{


                    let blogObj = {
                        title,banner,des,content,tags , draft :true
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
                            toast.success("Saved");
                            setTimeout(()=>{
                                navigate("/dashboard/blogs?tab=draft")
                            },500);
                        }
                    )
                    .catch(({ response })=>{
                        e.target.classList.remove('disable');
                        toast.dismiss(loadingToast);
                        return toast.error(response.data.error)
                    })
                })

            }
                    
    }
    return (
        <>
        <nav className="navbar">
                <Link to ="/" className="flex-none w-10 ">
                <img src={logo} alt="pte ki photo" />
                </Link>

            <p className="max-md:hidden text-black line-clamp-1 w-full">
            {title.length ? title :" New Blog" }
            </p>

            <div className="flex gap-4 ml-auto">
                <button className="btn-dark py-2 "
                onClick={handlePublishEvent}
                >
                    Publish 
                </button>
                <button className="btn-light py-2"
                onClick={handlesaveDraft}>
                  Save Draft
                </button>
            </div>
        </nav>
                <Toaster/>
            <AnimationWrapper>
                <section>
                    <div className="mx-auto max-w-[900px] w-full">

                        <div className="relative aspect-video bg-white border-grey hover:opacity-80">
                            <label htmlFor="uploadBanner">
                                <img
                                    ref={blogBannerRef}
                                    src={banner}
                                    className="z-20 w-full h-full object-cover"
                                    onError={handleError}
                                    alt="Blog banner"
                                />
                                <input 
                                    id="uploadBanner" 
                                    type="file" 
                                    accept=".png,.jpg,.jpeg" 
                                    hidden 
                                    onChange={handleBannerUpload}
                                />
                            </label>
                        </div>
                    <textarea 
                    value={title}
                    placeholder="Blog Title"
                    className="text-4xl font-medium w-full h-20 outline-none resize-none mt-10 leading-tight placeholder:opacity-40"
                    onKeyDown={handleTitleKeyDown}
                    onChange={handleTitleChange}
                    />
                    <textarea
                        value={des}
                        placeholder="Short description about your blog"
                        className="text-lg w-full h-20 outline-none resize-none mt-5 leading-tight placeholder:opacity-40"
                        onChange={handleDesChange}
                    />
                    <hr  className="w-full opacity-10 my-5"/>
                    <div  id="textEditor" className="font-gelasio">

                    </div>
                    </div>
                </section>
            </AnimationWrapper>


        </>
    )
}

export default BlogEditor;
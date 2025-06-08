import {Link,Outlet, useNavigate} from "react-router-dom"
import logo from "../imgs/logo.png"
import { useContext, useState } from "react"
import { UserContext } from "../App"
import UserNavigationPanel from "./user-navigation.component"
import { useEffect } from "react"
import axios from "axios"
const Navbar = () =>{

const[SearchBoxvisibility,setSearchBoxvisibility]=useState(false)
const [userNavPanel,setUserNavPanel]= useState(false);
 const { userAuth: { access_token, profile_img,new_notification_available } ,setUserAuth} = useContext(UserContext);

 let navigate= useNavigate()


  useEffect(()=>{
    if(access_token){
      axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/new-notfiation",{
        headers:{
          'Authorization' :`Bearer ${access_token}`
        }
      })
      .then(({data})=>{
        setUserAuth({...userAuth,...data})
      }).catch(err=>{
        console.log(err)
      })
    }
  })



  const handleSearch = (e) => {
      let query =e.target.value;
      if(e.keyCode == 13 && query.length){
          navigate(`/search/${query}`);
      }
  }



 const handleUserNavPanel =()=>{
  setUserNavPanel(currentVal=>!currentVal);
 }

 const handleBlurfunction =()=>{
  setTimeout(() => {
    setUserNavPanel(false);
  }, 200);
 }
 return (
  <>
    <nav className="navbar z-50">

<Link>
 <img src={logo} alt=" leaf logo" className="flex-none w-10" />
</Link>
<p>{new_notification_available}</p>

<div className={"absolute bg-white w-full left-0 top-full mt-0.5 border-b border-grey py-4 px-[5vw] md:border-0 md:block md:relative md:inset-0 md:p-0 md:w-auto md:show " + (  SearchBoxvisibility? " show " : " hide ")}>
<input type="text"
 placeholder="search"  
className="w-full md:w-auto bg-grey p-4 pl-6 pr-[12%] md:pr-6 rounded-full  md:pl-12 placeholder:text-dark-grey"
onKeyDown={handleSearch}
/>
<i className="fi fi-rr-search absolute right-[10%] md:pointers-events-none md:left-5 top-1/2 -translate-y-1/2 text-2xl"></i>
</div>
<div className="flex items-center gap-3 md:gap-6 ml-auto ">
    <button className="md:hidden bg-grey w-12 h-12 rounded-full flex items-center justify-center  " onClick={()=>setSearchBoxvisibility(currentVal => !currentVal)}>
        <i className="fi fi-rr-search text-xl"></i>
    </button>

    <Link to="/editor" className="hidden md:flex gap-2 link">
       <i className="fi fi-rr-file-edit"></i>
        <p>Write</p>
    </Link>
    {
        
      access_token ? 
      <>
      <Link to="/dashboard/notification">
      <button className="w-12 h-12 rounded-full bg-grey releative hover:bg-black/10 ">
      <i className="fi fi-rr-bell text-2xl display:block mt-1"></i>
      {

        new_notification_available ? <span className="bg-red w-4 h-3 rounded-full absolute z-10 top-2 right-2"></span> :""


      }
      </button>
      </Link>

        <div className="relative " onClick={handleUserNavPanel} onBlur={handleBlurfunction}>
            <button className="w-12 h-12 mt-1 ">
            <img src={profile_img} alt="user ki profile"  className="w-full h-full object-cover rounded-full"/>
            </button>
            {
              userNavPanel ?<UserNavigationPanel/> : ""
            }
        </div>

      </>
        :
        <>
        <Link className="btn-dark py-2 "
     to="/signin">
    Sign In
    </Link>
    <Link className="btn-light py-2 hidden md:block" 
     to="/signup">
    Sign Up
    </Link>
        </>


    }    
</div>
    </nav>
<Outlet/>
  </>

 )
}
 export default Navbar;